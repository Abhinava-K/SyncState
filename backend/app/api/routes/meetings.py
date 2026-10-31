import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Header
from typing import List, Dict, Any, Optional
from app.database import db
from app.schemas.payloads import (
    TranscriptIngestRequest,
    MeetingIngestResponse,
    DiarizedTurn,
    ExtractedDecision,
    ExtractedActionItem,
    ConflictRecord,
    DecisionStatus
)
from app.services.extractor_service import extractor_service
from app.services.memory_service import memory_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])

def _resolve_ws_id(val: Any) -> str:
    return val if isinstance(val, str) else "ws_default"

async def _process_turns_and_audit(
    meeting_id: str,
    title: str,
    date: str,
    turns: List[DiarizedTurn],
    workspace_id: str = "ws_default"
) -> MeetingIngestResponse:
    workspace_id = _resolve_ws_id(workspace_id)
    # 1. Save meeting record
    db.save_meeting(
        meeting_id=meeting_id,
        title=title,
        date=date,
        turns=[t.model_dump() for t in turns],
        workspace_id=workspace_id
    )

    # 2. Extract decisions & action items
    decisions, action_items = await extractor_service.extract_items(turns, meeting_id)

    # 3. Vector embedding & Cross-meeting decision audit
    all_conflicts: List[ConflictRecord] = []
    decisions_to_store = []

    for dec in decisions:
        dec_dict = dec.model_dump()
        embed_text = f"Topic: {dec.topic}. Statement: {dec.statement}"
        dec_dict["embedding"] = await memory_service.get_embedding(embed_text)
        decisions_to_store.append(dec_dict)

        # Retrieve similar historical decisions from past meetings in this workspace
        similar_past = await memory_service.search_similar_decisions(
            topic=dec.topic,
            statement=dec.statement,
            exclude_meeting_id=meeting_id,
            top_k=3,
            threshold=0.50,
            workspace_id=workspace_id
        )

        if similar_past:
            conflicts = await audit_service.audit_decision_conflicts(
                candidate_decision=dec_dict,
                historical_matches=similar_past,
                meeting_id=meeting_id
            )
            all_conflicts.extend(conflicts)

    # 4. Action Item Cross-Meeting Architectural Collisions (Dependency Deadlocks & Owner Disputes)
    past_tasks = db.get_all_active_tasks(workspace_id=workspace_id)
    candidate_action_dicts = [a.model_dump() for a in action_items]
    action_conflicts = audit_service.audit_action_conflicts(
        candidate_actions=candidate_action_dicts,
        historical_actions=past_tasks,
        meeting_id=meeting_id
    )
    all_conflicts.extend(action_conflicts)

    # 5. Save to Database
    db.save_decisions(decisions_to_store, workspace_id=workspace_id)
    db.save_action_items(candidate_action_dicts, workspace_id=workspace_id)
    if all_conflicts:
        db.save_conflicts([c.model_dump() for c in all_conflicts], workspace_id=workspace_id)

    unresolved_count = sum(1 for c in all_conflicts if not c.resolved)

    return MeetingIngestResponse(
        meeting_id=meeting_id,
        meeting_title=title,
        date=date,
        turns=turns,
        decisions=decisions,
        action_items=action_items,
        conflicts=all_conflicts,
        has_conflicts=len(all_conflicts) > 0,
        unresolved_conflict_count=unresolved_count
    )

@router.post("/ingest", response_model=MeetingIngestResponse)
async def ingest_meeting(
    payload: TranscriptIngestRequest,
    x_workspace_id: Optional[str] = Header("ws_default")
):
    meeting_id = f"meet_{uuid.uuid4().hex[:8]}"
    ws_id = x_workspace_id or "ws_default"

    if payload.turns and len(payload.turns) > 0:
        turns = payload.turns
    elif payload.raw_text:
        turns = extractor_service.parse_raw_text(payload.raw_text)
    else:
        raise HTTPException(status_code=400, detail="Either 'turns' or 'raw_text' must be provided.")

    return await _process_turns_and_audit(meeting_id, payload.meeting_title, payload.date, turns, workspace_id=ws_id)

@router.post("/upload", response_model=MeetingIngestResponse)
async def upload_meeting_file(
    file: UploadFile = File(...),
    meeting_title: str = Form(...),
    date: str = Form(...),
    x_workspace_id: Optional[str] = Header("ws_default")
):
    meeting_id = f"meet_{uuid.uuid4().hex[:8]}"
    ws_id = x_workspace_id or "ws_default"
    filename = (file.filename or "").lower()
    content_bytes = await file.read()

    turns: List[DiarizedTurn] = []

    # 1. Audio Formats (.wav, .mp3, .m4a, .webm, .ogg)
    if any(filename.endswith(ext) for ext in [".wav", ".mp3", ".m4a", ".webm", ".ogg"]):
        mime = "audio/wav"
        if filename.endswith(".mp3"): mime = "audio/mp3"
        elif filename.endswith(".webm"): mime = "audio/webm"
        elif filename.endswith(".m4a"): mime = "audio/m4a"
        elif filename.endswith(".ogg"): mime = "audio/ogg"

        try:
            turns = await extractor_service.transcribe_audio_with_gemini(content_bytes, mime)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Audio transcription failed: {str(e)}")

    # 2. WebVTT (.vtt)
    elif filename.endswith(".vtt"):
        text = content_bytes.decode("utf-8", errors="ignore")
        turns = extractor_service.parse_vtt(text)

    # 3. SubRip (.srt)
    elif filename.endswith(".srt"):
        text = content_bytes.decode("utf-8", errors="ignore")
        turns = extractor_service.parse_srt(text)

    # 4. JSON (.json)
    elif filename.endswith(".json"):
        text = content_bytes.decode("utf-8", errors="ignore")
        try:
            data = json.loads(text)
            if isinstance(data, list):
                turns = [DiarizedTurn(**t) for t in data]
            elif isinstance(data, dict) and "turns" in data:
                turns = [DiarizedTurn(**t) for t in data["turns"]]
                if "meeting_title" in data and not meeting_title:
                    meeting_title = data["meeting_title"]
            else:
                raise ValueError("JSON must be a list of turns or contain a 'turns' key.")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON transcript: {str(e)}")

    # 5. Plain text / Dialogue (.txt)
    else:
        text = content_bytes.decode("utf-8", errors="ignore")
        turns = extractor_service.parse_raw_text(text)

    if not turns:
        raise HTTPException(status_code=400, detail="Could not parse any speaker turns from uploaded file.")

    return await _process_turns_and_audit(meeting_id, meeting_title, date, turns, workspace_id=ws_id)

@router.get("", response_model=List[Dict[str, Any]])
async def list_meetings(x_workspace_id: Optional[str] = Header("ws_default")):
    ws_id = _resolve_ws_id(x_workspace_id)
    return db.list_meetings(workspace_id=ws_id)

@router.get("/{meeting_id}", response_model=MeetingIngestResponse)
async def get_meeting_details(meeting_id: str):
    meeting = db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    decisions = [ExtractedDecision(**d) for d in db.get_decisions_by_meeting(meeting_id)]
    actions = [ExtractedActionItem(**a) for a in db.get_action_items_by_meeting(meeting_id)]
    conflicts = [ConflictRecord(**c) for c in db.get_conflicts_by_meeting(meeting_id)]
    turns = [DiarizedTurn(**t) for t in meeting["turns"]]

    unresolved_count = sum(1 for c in conflicts if not c.resolved)

    return MeetingIngestResponse(
        meeting_id=meeting_id,
        meeting_title=meeting["title"],
        date=meeting["date"],
        turns=turns,
        decisions=decisions,
        action_items=actions,
        conflicts=conflicts,
        has_conflicts=len(conflicts) > 0,
        unresolved_conflict_count=unresolved_count
    )

@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str):
    meeting = db.get_meeting(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete_meeting(meeting_id)
    return {"status": "success", "message": f"Meeting '{meeting['title']}' deleted successfully."}

@router.get("/memory/ledger")
async def get_decision_ledger(x_workspace_id: Optional[str] = Header("ws_default")):
    ws_id = _resolve_ws_id(x_workspace_id)
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT d.*, m.title as meeting_title, m.date as meeting_date 
        FROM decisions d 
        JOIN meetings m ON d.meeting_id = m.id 
        WHERE d.workspace_id = ? OR d.workspace_id = 'ws_default'
        ORDER BY d.created_at DESC
        """, (ws_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        return rows
