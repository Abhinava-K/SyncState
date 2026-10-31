import React, { useState, useEffect } from 'react';
import { api, setActiveWorkspaceId } from './api';
import { MeetingIngestResponse, MeetingSummaryItem, WeeklyDigestResponse, UserInfo, WorkspaceInfo, AuthResponse } from './types';
import { TranscriptViewer } from './components/TranscriptViewer';
import { ConflictDiffCard } from './components/ConflictDiffCard';
import { ActionItemRow } from './components/ActionItemRow';
import { CommitBar } from './components/CommitBar';
import { WeeklyDigestModal } from './components/WeeklyDigestModal';
import { DecisionLedgerModal } from './components/DecisionLedgerModal';
import { IngestModal } from './components/IngestModal';
import { SettingsModal } from './components/SettingsModal';
import { LiveMeetingListenerModal } from './components/LiveMeetingListenerModal';
import { AuthModal } from './components/AuthModal';
import {
  Layers,
  Sparkles,
  Database,
  Calendar,
  Plus,
  BarChart2,
  CheckCircle,
  AlertTriangle,
  Folder,
  Activity,
  Zap,
  Trash2,
  Settings as SettingsIcon,
  Mic,
  Shield,
  UserCheck,
} from 'lucide-react';

export const App: React.FC = () => {
  const [meetings, setMeetings] = useState<MeetingSummaryItem[]>([]);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [currentMeeting, setCurrentMeeting] = useState<MeetingIngestResponse | null>(null);
  const [activeTurnIndex, setActiveTurnIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [trackerTarget, setTrackerTarget] = useState<'linear' | 'github'>('linear');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);

  // User & Workspace multi-tenant state
  const [currentUser, setCurrentUser] = useState<UserInfo | null>({
    id: 'user_demo',
    email: 'demo@syncstate.io',
    name: 'Abhinava K (Architect)',
  });
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>({
    id: 'ws_default',
    name: 'Core Engineering Team',
    slug: 'core-eng',
    role: 'admin',
  });
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);

  // Modals
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [showLiveListenerModal, setShowLiveListenerModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [digestData, setDigestData] = useState<WeeklyDigestResponse | null>(null);

  // Load meetings list & profile on mount
  useEffect(() => {
    loadUserProfile();
    refreshMeetings();
    loadConfig();
  }, []);

  const loadUserProfile = async () => {
    try {
      const auth = await api.getMe();
      if (auth.user) setCurrentUser(auth.user);
      if (auth.active_workspace) setActiveWorkspace(auth.active_workspace);
      if (auth.workspaces) setWorkspaces(auth.workspaces);
    } catch (e) {
      console.error('Failed to load user profile', e);
    }
  };

  const loadConfig = async () => {
    try {
      const cfg = await api.getSettings();
      setSystemConfig(cfg);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshMeetings = async (selectId?: string) => {
    try {
      const list = await api.listMeetings();
      setMeetings(list);
      if (list.length > 0) {
        const idToSelect = selectId || list[0].id;
        loadMeeting(idToSelect);
      } else {
        setCurrentMeetingId(null);
        setCurrentMeeting(null);
      }
    } catch (err) {
      console.error('Failed to load meetings', err);
    }
  };

  const handleResetData = async () => {
    try {
      await api.resetData();
      setCurrentMeetingId(null);
      setCurrentMeeting(null);
      setMeetings([]);
      showNotice('success', 'Database cleared! Clean slate ready for fresh uploads.');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to reset database');
    }
  };

  const handleDeleteMeeting = async (e: React.MouseEvent, meetingId: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete meeting "${title}" and all its staged items?`)) {
      return;
    }
    try {
      await api.deleteMeeting(meetingId);
      showNotice('success', `Meeting "${title}" deleted.`);
      const remaining = meetings.filter((m) => m.id !== meetingId);
      setMeetings(remaining);
      if (currentMeetingId === meetingId) {
        if (remaining.length > 0) {
          loadMeeting(remaining[0].id);
        } else {
          setCurrentMeetingId(null);
          setCurrentMeeting(null);
        }
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to delete meeting');
    }
  };

  const loadMeeting = async (meetingId: string) => {
    setIsLoading(true);
    setCurrentMeetingId(meetingId);
    try {
      const data = await api.getMeeting(meetingId);
      setCurrentMeeting(data);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to load meeting details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      showNotice('success', 'Seeding demo state with Meeting 1 (Oct 12)...');
      const res = await api.seedDemo();
      await refreshMeetings(res.seeded_meeting_id);
      showNotice('success', 'Demo state seeded! Now click "+ Ingest Meeting" and load Meeting 2 to witness cross-meeting conflict detection.');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to seed demo');
    }
  };

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Conflict Resolution
  const handleResolveConflict = async (
    conflictId: string,
    choice: 'OVERRIDE_PAST' | 'EDIT_NEW' | 'DISMISS',
    editedStatement?: string
  ) => {
    try {
      await api.resolveConflict(conflictId, choice, editedStatement);
      showNotice('success', `Conflict resolved via ${choice}`);
      if (currentMeetingId) {
        await loadMeeting(currentMeetingId);
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to resolve conflict');
    }
  };

  // Action item toggle & update
  const handleToggleAction = async (id: string, current: boolean) => {
    if (!currentMeeting) return;
    try {
      await api.updateActionItem(id, { is_approved: !current });
      setCurrentMeeting({
        ...currentMeeting,
        action_items: currentMeeting.action_items.map((a) =>
          a.id === id ? { ...a, is_approved: !current } : a
        ),
      });
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update action');
    }
  };

  const handleUpdateAction = async (id: string, updates: any) => {
    try {
      await api.updateActionItem(id, updates);
      if (currentMeeting) {
        setCurrentMeeting({
          ...currentMeeting,
          action_items: currentMeeting.action_items.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        });
      }
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update action');
    }
  };

  // Commit / Dispatch
  const handleCommit = async () => {
    if (!currentMeeting || !currentMeetingId) return;
    setIsCommitting(true);
    try {
      const approvedActionIds = currentMeeting.action_items
        .filter((a) => a.is_approved)
        .map((a) => a.id);
      const approvedDecisionIds = currentMeeting.decisions.map((d) => d.id);

      const res = await api.commitStaging(
        currentMeetingId,
        approvedActionIds,
        approvedDecisionIds,
        trackerTarget
      );
      showNotice('success', res.message);
      await loadMeeting(currentMeetingId);
      refreshMeetings(currentMeetingId);
    } catch (err: any) {
      showNotice('error', err.message || 'Commit blocked by safety gate');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleAuthSuccess = (authData: AuthResponse) => {
    setCurrentUser(authData.user);
    setActiveWorkspace(authData.active_workspace);
    setWorkspaces(authData.workspaces);
    refreshMeetings();
    showNotice('success', `Signed in as ${authData.user.name} (${authData.active_workspace.name})`);
  };

  // Open Weekly Digest
  const handleOpenDigest = async () => {
    try {
      const digest = await api.getWeeklyDigest();
      setDigestData(digest);
      setShowDigestModal(true);
    } catch (err: any) {
      showNotice('error', 'Failed to generate weekly digest');
    }
  };

  const approvedCount = currentMeeting?.action_items.filter((a) => a.is_approved).length || 0;
  const unresolvedConflicts = currentMeeting?.conflicts.filter((c) => !c.resolved) || [];

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-5 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-tight text-white">SyncState</h1>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                v1.0 Agent
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Autonomous Meeting Governance & Task Dispatch</p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center space-x-2.5">
          {/* Status Pills */}
          <div className="hidden md:flex items-center space-x-1.5 text-[10px] font-mono mr-2">
            <span className={`px-2 py-0.5 rounded border ${
              systemConfig?.integration_mode === 'live'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-zinc-850 text-zinc-400 border-zinc-800'
            }`}>
              {systemConfig?.integration_mode === 'live' ? '⚡ LIVE' : '🛡️ MOCK'}
            </span>
            {systemConfig?.gemini_api_key_configured && (
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded">
                Gemini 2.5
              </span>
            )}
          </div>

          {/* Multi-Tenant Workspace & Account Pill */}
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 flex items-center space-x-1.5 transition-all shadow-sm"
            title="Switch Workspace or Manage Team Account"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-zinc-200 max-w-[130px] truncate">
              {activeWorkspace?.name || 'Core Engineering'}
            </span>
            <span className="text-[10px] text-zinc-400 border-l border-zinc-700 pl-1.5">
              {currentUser?.name?.split(' ')[0] || 'Architect'}
            </span>
          </button>

          <button
            onClick={handleResetData}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/30 flex items-center space-x-1.5 transition-all"
            title="Wipe database clean"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clean Slate</span>
          </button>

          <button
            onClick={handleSeedDemo}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 flex items-center space-x-1.5 transition-all"
            title="Seed Meeting 1 to test cross-meeting conflict detection"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Seed Demo</span>
          </button>

          <button
            onClick={() => setShowLedgerModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 flex items-center space-x-1.5 transition-all"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Memory Ledger</span>
          </button>

          <button
            onClick={handleOpenDigest}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 flex items-center space-x-1.5 transition-all"
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Weekly Digest</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 transition-all"
            title="Configure Gemini API & GitHub Credentials"
          >
            <SettingsIcon className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
          </button>

          {/* In-Meeting Live Voice Listener ($0.00 Free Tier) */}
          <button
            onClick={() => setShowLiveListenerModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
            title="Start $0.00 continuous speech recognition listener for live meeting calls"
          >
            <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Live Listener</span>
            <span className="text-[9px] font-mono uppercase bg-rose-500/30 text-rose-200 px-1 py-0.2 rounded">$0.00</span>
          </button>

          <button
            onClick={() => setShowIngestModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Ingest Meeting</span>
          </button>
        </div>
      </header>

      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`px-5 py-2 text-xs flex items-center justify-between border-b transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* 3-Pane High-Density Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pane 1: Left Rail (Meeting History & Timeline) */}
        <aside className="w-60 border-r border-zinc-800 bg-zinc-950 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-zinc-850 flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center space-x-1.5">
              <Folder className="w-3.5 h-3.5 text-zinc-500" />
              <span>Meeting Sessions</span>
            </span>
            <span className="font-mono text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded">
              {meetings.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {meetings.map((m) => {
              const isSelected = m.id === currentMeetingId;
              return (
                <div
                  key={m.id}
                  onClick={() => loadMeeting(m.id)}
                  className={`group p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                      : 'bg-zinc-900/30 border-transparent hover:bg-zinc-900/80 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 truncate">{m.title}</span>
                    <button
                      onClick={(e) => handleDeleteMeeting(e, m.id, m.title)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 transition-opacity ml-1 flex-shrink-0"
                      title="Delete meeting"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-500 font-mono">
                    <span>{m.date}</span>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                        m.status === 'COMMITTED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Engine Status Footer */}
          <div className="p-3 border-t border-zinc-850 bg-zinc-900/30 text-[11px] text-zinc-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Memory Engine</span>
              <span className="text-emerald-400 font-mono flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Integrations</span>
              <span className="text-zinc-400 font-mono">Linear + GitHub</span>
            </div>
          </div>
        </aside>

        {/* Pane 2: Center Pane (Interactive Diarized Transcript) */}
        <section className="w-[42%] flex-shrink-0 flex flex-col h-full bg-zinc-950">
          <TranscriptViewer
            turns={currentMeeting?.turns || []}
            activeTurnIndex={activeTurnIndex}
            onSelectTurn={(idx) => setActiveTurnIndex(idx)}
          />
        </section>

        {/* Pane 3: Right Pane (Execution & Governance Staging Board) */}
        <main className="flex-1 flex flex-col h-full bg-zinc-900/30 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                {currentMeeting?.meeting_title || 'Meeting Governance Board'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                Cross-Session Memory Audit &amp; Staging Diff
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-mono bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                {currentMeeting?.decisions.length || 0} Decisions
              </span>
              <span className="font-mono bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
                {currentMeeting?.action_items.length || 0} Tasks
              </span>
            </div>
          </div>

          {/* Staging Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {!currentMeeting && (
              <div className="p-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center space-y-3 bg-zinc-950/40">
                <div className="w-12 h-12 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Clean Slate Ready</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mt-1 leading-relaxed">
                    No meetings loaded. Click <strong>"+ Ingest Meeting"</strong> to drop your Zoom transcript (<code>.vtt</code>) or record live from your microphone.
                  </p>
                </div>
                <button
                  onClick={() => setShowIngestModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ingest Meeting Transcript</span>
                </button>
              </div>
            )}
            {/* SECTION 1: CONFLICT RESOLUTION DIFF CARDS */}
            {currentMeeting?.conflicts && currentMeeting.conflicts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Cross-Meeting Contradictions ({currentMeeting.conflicts.length})</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Flagged against prior institutional memory
                  </span>
                </div>

                <div className="space-y-3">
                  {currentMeeting.conflicts.map((conflict) => (
                    <ConflictDiffCard
                      key={conflict.id}
                      conflict={conflict}
                      onResolve={(choice, text) => handleResolveConflict(conflict.id, choice, text)}
                      onHoverTurn={(idx) => setActiveTurnIndex(idx)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: EXTRACTED DECISIONS */}
            {currentMeeting?.decisions && currentMeeting.decisions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Institutional Decisions ({currentMeeting.decisions.length})</span>
                  </span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    Ready to commit to long-term memory
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {currentMeeting.decisions.map((dec) => (
                    <div
                      key={dec.id}
                      onMouseEnter={() => setActiveTurnIndex(dec.turn_index)}
                      onMouseLeave={() => setActiveTurnIndex(null)}
                      className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-zinc-400 text-[10px] font-mono">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                          {dec.topic}
                        </span>
                        <span>{dec.speaker}</span>
                      </div>
                      <p className="font-semibold text-zinc-200">{dec.statement}</p>
                      <p className="text-zinc-500 italic text-[11px]">"{dec.verbatim_quote}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: STAGED ACTION ITEMS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-400 uppercase tracking-wider">
                <span className="flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Staged Action Items ({currentMeeting?.action_items.length || 0})</span>
                </span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  Toggle tasks to dispatch to issue tracker
                </span>
              </div>

              {currentMeeting?.action_items.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
                  No action items extracted from this meeting.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentMeeting?.action_items.map((item) => (
                    <ActionItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggleAction}
                      onUpdate={handleUpdateAction}
                      onHoverTurn={(idx) => setActiveTurnIndex(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Dispatch Bar */}
          <CommitBar
            approvedCount={approvedCount}
            unresolvedConflictCount={unresolvedConflicts.length}
            trackerTarget={trackerTarget}
            onTrackerChange={setTrackerTarget}
            onCommit={handleCommit}
            isCommitting={isCommitting}
          />
        </main>
      </div>

      {/* MODALS */}
      {showLiveListenerModal && (
        <LiveMeetingListenerModal
          onClose={() => setShowLiveListenerModal(false)}
          onIngestSuccess={(meetingId) => {
            refreshMeetings(meetingId);
            showNotice('success', 'Live meeting audio ingested! Cross-meeting audit completed.');
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {showIngestModal && (
        <IngestModal
          onClose={() => setShowIngestModal(false)}
          onIngestSuccess={(meetingId) => {
            refreshMeetings(meetingId);
            showNotice('success', 'Transcript ingested! Cross-meeting audit completed.');
          }}
        />
      )}

      {showDigestModal && (
        <WeeklyDigestModal digest={digestData} onClose={() => setShowDigestModal(false)} />
      )}

      {showLedgerModal && <DecisionLedgerModal onClose={() => setShowLedgerModal(false)} />}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => {
            loadConfig();
            showNotice('success', 'Credentials and configuration synchronized!');
          }}
        />
      )}
    </div>
  );
};
export default App;

