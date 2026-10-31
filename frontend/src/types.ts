export interface DiarizedTurn {
  turn_index: number;
  speaker: string;
  timestamp: string;
  text: string;
}

export interface ExtractedDecision {
  id: string;
  meeting_id?: string;
  topic: string;
  statement: string;
  speaker: string;
  turn_index: number;
  verbatim_quote: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'CONFLICTED' | 'DROPPED';
  superseded_by_id?: string;
}

export interface ExtractedActionItem {
  id: string;
  meeting_id?: string;
  task: string;
  assignee: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  turn_index: number;
  verbatim_quote: string;
  is_approved: boolean;
  external_issue_url?: string;
}

export interface ConflictRecord {
  id: string;
  meeting_id?: string;
  candidate_decision_id: string;
  historical_decision_id: string;
  historical_meeting_title: string;
  historical_statement: string;
  historical_quote: string;
  candidate_quote: string;
  conflict_type: 'TIMELINE_SLIP' | 'TECH_STACK_REVERSAL' | 'POLICY_REVERSAL' | 'OWNER_DISPUTE' | 'DEPENDENCY_DEADLOCK' | 'CONTRACT_INVERSION';
  reasoning: string;
  confidence: number;
  resolved: boolean;
  resolution_choice?: 'OVERRIDE_PAST' | 'EDIT_NEW' | 'DISMISS';
}

export interface MeetingIngestResponse {
  meeting_id: string;
  meeting_title: string;
  date: string;
  turns: DiarizedTurn[];
  decisions: ExtractedDecision[];
  action_items: ExtractedActionItem[];
  conflicts: ConflictRecord[];
  has_conflicts: boolean;
  unresolved_conflict_count: number;
}

export interface CreatedTicket {
  action_id: string;
  task: string;
  assignee: string;
  deadline?: string;
  ticket_id: string;
  url: string;
  provider: string;
}

export interface TaskReminder {
  action_id: string;
  task: string;
  assignee: string;
  deadline: string;
  hours_remaining?: number;
  urgency: 'critical_24h' | 'upcoming_48h' | 'normal';
}

export interface PersonDigest {
  assignee: string;
  active_tasks: ExtractedActionItem[];
  reminders: TaskReminder[];
  decisions_count: number;
}

export interface WeeklyDigestResponse {
  generated_at: string;
  members: PersonDigest[];
  markdown_summary: string;
}

export interface MeetingSummaryItem {
  id: string;
  title: string;
  date: string;
  status: string;
  created_at: string;
}

export interface SettingsResponse {
  gemini_api_key_configured: boolean;
  gemini_model: string;
  github_configured: boolean;
  github_repo: string;
  linear_configured: boolean;
  integration_mode: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
  active_workspace: WorkspaceInfo;
  workspaces: WorkspaceInfo[];
}

