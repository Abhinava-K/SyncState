from fastapi import APIRouter, HTTPException, Header
from typing import Optional, Dict, Any
from app.database import db
from app.schemas.payloads import (
    ActionLineageResponse,
    ActionStatusUpdateRequest
)

router = APIRouter(prefix="/api/actions", tags=["Action Lineage & Lifecycle Ledger"])

@router.get("/lineage", response_model=ActionLineageResponse)
async def get_action_lineage(
    x_workspace_id: Optional[str] = Header("ws_default")
):
    """
    Returns the comprehensive cross-meeting transcript of all actions,
    their status (RUNNING, CLOSED, BLOCKED), modification history,
    origin meetings, and predecessor/successor lineage.
    """
    lineage = db.get_action_lineage(workspace_id=x_workspace_id or "ws_default")
    return ActionLineageResponse(**lineage)

@router.post("/{action_id}/status")
async def update_action_status(
    action_id: str,
    payload: ActionStatusUpdateRequest,
    x_workspace_id: Optional[str] = Header("ws_default")
):
    """
    Updates the operational lifecycle status of an action (RUNNING, CLOSED, BLOCKED),
    and appends a verifiable chronological audit event to the action history trail.
    """
    try:
        res = db.update_action_status(
            action_id=action_id,
            status=payload.status,
            meeting_id=payload.meeting_id,
            note=payload.note,
            workspace_id=x_workspace_id or "ws_default"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update action status: {str(e)}")

@router.post("/seed-lineage-journey")
async def seed_action_lineage_journey(
    x_workspace_id: Optional[str] = Header("ws_default")
):
    """
    Seeds the exact 3-meeting action lifecycle described by the user:
    - Meeting 1 (Oct 12): Alex assigned to "Define database schema" -> Status: RUNNING.
    - Meeting 2 (Oct 19): "Define database schema" modified with new JSONB requirements.
    - Meeting 3 (Oct 26): "Define database schema" completed & CLOSED.
                          Follow-up "Implement database schema" assigned to Bobby -> Status: RUNNING.
    """
    try:
        res = db.seed_action_lineage_demo(workspace_id=x_workspace_id or "ws_default")
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed lineage journey: {str(e)}")

