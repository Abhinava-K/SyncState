from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from enum import Enum
from datetime import datetime

class DecisionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"
    CONFLICTED = "CONFLICTED"
    DROPPED = "DROPPED"

class ConflictType(str, Enum):
    TIMELINE_SLIP = "TIMELINE_SLIP"
    TECH_STACK_REVERSAL = "TECH_STACK_REVERSAL"
    POLICY_REVERSAL = "POLICY_REVERSAL"
    OWNER_DISPUTE = "OWNER_DISPUTE"
    DEPENDENCY_DEADLOCK = "DEPENDENCY_DEADLOCK"
    CONTRACT_INVERSION = "CONTRACT_INVERSION"

class DiarizedTurn(BaseModel):
    turn_index: int
    speaker: str
    timestamp: str = "00:00"
    text: str

class ExtractedDecision(BaseModel):
    id: str
    meeting_id: Optional[str] = None
    topic: str = Field(..., description="Project domain: Auth, Database, Release Timeline, Architecture, Pricing")
    statement: str = Field(..., description="Canonical summary of the agreed decision or stance")
    speaker: str = Field(..., description="Who made or proposed the decision")
    turn_index: int
    verbatim_quote: str = Field(..., description="Exact quote from the speaker turn as evidence")
    status: DecisionStatus = DecisionStatus.ACTIVE
    superseded_by_id: Optional[str] = None
    created_at: Optional[str] = None

class ActionHistoryEvent(BaseModel):
    id: str
    action_id: str
    meeting_id: str
    meeting_title: str
    meeting_date: Optional[str] = None
    event_type: Literal["CREATED", "MODIFIED", "COMPLETED", "HANDED_OFF", "BLOCKED", "REOPENED"]
    assignee: str
    previous_assignee: Optional[str] = None
    change_summary: str
    verbatim_quote: Optional[str] = None
    speaker: Optional[str] = None
    created_at: Optional[str] = None

class ExtractedActionItem(BaseModel):
    id: str
    workspace_id: Optional[str] = "ws_default"
    meeting_id: Optional[str] = None
    task: str = Field(..., description="Direct, actionable deliverable")
    assignee: str = Field(..., description="Individual responsible for execution")
    deadline: Optional[str] = Field(None, description="ISO date or relative target (e.g. '2026-11-15' or 'Thursday')")
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    turn_index: int = 0
    verbatim_quote: str = Field(..., description="Exact spoken sentence creating the commitment")
    is_approved: bool = True
    status: Literal["RUNNING", "CLOSED", "BLOCKED"] = "RUNNING"
    parent_action_id: Optional[str] = None
    origin_meeting_title: Optional[str] = None
    origin_meeting_date: Optional[str] = None
    closed_in_meeting_id: Optional[str] = None
    external_issue_url: Optional[str] = None
    created_at: Optional[str] = None
    history: List[ActionHistoryEvent] = []

class ActionStatusUpdateRequest(BaseModel):
    status: Literal["RUNNING", "CLOSED", "BLOCKED"]
    meeting_id: Optional[str] = None
    note: Optional[str] = None

class ActionLifecycleUpdate(BaseModel):
    id: str = Field(default_factory=lambda: f"upd_{uuid.uuid4().hex[:8]}")
    action_id: Optional[str] = None
    task: str
    update_type: Literal["COMPLETED", "MODIFIED", "HANDED_OFF", "PROGRESS"]
    speaker: str
    assignee: str
    previous_assignee: Optional[str] = None
    details: str
    turn_index: int = 0
    verbatim_quote: str

class ActionLineageResponse(BaseModel):
    actions: List[ExtractedActionItem]
    total_actions: int
    running_count: int
    closed_count: int
    blocked_count: int

class ConflictRecord(BaseModel):
    id: str
    meeting_id: Optional[str] = None
    candidate_decision_id: str
    historical_decision_id: str
    historical_meeting_title: str
    historical_statement: str
    historical_quote: str
    candidate_quote: str
    conflict_type: ConflictType
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)
    resolved: bool = False
    resolution_choice: Optional[Literal["OVERRIDE_PAST", "EDIT_NEW", "DISMISS"]] = None

class TranscriptIngestRequest(BaseModel):
    meeting_title: str
    date: str
    turns: Optional[List[DiarizedTurn]] = None
    raw_text: Optional[str] = None

class MeetingIngestResponse(BaseModel):
    meeting_id: str
    meeting_title: str
    date: str
    turns: List[DiarizedTurn]
    decisions: List[ExtractedDecision]
    action_items: List[ExtractedActionItem]
    action_updates: List[ActionLifecycleUpdate] = []
    conflicts: List[ConflictRecord]
    has_conflicts: bool
    unresolved_conflict_count: int

class ConflictResolveRequest(BaseModel):
    resolution_choice: Literal["OVERRIDE_PAST", "EDIT_NEW", "DISMISS"]
    edited_statement: Optional[str] = None

class StagingCommitRequest(BaseModel):
    approved_action_ids: List[str]
    approved_decision_ids: List[str]
    tracker_target: Literal["linear", "github"] = "linear"

class CreatedTicket(BaseModel):
    action_id: str
    task: str
    assignee: str
    deadline: Optional[str]
    ticket_id: str
    url: str
    provider: str

class CommitResponse(BaseModel):
    success: bool
    meeting_id: str
    created_tickets: List[CreatedTicket]
    active_decisions_count: int
    superseded_decisions_count: int
    message: str

class ActionItemUpdateRequest(BaseModel):
    task: Optional[str] = None
    assignee: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[Literal["low", "medium", "high", "urgent"]] = None
    is_approved: Optional[bool] = None

class TaskReminder(BaseModel):
    action_id: str
    task: str
    assignee: str
    deadline: str
    hours_remaining: Optional[float]
    urgency: Literal["critical_24h", "upcoming_48h", "normal"]

class PersonDigest(BaseModel):
    assignee: str
    active_tasks: List[ExtractedActionItem]
    reminders: List[TaskReminder]
    decisions_count: int

class WeeklyDigestResponse(BaseModel):
    generated_at: str
    members: List[PersonDigest]
    markdown_summary: str

class UserRegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    organization_name: Optional[str] = "Engineering Org"

class UserLoginRequest(BaseModel):
    email: str
    password: str

class WorkspaceInfo(BaseModel):
    id: str
    name: str
    slug: str
    role: str = "admin"

class UserInfo(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo
    active_workspace: WorkspaceInfo
    workspaces: List[WorkspaceInfo]

