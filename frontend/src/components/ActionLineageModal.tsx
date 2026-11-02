import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  GitBranch,
  Search,
  Sparkles,
  ArrowRight,
  User,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  GitCommit,
  ExternalLink,
  MessageSquare,
  Check,
  Zap,
  Filter
} from 'lucide-react';
import { api } from '../api';
import { ExtractedActionItem, ActionHistoryEvent, ActionLineageResponse } from '../types';

interface Props {
  onClose: () => void;
  onRefreshMeetings?: () => void;
}

export const ActionLineageModal: React.FC<Props> = ({ onClose, onRefreshMeetings }) => {
  const [data, setData] = useState<ActionLineageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RUNNING' | 'CLOSED' | 'BLOCKED'>('ALL');
  const [expandedActionIds, setExpandedActionIds] = useState<Record<string, boolean>>({});
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  const fetchLineage = async () => {
    setIsLoading(true);
    try {
      const res = await api.getActionLineage();
      setData(res);
      // Auto-expand all actions that have history
      const initialExpanded: Record<string, boolean> = {};
      res.actions.forEach((a) => {
        initialExpanded[a.id] = true;
      });
      setExpandedActionIds(initialExpanded);
    } catch (err) {
      console.error('Failed to load action lineage', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLineage();
  }, []);

  const handleToggleStatus = async (action: ExtractedActionItem) => {
    const nextStatus = action.status === 'RUNNING' ? 'CLOSED' : 'RUNNING';
    try {
      await api.updateActionStatus(action.id, nextStatus, undefined, `User toggled action to ${nextStatus}.`);
      setActionSuccessNotice(`Action "${action.task}" marked as ${nextStatus}!`);
      setTimeout(() => setActionSuccessNotice(null), 3500);
      await fetchLineage();
      if (onRefreshMeetings) onRefreshMeetings();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleSeedJourney = async () => {
    setIsSeeding(true);
    try {
      await api.seedActionLineageDemo();
      setActionSuccessNotice('Seeded 3-Meeting Journey (Alex -> Bobby) with cross-meeting transcript tracking!');
      setTimeout(() => setActionSuccessNotice(null), 4000);
      await fetchLineage();
      if (onRefreshMeetings) onRefreshMeetings();
    } catch (err: any) {
      alert(`Failed to seed journey: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedActionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredActions = (data?.actions || []).filter((a) => {
    const matchesStatus =
      statusFilter === 'ALL' ? true : a.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      a.task.toLowerCase().includes(query) ||
      a.assignee.toLowerCase().includes(query) ||
      (a.origin_meeting_title && a.origin_meeting_title.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans ring-1 ring-white/10 animate-in fade-in duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 shadow-inner">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Cross-Meeting Action Ledger & Lineage Tracker
                </h2>
                <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase">
                  Multi-Session Audit
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Tracks staged deliverables across meetings, modifications made over time, status changes, and team handoffs.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSeedJourney}
              disabled={isSeeding}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
              title="Test the user scenario: Meeting 1 (Alex creates) -> Meeting 2 (Alex modifies) -> Meeting 3 (Alex completes, Bobby inherits)"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>{isSeeding ? 'Seeding Journey...' : 'Seed 3-Meeting Journey (Alex → Bobby)'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Notice Banner */}
        {actionSuccessNotice && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}

        {/* Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-zinc-950/60 border-b border-zinc-800/80 shrink-0">
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono text-zinc-400">Total Tracked Actions</div>
              <div className="text-lg font-bold font-mono text-white">{data?.total_actions || 0}</div>
            </div>
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Running Actions</span>
              </div>
              <div className="text-lg font-bold font-mono text-emerald-400">{data?.running_count || 0}</div>
            </div>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono text-zinc-400">Closed / Completed</div>
              <div className="text-lg font-bold font-mono text-zinc-300">{data?.closed_count || 0}</div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono text-rose-400">Blocked / Pending</div>
              <div className="text-lg font-bold font-mono text-rose-400">{data?.blocked_count || 0}</div>
            </div>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-zinc-950/40 border-b border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            {(['ALL', 'RUNNING', 'CLOSED', 'BLOCKED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                  statusFilter === st
                    ? 'bg-zinc-800 text-white font-semibold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st === 'ALL' ? 'All Deliverables' : st}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by task, assignee (e.g. Alex, Bobby)..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition font-sans"
            />
          </div>
        </div>

        {/* Main Content Area: Transcript of Staged Actions */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center text-zinc-400 font-mono text-xs animate-pulse">
              Loading cross-meeting action lineage audit trail...
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">No actions found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No deliverables match your search criteria. Ingest a meeting transcript or click "Seed 3-Meeting Journey" above to simulate cross-meeting action tracking.
              </p>
            </div>
          ) : (
            filteredActions.map((action) => {
              const isExpanded = expandedActionIds[action.id] ?? true;
              const historyCount = action.history?.length || 0;

              return (
                <div
                  key={action.id}
                  className={`rounded-2xl border transition-all ${
                    action.status === 'RUNNING'
                      ? 'bg-zinc-900/80 border-indigo-500/30 shadow-lg shadow-indigo-950/20'
                      : action.status === 'CLOSED'
                      ? 'bg-zinc-900/40 border-zinc-800 opacity-90'
                      : 'bg-rose-950/10 border-rose-500/30'
                  }`}
                >
                  {/* Action Main Row */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      
                      {/* Status, Priority, & Origin Meeting Pills */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center space-x-1.5 ${
                            action.status === 'RUNNING'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : action.status === 'CLOSED'
                              ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              action.status === 'RUNNING' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                            }`}
                          />
                          <span>{action.status}</span>
                        </span>

                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Priority: {action.priority.toUpperCase()}
                        </span>

                        {action.origin_meeting_title && (
                          <span className="text-[11px] text-zinc-400 font-mono flex items-center space-x-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            <span>Origin: {action.origin_meeting_title}</span>
                            {action.origin_meeting_date && <span>({action.origin_meeting_date})</span>}
                          </span>
                        )}
                      </div>

                      {/* Task Title */}
                      <h3 className="text-sm font-semibold text-white tracking-tight pt-1">
                        {action.task}
                      </h3>

                      {/* Assignee & Predecessor Ribbon */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-0.5">
                        <span className="flex items-center space-x-1.5 text-zinc-300 font-medium bg-zinc-950/70 px-2 py-0.5 rounded border border-zinc-800">
                          <User className="w-3 h-3 text-indigo-400" />
                          <span>Assignee: <strong>{action.assignee}</strong></span>
                        </span>

                        {action.deadline && (
                          <span className="flex items-center space-x-1 font-mono text-[11px] text-zinc-400">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>Target: {action.deadline}</span>
                          </span>
                        )}

                        {action.parent_action_id && (
                          <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 flex items-center space-x-1">
                            <GitCommit className="w-3 h-3" />
                            <span>↳ Follow-up implementation linked to prior schema definition</span>
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Action Buttons: Toggle Status & Expand Timeline */}
                    <div className="flex items-center space-x-2.5 shrink-0 self-start md:self-center">
                      <button
                        onClick={() => handleToggleStatus(action)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-95 flex items-center space-x-1.5 ${
                          action.status === 'RUNNING'
                            ? 'bg-zinc-800 hover:bg-emerald-950/50 hover:text-emerald-300 border-zinc-700 text-zinc-200'
                            : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {action.status === 'RUNNING' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Mark as Closed</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Re-open Action</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => toggleExpand(action.id)}
                        className="p-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition text-xs flex items-center space-x-1"
                        title="Toggle Cross-Meeting Audit Transcript"
                      >
                        <span className="font-mono text-[11px] pr-1">{historyCount} events</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* EXPANDABLE CHRONOLOGICAL AUDIT TRANSCRIPT */}
                  {isExpanded && action.history && action.history.length > 0 && (
                    <div className="px-5 pb-5 pt-2 border-t border-zinc-800/80 bg-zinc-950/50 rounded-b-2xl">
                      <div className="text-[11px] uppercase font-mono font-semibold tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Cross-Meeting Evolution & Modification Audit Transcript</span>
                        </span>
                        <span className="text-zinc-500 text-[10px]">Indexed across all sessions</span>
                      </div>

                      <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                        {action.history.map((event, idx) => (
                          <div key={event.id || idx} className="relative group">
                            {/* Bullet Dot */}
                            <span
                              className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-zinc-950 ${
                                event.event_type === 'COMPLETED'
                                  ? 'bg-emerald-400'
                                  : event.event_type === 'MODIFIED'
                                  ? 'bg-amber-400'
                                  : event.event_type === 'HANDED_OFF'
                                  ? 'bg-purple-400'
                                  : 'bg-indigo-400'
                              }`}
                            />

                            {/* Event Card */}
                            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5 hover:border-zinc-700 transition">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                      event.event_type === 'COMPLETED'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : event.event_type === 'MODIFIED'
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        : event.event_type === 'HANDED_OFF'
                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                    }`}
                                  >
                                    {event.event_type}
                                  </span>

                                  <span className="font-semibold text-zinc-200">
                                    {event.meeting_title}
                                  </span>

                                  {event.meeting_date && (
                                    <span className="text-[10px] font-mono text-zinc-500">
                                      ({event.meeting_date})
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-mono text-zinc-400">
                                  Assignee: <strong className="text-zinc-200">{event.assignee}</strong>
                                  {event.previous_assignee && (
                                    <span className="text-zinc-500"> (Handed off from {event.previous_assignee})</span>
                                  )}
                                </div>
                              </div>

                              {/* Summary of Modification */}
                              <p className="text-xs text-zinc-300 font-sans">
                                {event.change_summary}
                              </p>

                              {/* Spoken Quote Evidence */}
                              {event.verbatim_quote && (
                                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-850 text-[11px] text-zinc-400 italic flex items-start space-x-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                                  <span>"{event.verbatim_quote}"</span>
                                </div>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-zinc-950 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>SQLite Multi-Session Action Lineage Ledger Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
          >
            Close Ledger
          </button>
        </div>

      </div>
    </div>
  );
};

