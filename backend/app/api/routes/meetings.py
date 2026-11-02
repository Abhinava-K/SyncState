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
    ActionLifecycleUpdate,
    ConflictRecord,
    DecisionStatus
)
from app.services.extractor_service import extractor_service
from app.services.memory_service import memory_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])

def _resolve_ws_id(val: Any) -> str:
    return val if isinstance(val, str) else "ws_default"

def _find_matching_task(task_text: str, speaker_hint: str, candidate_tasks: List[Dict[str, Any]], current_meeting_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    import re
    stop_words = {"with", "from", "that", "this", "have", "will", "been", "done", "test", "testing", "complete", "officially", "deploy", "deployed", "endpoint", "and", "the", "for", "our", "all"}
    words = [w.lower() for w in re.findall(r'[a-zA-Z]{3,}', task_text) if w.lower() not in stop_words]
    best_match = None
    best_score = 0
    speaker_clean = speaker_hint.split("(")[0].strip().lower()

    for pt in candidate_tasks:
        if current_meeting_id and pt.get("meeting_id") == current_meeting_id:
            continue
        pt_task = pt.get("task", "").lower()
        pt_assignee = pt.get("assignee", "").lower()
        
        assignee_matches = bool(speaker_clean and (speaker_clean in pt_assignee or pt_assignee in speaker_clean))
        word_matches = sum(1 for w in words if w in pt_task)
        
        if word_matches == 0:
            continue

        score = word_matches * 5
        if assignee_matches:
            score += 20
        else:
            score -= 10

        if score > best_score and score >= 10:
            best_score = score
            best_match = pt

    return best_match

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

    # 2. Extract decisions, new action items, and lifecycle updates
    decisions, action_items, action_updates = await extractor_service.extract_items(turns, meeting_id)

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

    # 5. Process and Correlate Action Lifecycle Updates (Completions, Handoffs, Modifications)
    # Deduplicate: An utterance that created a NEW action item in this meeting must NOT produce a duplicate action_update
    new_action_turns = {a.turn_index for a in action_items}
    new_action_task_names = [a.task.lower() for a in action_items]

    filtered_updates: List[ActionLifecycleUpdate] = []
    for update in action_updates:
        # 1. Skip if from the same turn as a new action item
        if update.turn_index in new_action_turns:
            continue
        # 2. Skip HANDED_OFF if previous assignee is missing or identical to new assignee (initial commitment, not a transfer)
        if update.update_type == "HANDED_OFF":
            prev = (update.previous_assignee or "").strip().lower()
            curr = (update.assignee or "").strip().lower()
            if not prev or prev in ["none", "null", "unknown", curr]:
                continue
        # 3. Skip if task title directly duplicates an action item created in this meeting
        upd_task_clean = update.task.lower()
        if any(upd_task_clean in t or t in upd_task_clean for t in new_action_task_names):
            continue
        filtered_updates.append(update)
    action_updates = filtered_updates

    for update in action_updates:
        query_text = f"{update.task} {update.verbatim_quote}"
        matched = _find_matching_task(query_text, update.speaker, past_tasks, current_meeting_id=meeting_id)
        
        if matched:
            update.action_id = matched["id"]
            if update.update_type == "COMPLETED":
                db.update_action_status(
                    action_id=matched["id"],
                    status="CLOSED",
                    meeting_id=meeting_id,
                    note=update.details,
                    workspace_id=workspace_id
                )
                db.record_action_history_event(
                    action_id=matched["id"],
                    workspace_id=workspace_id,
                    meeting_id=meeting_id,
                    meeting_title=title,
                    meeting_date=date,
                    event_type="COMPLETED",
                    assignee=matched.get("assignee", update.assignee),
                    change_summary=update.details,
                    verbatim_quote=update.verbatim_quote,
                    speaker=update.speaker
                )
            elif update.update_type == "HANDED_OFF":
                prev_assignee = update.previous_assignee or matched.get("assignee")
                with db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("UPDATE action_items SET assignee = ? WHERE id = ?", (update.assignee, matched["id"]))
                    conn.commit()
                db.record_action_history_event(
                    action_id=matched["id"],
                    workspace_id=workspace_id,
                    meeting_id=meeting_id,
                    meeting_title=title,
                    meeting_date=date,
                    event_type="HANDED_OFF",
                    assignee=update.assignee,
                    previous_assignee=prev_assignee,
                    change_summary=update.details,
                    verbatim_quote=update.verbatim_quote,
                    speaker=update.speaker
                )
            elif update.update_type == "MODIFIED":
                db.record_action_history_event(
                    action_id=matched["id"],
                    workspace_id=workspace_id,
                    meeting_id=meeting_id,
                    meeting_title=title,
                    meeting_date=date,
                    event_type="MODIFIED",
                    assignee=matched.get("assignee", update.assignee),
                    change_summary=update.details,
                    verbatim_quote=update.verbatim_quote,
                    speaker=update.speaker
                )
        else:
            # Only create fallback standalone record if it was explicitly COMPLETED in this meeting
            if update.update_type == "COMPLETED":
                new_act_id = f"act_{uuid.uuid4().hex[:8]}"
                new_act = {
                    "id": new_act_id,
                    "workspace_id": workspace_id,
                    "meeting_id": meeting_id,
                    "task": update.task,
                    "assignee": update.assignee,
                    "deadline": "Completed in Meeting",
                    "priority": "medium",
                    "turn_index": update.turn_index,
                    "verbatim_quote": update.verbatim_quote,
                    "is_approved": 1,
                    "status": "CLOSED",
                    "closed_in_meeting_id": meeting_id
                }
                db.save_action_items([new_act], workspace_id=workspace_id)
                db.record_action_history_event(
                    action_id=new_act_id,
                    workspace_id=workspace_id,
                    meeting_id=meeting_id,
                    meeting_title=title,
                    meeting_date=date,
                    event_type="COMPLETED",
                    assignee=update.assignee,
                    previous_assignee=update.previous_assignee,
                    change_summary=update.details,
                    verbatim_quote=update.verbatim_quote,
                    speaker=update.speaker
                )
                update.action_id = new_act_id

    # 6. Save Decisions & New Actions to Database
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
        action_updates=action_updates,
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

        # Try speech_recognition first (works over standard HTTPS without quota limits)
        try:
            turns = extractor_service.transcribe_audio_bytes(content_bytes)
        except Exception as e_stt:
            if extractor_service.api_key:
                try:
                    turns = await extractor_service.transcribe_audio_with_gemini(content_bytes, mime)
                except Exception as e_gem:
                    raise HTTPException(status_code=400, detail=f"Audio transcription failed: {str(e_stt)}")
            else:
                raise HTTPException(status_code=400, detail=f"Audio transcription failed: {str(e_stt)}")

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

    # Fetch Action Lifecycle Updates for this meeting session
    hist_events = db.get_action_history_by_meeting(meeting_id)
    action_updates: List[ActionLifecycleUpdate] = []
    seen_action_ids = set()

    for h in reversed(hist_events):
        if h["event_type"] in ["COMPLETED", "HANDED_OFF", "MODIFIED", "PROGRESS"]:
            if h["action_id"] in seen_action_ids:
                continue
            seen_action_ids.add(h["action_id"])
            action_updates.append(ActionLifecycleUpdate(
                id=h["id"],
                action_id=h["action_id"],
                task=h.get("task_title") or "Deliverable Update",
                update_type=h["event_type"],
                speaker=h.get("speaker") or h["assignee"],
                assignee=h["assignee"],
                previous_assignee=h.get("previous_assignee"),
                details=h.get("change_summary", ""),
                turn_index=0,
                verbatim_quote=h.get("verbatim_quote") or h.get("change_summary", "")
            ))

    # Also include any tasks marked as closed_in_meeting_id
    closed_tasks = db.get_actions_closed_in_meeting(meeting_id)
    for ct in closed_tasks:
        if ct["id"] not in seen_action_ids:
            seen_action_ids.add(ct["id"])
            action_updates.append(ActionLifecycleUpdate(
                id=f"upd_{ct['id']}",
                action_id=ct["id"],
                task=ct["task"],
                update_type="COMPLETED",
                speaker=ct.get("assignee", "Engineering"),
                assignee=ct.get("assignee", "Engineering"),
                details="Completed and closed in this meeting session.",
                turn_index=ct.get("turn_index", 0),
                verbatim_quote=ct.get("verbatim_quote", "")
            ))

    unresolved_count = sum(1 for c in conflicts if not c.resolved)

    return MeetingIngestResponse(
        meeting_id=meeting_id,
        meeting_title=meeting["title"],
        date=meeting["date"],
        turns=turns,
        decisions=decisions,
        action_items=actions,
        action_updates=action_updates,
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
