import { MeetingIngestResponse, WeeklyDigestResponse, MeetingSummaryItem, AuthResponse, WorkspaceInfo, ActionLineageResponse } from './types';

const API_BASE = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, '') || '/api';

export function getActiveWorkspaceId(): string {
  return localStorage.getItem('syncstate_workspace_id') || 'ws_default';
}

export function setActiveWorkspaceId(workspaceId: string): void {
  localStorage.setItem('syncstate_workspace_id', workspaceId);
}

export function getStoredUserId(): string | null {
  const userStr = localStorage.getItem('syncstate_user');
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    return user.id || null;
  } catch {
    return null;
  }
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const wsId = getActiveWorkspaceId();
  const userId = getStoredUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Workspace-Id': wsId,
    ...(options?.headers as Record<string, string> || {}),
  };
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth & Multi-Tenancy
  login: (payload: { email: string; password: string }) =>
    fetchJson<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: { email: string; name: string; password: string; organization_name?: string }) =>
    fetchJson<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => fetchJson<AuthResponse>('/auth/me'),

  createWorkspace: (name: string) =>
    fetchJson<WorkspaceInfo>(`/auth/workspaces?name=${encodeURIComponent(name)}`, {
      method: 'POST',
    }),

  // Reset database to clean slate
  resetData: () => fetchJson<{ status: string; message: string }>('/reset', { method: 'POST' }),

  // Seed demo meetings
  seedDemo: () => fetchJson<{ status: string; message: string; seeded_meeting_id: string }>('/seed', { method: 'POST' }),

  // Meetings
  listMeetings: () => fetchJson<MeetingSummaryItem[]>('/meetings'),
  getMeeting: (meetingId: string) => fetchJson<MeetingIngestResponse>(`/meetings/${meetingId}`),
  deleteMeeting: (meetingId: string) =>
    fetchJson<{ status: string; message: string }>(`/meetings/${meetingId}`, {
      method: 'DELETE',
    }),
  ingestMeeting: (payload: { meeting_title: string; date: string; turns?: any[]; raw_text?: string }) =>
    fetchJson<MeetingIngestResponse>('/meetings/ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  uploadMeeting: async (formData: FormData): Promise<MeetingIngestResponse> => {
    const wsId = getActiveWorkspaceId();
    const res = await fetch(`${API_BASE}/meetings/upload`, {
      method: 'POST',
      headers: {
        'X-Workspace-Id': wsId,
      },
      body: formData,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorData.detail || `Upload failed with status ${res.status}`);
    }
    return res.json();
  },
  getDecisionLedger: () => fetchJson<any[]>('/meetings/memory/ledger'),

  // Settings
  getSettings: () => fetchJson<any>('/settings'),
  updateSettings: (payload: any) =>
    fetchJson<any>('/settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Staging & Governance
  resolveConflict: (conflictId: string, choice: 'OVERRIDE_PAST' | 'EDIT_NEW' | 'DISMISS', editedStatement?: string) =>
    fetchJson<{ status: string; message: string }>(`/staging/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_choice: choice, edited_statement: editedStatement }),
    }),

  updateActionItem: (actionId: string, updates: any) =>
    fetchJson<{ status: string }>(`/staging/actions/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  commitStaging: (meetingId: string, approvedActionIds: string[], approvedDecisionIds: string[], trackerTarget: 'linear' | 'github') =>
    fetchJson<{ success: boolean; created_tickets: any[]; message: string }>(`/staging/meetings/${meetingId}/commit`, {
      method: 'POST',
      body: JSON.stringify({
        approved_action_ids: approvedActionIds,
        approved_decision_ids: approvedDecisionIds,
        tracker_target: trackerTarget,
      }),
    }),

  // Digests
  getWeeklyDigest: () => fetchJson<WeeklyDigestResponse>('/digests/weekly'),

  // Action Lineage & Lifecycle Ledger
  getActionLineage: () => fetchJson<ActionLineageResponse>('/actions/lineage'),
  updateActionStatus: (actionId: string, status: 'RUNNING' | 'CLOSED' | 'BLOCKED', meetingId?: string, note?: string) =>
    fetchJson<{ status: string }>(`/actions/${actionId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, meeting_id: meetingId, note }),
    }),
  seedActionLineageDemo: () =>
    fetchJson<{ status: string; message: string; action_completed: string; action_followup: string; meetings: string[] }>(
      '/actions/seed-lineage-journey',
      { method: 'POST' }
    ),
};
