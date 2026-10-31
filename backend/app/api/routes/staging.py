from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.database import db
from app.schemas.payloads import (
    ConflictResolveRequest,
    ActionItemUpdateRequest,
    StagingCommitRequest,
    CommitResponse
)
from app.services.tracker_service import tracker_service

router = APIRouter(prefix="/api/staging", tags=["Staging & Governance"])

@router.post("/conflicts/{conflict_id}/resolve")
async def resolve_conflict(conflict_id: str, payload: ConflictResolveRequest):
    """
    Human-in-the-Loop Conflict Resolution:
    - OVERRIDE_PAST: Marks historical decision as SUPERSEDED, candidate remains ACTIVE.
    - EDIT_NEW: Modifies candidate decision statement to conform with constraints.
    - DISMISS: Drops candidate decision.
    """
    # Fetch conflict
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM conflicts WHERE id = ?", (conflict_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Conflict record not found")
        conflict = dict(row)

    cand_id = conflict["candidate_decision_id"]
    hist_id = conflict["historical_decision_id"]
    choice = payload.resolution_choice

    if choice == "OVERRIDE_PAST":
        # Mark historical as SUPERSEDED by candidate
        db.update_decision_status(hist_id, status="SUPERSEDED", superseded_by_id=cand_id)
        db.update_decision_status(cand_id, status="ACTIVE")
    elif choice == "EDIT_NEW":
        if payload.edited_statement:
            db.update_decision_status(cand_id, status="ACTIVE", statement=payload.edited_statement)
    elif choice == "DISMISS":
        # Drop candidate decision
        db.update_decision_status(cand_id, status="DROPPED")

    # Mark conflict as resolved
    db.resolve_conflict(conflict_id, choice)

    return {
        "status": "success",
        "conflict_id": conflict_id,
        "resolution_choice": choice,
        "message": f"Conflict resolved using action '{choice}'."
    }

@router.patch("/actions/{action_id}")
async def update_action_item(action_id: str, updates: ActionItemUpdateRequest):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")
    
    db.update_action_item(action_id, update_data)
    return {"status": "success", "action_id": action_id, "updated": update_data}

@router.post("/meetings/{meeting_id}/commit", response_model=CommitResponse)
async def commit_meeting_staging(meeting_id: str, payload: StagingCommitRequest):
    """
    Governance Gate:
    Dispatches approved tasks to Linear / GitHub and commits decisions to long-term memory.
    Blocks dispatch if any unresolved conflicts remain!
    """
    conflicts = db.get_conflicts_by_meeting(meeting_id)
    unresolved = [c for c in conflicts if not c["resolved"]]

    if unresolved:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot commit: {len(unresolved)} conflict(s) remain unresolved. Please resolve conflicts before posting to tracker."
        )

    # 1. Dispatch approved action items to Tracker
    created_tickets = await tracker_service.dispatch_action_items(
        action_ids=payload.approved_action_ids,
        provider=payload.tracker_target
    )

    # 2. Update meeting status to COMMITTED
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE meetings SET status = 'COMMITTED' WHERE id = ?", (meeting_id,))
        conn.commit()

    # 3. Retrieve stats
    all_decisions = db.get_decisions_by_meeting(meeting_id)
    active_count = sum(1 for d in all_decisions if d["status"] == "ACTIVE")
    superseded_count = sum(1 for d in all_decisions if d["status"] == "SUPERSEDED")

    return CommitResponse(
        success=True,
        meeting_id=meeting_id,
        created_tickets=created_tickets,
        active_decisions_count=active_count,
        superseded_decisions_count=superseded_count,
        message=f"Successfully dispatched {len(created_tickets)} tasks to {payload.tracker_target.upper()} and synchronized institutional memory."
    )

