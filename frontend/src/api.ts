import { MeetingIngestResponse, WeeklyDigestResponse, MeetingSummaryItem } from './types';

const API_BASE = '/api';

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
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
    const res = await fetch(`${API_BASE}/meetings/upload`, {
      method: 'POST',
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
};

