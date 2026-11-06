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
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { ActionLineageModal } from './components/ActionLineageModal';
import { CommandPalette } from './components/CommandPalette';
import { FullTranscriptModal } from './components/FullTranscriptModal';
import { findMatchingTurnIndex } from './utils/formatters';
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
  LogOut,
  GitBranch,
  Search,
  FileText,
} from 'lucide-react';

export function humanizeTitle(raw?: string | null): { title: string; slug: string } {
  if (!raw) return { title: 'Untitled Meeting', slug: '#meeting' };
  
  if (raw.includes('_')) {
    const parts = raw.split('_').filter(Boolean);
    if (parts[0]?.toLowerCase() === 'meeting' && parts[1] && !isNaN(Number(parts[1]))) {
      const num = parts[1];
      const rest = parts.slice(2).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return {
        title: `Meeting ${num}: ${rest || 'Sync'}`,
        slug: `#m${num}`,
      };
    } else {
      const title = parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      return { title, slug: `#${parts[0].toLowerCase()}` };
    }
  }

  const mMatch = raw.match(/^Meeting\s+(\d+)[:\s]+(.*)/i);
  if (mMatch) {
    return {
      title: `Meeting ${mMatch[1]}: ${mMatch[2]}`,
      slug: `#m${mMatch[1]}`,
    };
  }

  return { title: raw, slug: `#${raw.slice(0, 4).toLowerCase().replace(/\s+/g, '')}` };
}

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

  const approvedCount = currentMeeting?.action_items.filter((a) => a.is_approved).length || 0;
  const unresolvedConflicts = currentMeeting?.conflicts.filter((c) => !c.resolved) || [];

  // URL-backed Routing (/homepage, /auth, /app)
  type RoutePath = '/homepage' | '/auth' | '/app';
  const getInitialRoute = (): RoutePath => {
    const p = window.location.pathname.toLowerCase();
    if (p === '/auth' || p === '/login' || p === '/signin' || p === '/signup') return '/auth';
    if (p === '/app' || p === '/console' || p === '/workspace') return '/app';
    return '/homepage';
  };

  const [currentRoute, setCurrentRoute] = useState<RoutePath>(getInitialRoute);

  const navigate = (path: string) => {
    let target: RoutePath = '/homepage';
    const clean = path.toLowerCase();
    if (clean === '/auth' || clean === '/login' || clean === '/signin' || clean === '/signup' || clean.startsWith('/auth?')) {
      target = '/auth';
    } else if (clean === '/app' || clean === '/console' || clean === '/workspace') {
      target = '/app';
    } else {
      target = '/homepage';
    }

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentRoute(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // User & Workspace multi-tenant state (defaults to null if not authenticated)
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(() => {
    const stored = localStorage.getItem('syncstate_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>({
    id: 'ws_default',
    name: 'Core Engineering Team',
    slug: 'core-eng',
    role: 'admin',
  });
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);

  const handleSignOut = () => {
    localStorage.removeItem('syncstate_user');
    localStorage.removeItem('syncstate_workspace_id');
    setCurrentUser(null);
    showNotice('success', 'Signed out successfully');
    navigate('/homepage');
  };

  // Modals
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [showLiveListenerModal, setShowLiveListenerModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showActionLineageModal, setShowActionLineageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCleanSlateModal, setShowCleanSlateModal] = useState(false);
  const [isClearingSlate, setIsClearingSlate] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showFullTranscriptModal, setShowFullTranscriptModal] = useState(false);
  const [undoToast, setUndoToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const [digestData, setDigestData] = useState<WeeklyDigestResponse | null>(null);

  // Auto-dismiss Undo toast after 5s
  useEffect(() => {
    if (undoToast) {
      const timer = setTimeout(() => {
        setUndoToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [undoToast]);

  // Global Keyboard Shortcuts (⌘K, ⌘I, ⌘↵, 1..9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'Escape' && showCleanSlateModal) {
        setShowCleanSlateModal(false);
        return;
      }

      // Cmd+K or Ctrl+K -> Command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      // Cmd+I or Ctrl+I -> Ingest Modal
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setShowIngestModal(true);
        return;
      }

      // Cmd+L or Ctrl+L -> Live Meeting Listener Modal (opens modal without auto-starting)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setShowLiveListenerModal(true);
        return;
      }

      // Cmd+Enter or Ctrl+Enter -> Dispatch
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!isCommitting && unresolvedConflicts.length === 0 && approvedCount > 0) {
          e.preventDefault();
          handleCommit();
        }
        return;
      }

      // Quick jump 1..9 when not typing
      if (!isTyping && !e.metaKey && !e.ctrlKey && !e.altKey && !showCommandPalette) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= meetings.length) {
          e.preventDefault();
          loadMeeting(meetings[num - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [meetings, isCommitting, unresolvedConflicts.length, approvedCount, showCommandPalette, showCleanSlateModal]);

  // Load meetings list & profile on mount
  useEffect(() => {
    loadUserProfile();
    refreshMeetings();
    loadConfig();
  }, []);

  const loadUserProfile = async () => {
    const stored = localStorage.getItem('syncstate_user');
    if (!stored) {
      setCurrentUser(null);
      return;
    }
    try {
      const auth = await api.getMe();
      if (auth && auth.user) {
        setCurrentUser(auth.user);
        localStorage.setItem('syncstate_user', JSON.stringify(auth.user));
      }
      if (auth && auth.active_workspace) setActiveWorkspace(auth.active_workspace);
      if (auth && auth.workspaces) setWorkspaces(auth.workspaces);
    } catch (e) {
      // Token or user is invalid, clear state
      localStorage.removeItem('syncstate_user');
      setCurrentUser(null);
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
      const count = approvedActionIds.length;
      const targetName = trackerTarget === 'linear' ? 'Linear' : 'GitHub Issues';
      setUndoToast({
        message: `Dispatched ${count} task${count !== 1 ? 's' : ''} to ${targetName}`,
        onUndo: () => {
          setUndoToast(null);
          showNotice('success', 'Dispatch marked for reversal in staging ledger.');
        },
      });
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

  if (currentRoute === '/homepage') {
    return (
      <>
        <LandingPage
          onNavigate={navigate}
          onEnterApp={() => {
            if (currentUser) {
              navigate('/app');
            } else {
              navigate('/signup');
            }
          }}
          onOpenLiveListener={() => {
            navigate('/app');
            setShowLiveListenerModal(true);
          }}
          currentUser={currentUser}
        />
        {showLiveListenerModal && (
          <LiveMeetingListenerModal
            onClose={() => setShowLiveListenerModal(false)}
            onIngestSuccess={(id) => {
              navigate('/app');
              refreshMeetings(id);
              loadMeeting(id);
            }}
          />
        )}
      </>
    );
  }

  if (currentRoute === '/auth' || (currentRoute === '/app' && !currentUser)) {
    const isSignupUrl = typeof window !== 'undefined' && (window.location.pathname.toLowerCase() === '/signup' || window.location.search.includes('mode=signup'));
    return (
      <AuthPage
        key={typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : 'auth-page'}
        onNavigate={navigate}
        initialMode={isSignupUrl ? 'signup' : 'login'}
        onAuthSuccess={(authData) => {
          setCurrentUser(authData.user);
          setActiveWorkspace(authData.active_workspace);
          setWorkspaces(authData.workspaces);
          showNotice('success', `Welcome, ${authData.user.name}!`);
          navigate('/app');
        }}
        currentUser={currentUser}
        noticeMessage={
          currentRoute === '/app' && !currentUser
            ? 'Authentication Required: Please sign in or create an account to enter your governance workspace.'
            : undefined
        }
      />
    );
  }

  return (
    <div
      style={{
        zoom: 1.1,
        width: 'calc(100vw / 1.1)',
        height: 'calc(100vh / 1.1)',
      }}
      className="flex bg-[#121314] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200"
    >
      {/* ZONE A: Dedicated Left Application Sidebar */}
      <aside className="w-[250px] lg:w-[260px] bg-[#050507] border-r border-white/[0.07] h-full flex flex-col justify-between flex-shrink-0 z-20">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand Header: h-14 perfectly aligns horizontally with Zone B Header (Y=56px) */}
          <div className="h-14 px-4 border-b border-white/[0.07] flex items-center justify-between flex-shrink-0 bg-[#050507]">
            <button
              onClick={() => navigate('/homepage')}
              className="flex items-center space-x-2.5 text-left group transition p-1.5 -m-1.5 rounded-[7px] hover:bg-white/[0.04]"
            >
              <div className="w-7 h-7 rounded-[6px] bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-indigo-400 group-hover:border-indigo-500/40 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.25)] transition">
                <Zap className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-zinc-100 group-hover:text-white transition">
                SyncState
              </span>
            </button>
          </div>

          {/* Quick Command Menu Trigger (⌘K): h-12 perfectly aligns horizontally with Column 1 & 2 Headers (Y=104px) */}
          <div className="h-12 px-3 border-b border-white/[0.07] flex items-center bg-[#050507] flex-shrink-0">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="w-full h-8 px-2.5 rounded-[6px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] text-xs text-zinc-400 flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                <span className="text-zinc-400 group-hover:text-zinc-200">Search or jump...</span>
              </div>
              <kbd className="text-[10px] font-mono text-zinc-500 bg-white/[0.06] px-1.5 py-0.5 rounded-[4px] select-none">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Workspace Views Navigation: Sentence case */}
          <div className="p-3 border-b border-white/[0.07] space-y-1 flex-shrink-0">
            <div className="text-[10px] tracking-wider text-zinc-500 font-medium px-2 mb-1">
              Workspace
            </div>
            <button
              onClick={() => setShowLedgerModal(true)}
              className="w-full text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] rounded-[6px] px-2.5 py-1.5 flex items-center gap-2.5 transition text-left"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Memory Ledger</span>
            </button>
            <button
              onClick={() => setShowActionLineageModal(true)}
              className="w-full text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] rounded-[6px] px-2.5 py-1.5 flex items-center gap-2.5 transition text-left"
            >
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              <span>Action Lineage</span>
            </button>
            <button
              onClick={handleOpenDigest}
              className="w-full text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] rounded-[6px] px-2.5 py-1.5 flex items-center gap-2.5 transition text-left"
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Weekly Digest</span>
            </button>
            <button
              onClick={() => setShowCleanSlateModal(true)}
              className="w-full text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-[6px] px-2.5 py-1.5 flex items-center gap-2.5 transition text-left"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-rose-400" />
              <span>Clean Slate</span>
            </button>
          </div>

          {/* Meeting Sessions List (Scrollable, Sentence Case Header, Tabular Nums) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
            <div className="flex items-center justify-between text-[10px] tracking-wider text-zinc-500 font-medium px-2 mb-1.5">
              <span>Meetings</span>
              <span className="font-mono tabular-nums text-[10px] text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
                {meetings.length}
              </span>
            </div>

            <div className="space-y-1">
              {meetings.map((m, idx) => {
                const isSelected = m.id === currentMeetingId;
                const { title, slug } = humanizeTitle(m.title);

                return (
                  <div
                    key={m.id}
                    onClick={() => loadMeeting(m.id)}
                    className={`group p-2.5 rounded-[6px] text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white/[0.06] text-zinc-100 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className={`font-medium truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                          {title}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                          {slug}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0 ml-1">
                        <kbd className="opacity-0 group-hover:opacity-100 text-[9px] font-mono text-zinc-500 bg-white/[0.06] px-1 py-0.2 rounded-[3px] transition-opacity select-none">
                          {idx + 1}
                        </kbd>
                        <button
                          onClick={(e) => handleDeleteMeeting(e, m.id, m.title)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-500 font-mono tabular-nums">
                      <span>{m.date}</span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] lowercase text-zinc-400">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            m.status === 'COMMITTED'
                              ? 'bg-emerald-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span
                          className={
                            m.status === 'COMMITTED'
                              ? 'text-emerald-400/90'
                              : 'text-amber-400/90'
                          }
                        >
                          {m.status === 'COMMITTED' ? 'committed' : 'staged'}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Profile & System Utilities Dock: h-14 aligns horizontally with Column 1 & 2 bottom line */}
        <div className="h-14 px-3 border-t border-white/[0.07] bg-[#050507] flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center space-x-2 text-left p-1 -m-1 rounded-[5px] hover:bg-white/[0.04] transition flex-1 min-w-0"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold text-[11px] flex items-center justify-center border border-indigo-500/30 flex-shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium text-zinc-200 truncate">
                {activeWorkspace?.name || 'Core Engineering'}
              </span>
              <span className="text-[10px] text-zinc-500 truncate">
                {currentUser?.name || 'Architect'}
              </span>
            </div>
          </button>

          <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 rounded-[5px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-[5px] text-zinc-400 hover:text-rose-400 hover:bg-white/[0.04] transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT SIDE: Streamlined Top Bar + 2-Column Main Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#121314] overflow-hidden">
        {/* Global Notification Banner */}
        {notification && (
          <div
            className={`px-6 py-2 text-xs flex items-center justify-between border-b transition-all flex-shrink-0 ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-zinc-400 hover:text-white">
              &times;
            </button>
          </div>
        )}

        {/* ZONE B: Streamlined Top Header Bar */}
        <header className="h-14 border-b border-white/[0.07] bg-[#121314]/90 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-10">
          {/* Left: Active Meeting Context & Refined Metric Badges */}
          <div className="flex items-center space-x-4 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center space-x-2.5">
                <h2 className="text-sm font-semibold text-zinc-100 truncate">
                  {currentMeeting ? humanizeTitle(currentMeeting.meeting_title).title : 'Meeting Governance Board'}
                </h2>
                {currentMeeting?.status && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 lowercase">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        currentMeeting.status === 'COMMITTED'
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span>{currentMeeting.status.toLowerCase()}</span>
                  </span>
                )}
              </div>
            </div>

            {currentMeeting && (
              <div className="hidden md:flex items-center space-x-2 text-xs">
                <span className="font-mono tabular-nums text-zinc-400 text-[10px] lowercase bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-[4px]">
                  {currentMeeting.decisions.length} decisions
                </span>
                {(currentMeeting.action_updates?.length ?? 0) > 0 && (
                  <span className="font-mono tabular-nums text-emerald-400/90 text-[10px] lowercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-[4px] inline-flex items-center gap-1">
                    <span className="w-1.2 h-1.2 rounded-full bg-emerald-400" />
                    {currentMeeting.action_updates?.length} closures
                  </span>
                )}
                <span className="font-mono tabular-nums text-zinc-400 text-[10px] lowercase bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-[4px]">
                  {currentMeeting.action_items.length} tasks
                </span>
              </div>
            )}
          </div>

          {/* Right: Primary Action Buttons */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            {/* Full Transcript Button */}
            <button
              onClick={() => setShowFullTranscriptModal(true)}
              disabled={!currentMeeting}
              className="px-3 py-1.5 rounded-[7px] text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.1] flex items-center gap-1.5 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Full Transcript</span>
            </button>

            {/* Live Listener Button */}
            <button
              onClick={() => setShowLiveListenerModal(true)}
              className="px-3 py-1.5 rounded-[7px] text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white border border-white/[0.1] flex items-center gap-2 transition shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Live Listener</span>
              <kbd className="ml-1 text-[10px] font-mono text-zinc-500 bg-white/[0.06] px-1.5 py-0.5 rounded-[4px] select-none font-normal">
                ⌘L
              </kbd>
            </button>

            {/* Ingest Meeting Button (High-Contrast Primary CTA) with ⌘I hint */}
            <button
              onClick={() => setShowIngestModal(true)}
              className="px-3.5 py-1.5 rounded-[7px] text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingest Meeting</span>
              <kbd className="ml-1 text-[10px] font-mono text-zinc-600 bg-black/10 px-1.5 py-0.5 rounded-[4px] select-none font-normal">
                ⌘I
              </kbd>
            </button>
          </div>
        </header>

        {/* ZONE C: 2-Column Main Workspace */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Column 1: Interactive Diarized Transcript */}
          <section className="w-[44%] flex-shrink-0 flex flex-col h-full bg-[#121314] border-r border-white/[0.07]">
            <TranscriptViewer
              turns={currentMeeting?.turns || []}
              activeTurnIndex={activeTurnIndex}
              onSelectTurn={(idx) => setActiveTurnIndex(idx)}
              isLoading={isLoading}
            />
          </section>

          {/* Column 2: Execution & Governance Staging Board */}
          <main className="flex-1 flex flex-col h-full bg-[#121314] overflow-hidden">
            {/* Synchronized Header: Exactly lines up horizontally with Column 1 Interactive Transcript */}
            <div className="h-12 px-6 border-b border-white/[0.07] flex items-center justify-between bg-inherit flex-shrink-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-xs font-medium text-zinc-300">
                  Institutional decisions
                </h2>
                {currentMeeting && (
                  <span className="text-[10px] font-mono tabular-nums text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
                    {currentMeeting.decisions.length + currentMeeting.action_items.length + (currentMeeting.action_updates?.length || 0)} items staged
                  </span>
                )}
              </div>
              {currentMeeting && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-mono text-[10px] text-zinc-400">
                    session: <span className="text-zinc-200">{currentMeeting.date}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Staging Body: High-Density Ledger Rows */}
            <div className="flex-1 overflow-y-auto">
              {!currentMeeting && !isLoading && (
                <div className="m-8 p-12 text-center border border-dashed border-white/[0.1] rounded-[8px] flex flex-col items-center justify-center space-y-3 bg-white/[0.01]">
                  <div className="w-10 h-10 rounded-[6px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-zinc-200">No meeting selected</h3>
                    <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                      Select a meeting from the sidebar or click <strong>"Ingest Meeting"</strong> (⌘I) to drop your transcript.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowIngestModal(true)}
                    className="px-3.5 py-1.5 bg-zinc-100 text-zinc-950 hover:bg-white rounded-[7px] text-xs font-medium flex items-center space-x-1.5 transition-all shadow-sm mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ingest meeting transcript</span>
                    <kbd className="ml-1 text-[10px] font-mono text-zinc-600 bg-black/10 px-1.5 py-0.5 rounded-[4px]">⌘I</kbd>
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="p-6 space-y-6">
                  {[1, 2, 3].map((section) => (
                    <div key={section} className="space-y-3 animate-pulse">
                      <div className="w-36 h-3 bg-white/[0.06] rounded-[4px]" />
                      <div className="border-y border-white/[0.06] divide-y divide-white/[0.06]">
                        {[1, 2].map((row) => (
                          <div key={row} className="py-4 px-5 flex items-start gap-4">
                            <div className="w-2 h-2 rounded-[2px] bg-white/[0.08] mt-1.5" />
                            <div className="flex-1 space-y-2">
                              <div className="w-48 h-3.5 bg-white/[0.05] rounded-[4px]" />
                              <div className="w-96 h-3 bg-white/[0.03] rounded-[4px]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentMeeting && !isLoading && (
                <div className="py-6 space-y-8">
                  {/* SECTION 1: CONFLICT RESOLUTION DIFF CARDS */}
                  {currentMeeting.conflicts && currentMeeting.conflicts.length > 0 && (
                    <div className="px-6 space-y-3">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xs font-medium text-rose-400">
                          Cross-meeting contradictions
                        </h3>
                        <span className="font-mono text-[10px] tabular-nums text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-[4px]">
                          {currentMeeting.conflicts.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {currentMeeting.conflicts.map((conflict) => (
                          <ConflictDiffCard
                            key={conflict.id}
                            conflict={conflict}
                            turns={currentMeeting.turns}
                            onResolve={(choice, text) => handleResolveConflict(conflict.id, choice, text)}
                            onHoverTurn={(idx) => setActiveTurnIndex(idx)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: EXTRACTED DECISIONS (Flush Divided Rows) */}
                  {currentMeeting.decisions && currentMeeting.decisions.length > 0 && (
                    <div className="space-y-2">
                      <div className="px-6 flex items-center space-x-2">
                        <h3 className="text-xs font-medium text-zinc-300">
                          Institutional decisions
                        </h3>
                        <span className="font-mono text-[10px] tabular-nums text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
                          {currentMeeting.decisions.length}
                        </span>
                      </div>

                      <div className="border-y border-white/[0.06] divide-y divide-white/[0.06] bg-white/[0.01]">
                        {currentMeeting.decisions.map((dec) => (
                          <div
                            key={dec.id}
                            onMouseEnter={() => {
                              const targetTurn = findMatchingTurnIndex(
                                {
                                  turn_index: dec.turn_index,
                                  verbatim_quote: dec.verbatim_quote,
                                  speaker: dec.speaker,
                                  statement: dec.statement,
                                },
                                currentMeeting.turns
                              );
                              setActiveTurnIndex(targetTurn);
                            }}
                            onMouseLeave={() => setActiveTurnIndex(null)}
                            className="px-6 py-3.5 flex items-start justify-between gap-4 hover:bg-[#1a1b1e] transition-colors"
                          >
                            <div className="flex items-start space-x-3 min-w-0 flex-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-[13.5px] text-zinc-100">
                                    {dec.statement}
                                  </span>
                                  <span className="font-mono text-[10px] lowercase text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5 rounded-[4px] shrink-0">
                                    {dec.topic ? dec.topic.replace(/_/g, ' ').toLowerCase() : 'decision'}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-zinc-500 font-mono tabular-nums">
                                  <span>{dec.speaker}</span>
                                  {dec.verbatim_quote && dec.verbatim_quote !== dec.statement && (
                                    <>
                                      <span>·</span>
                                      <span className="italic text-zinc-500 truncate max-w-lg">"{dec.verbatim_quote}"</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2.5: ACTION LIFECYCLE UPDATES & CLOSURES (Flush Divided Rows) */}
                  {currentMeeting.action_updates && currentMeeting.action_updates.length > 0 && (
                    <div className="space-y-2">
                      <div className="px-6 flex items-center space-x-2">
                        <h3 className="text-xs font-medium text-zinc-300">
                          Lifecycle updates &amp; closures
                        </h3>
                        <span className="font-mono text-[10px] tabular-nums text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
                          {currentMeeting.action_updates.length}
                        </span>
                      </div>

                      <div className="border-y border-white/[0.06] divide-y divide-white/[0.06] bg-white/[0.01]">
                        {currentMeeting.action_updates.map((upd) => {
                          const isClosed = upd.update_type === 'COMPLETED';
                          const isHandoff = upd.update_type === 'HANDED_OFF';

                          return (
                            <div
                              key={upd.id}
                              onMouseEnter={() => {
                                const targetTurn = findMatchingTurnIndex(
                                  {
                                    turn_index: upd.turn_index,
                                    verbatim_quote: upd.verbatim_quote,
                                    assignee: upd.assignee,
                                    speaker: upd.speaker,
                                    task: upd.task,
                                  },
                                  currentMeeting.turns
                                );
                                setActiveTurnIndex(targetTurn);
                              }}
                              onMouseLeave={() => setActiveTurnIndex(null)}
                              className="group px-6 py-3.5 flex items-start justify-between gap-4 hover:bg-[#1a1b1e] transition-colors"
                            >
                              <div className="flex items-start space-x-3 min-w-0 flex-1">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-[13.5px] text-zinc-100">
                                      {upd.task}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase shrink-0">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          isClosed ? 'bg-emerald-400' : isHandoff ? 'bg-purple-400' : 'bg-amber-400'
                                        }`}
                                      />
                                      <span
                                        className={
                                          isClosed
                                            ? 'text-emerald-400/90'
                                            : isHandoff
                                            ? 'text-purple-400/90'
                                            : 'text-amber-400/90'
                                        }
                                      >
                                        {isClosed ? 'closed' : isHandoff ? 'handoff' : 'modified'}
                                      </span>
                                    </span>
                                  </div>
                                  <p className="text-[13px] text-zinc-400 leading-relaxed font-normal">
                                    {upd.details}
                                  </p>
                                  <div className="flex items-center space-x-2 text-xs text-zinc-500 font-mono tabular-nums">
                                    <span>Assignee: <strong className="text-zinc-300 font-normal">{upd.assignee}</strong></span>
                                    {upd.previous_assignee && (
                                      <span>(from {upd.previous_assignee})</span>
                                    )}
                                    <span>·</span>
                                    <span>Reported by {upd.speaker}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => setShowActionLineageModal(true)}
                                className="opacity-0 group-hover:opacity-100 text-[11px] text-zinc-400 hover:text-white flex items-center space-x-1 font-mono transition-opacity shrink-0 pt-1"
                              >
                                <span>Audit lineage ↗</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION 3: STAGED ACTION ITEMS (Flush Divided Rows) */}
                  <div className="space-y-2">
                    <div className="px-6 flex items-center space-x-2">
                      <h3 className="text-xs font-medium text-zinc-300">
                        Staged action items
                      </h3>
                      <span className="font-mono text-[10px] tabular-nums text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
                        {currentMeeting.action_items.length}
                      </span>
                    </div>

                    {currentMeeting.action_items.length === 0 ? (
                      <div className="px-6 py-6 text-zinc-500 text-xs">
                        No action items extracted from this meeting.
                      </div>
                    ) : (
                      <div className="border-y border-white/[0.06] divide-y divide-white/[0.06] bg-white/[0.01]">
                        {currentMeeting.action_items.map((item) => (
                          <ActionItemRow
                            key={item.id}
                            item={item}
                            turns={currentMeeting.turns}
                            onToggle={handleToggleAction}
                            onUpdate={handleUpdateAction}
                            onHoverTurn={(idx) => setActiveTurnIndex(idx)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
          currentUser={currentUser}
          activeWorkspace={activeWorkspace}
          workspaces={workspaces}
          onSwitchWorkspace={async (wsId) => {
            setActiveWorkspaceId(wsId);
            const res = await api.getWorkspaces();
            setWorkspaces(res.workspaces);
            const found = res.workspaces.find((w: any) => w.id === wsId);
            if (found) setActiveWorkspace(found);
            refreshMeetings();
            showNotice('success', `Switched workspace to ${found?.name || wsId}`);
            setShowAuthModal(false);
          }}
          onSignOut={() => {
            handleSignOut();
            setShowAuthModal(false);
          }}
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

      {showFullTranscriptModal && (
        <FullTranscriptModal
          meeting={currentMeeting}
          onClose={() => setShowFullTranscriptModal(false)}
        />
      )}

      {showLedgerModal && <DecisionLedgerModal onClose={() => setShowLedgerModal(false)} />}

      {showActionLineageModal && (
        <ActionLineageModal
          onClose={() => setShowActionLineageModal(false)}
          onRefreshMeetings={refreshMeetings}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => {
            loadConfig();
            showNotice('success', 'Credentials and configuration synchronized!');
          }}
        />
      )}

      {/* Command Palette (⌘K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        meetings={meetings}
        onSelectMeeting={(id) => loadMeeting(id)}
        onOpenIngest={() => setShowIngestModal(true)}
        onOpenLiveListener={() => setShowLiveListenerModal(true)}
        onOpenLedger={() => setShowLedgerModal(true)}
        onOpenLineage={() => setShowActionLineageModal(true)}
        onOpenFullTranscript={() => setShowFullTranscriptModal(true)}
        onOpenDigest={handleOpenDigest}
        onOpenSettings={() => setShowSettingsModal(true)}
        onResetData={() => setShowCleanSlateModal(true)}
      />

      {/* Clean Slate Warning Modal */}
      {showCleanSlateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => !isClearingSlate && setShowCleanSlateModal(false)}
        >
          <div
            className="bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Clear all workspace data?
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  This will permanently erase all ingested meetings, diarized transcript turns, institutional decisions, and staged action items. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-white/[0.07]">
              <button
                type="button"
                disabled={isClearingSlate}
                onClick={() => setShowCleanSlateModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] rounded-[5px] font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingSlate}
                onClick={async () => {
                  setIsClearingSlate(true);
                  try {
                    await handleResetData();
                    setShowCleanSlateModal(false);
                  } finally {
                    setIsClearingSlate(false);
                  }
                }}
                className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-[6px] font-medium flex items-center space-x-1.5 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
              >
                {isClearingSlate ? 'Clearing database...' : 'Yes, Clean Slate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optimistic UI Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 bg-[#0a0a0c] border border-white/[0.12] rounded-[8px] px-4 py-2.5 text-xs text-zinc-200 shadow-2xl flex items-center space-x-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span>{undoToast.message}</span>
          <button
            onClick={undoToast.onUndo}
            className="text-xs font-mono font-medium text-zinc-300 hover:text-white underline ml-2"
          >
            Undo
          </button>
          <button
            onClick={() => setUndoToast(null)}
            className="text-zinc-500 hover:text-zinc-300 ml-1 text-sm leading-none"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};
export default App;

