import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../api';
import { ExtractedActionItem, ActionLineageResponse } from '../types';
import { humanizeTitle, getMonogram } from '../utils/formatters';

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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleToggleStatus = async (action: ExtractedActionItem) => {
    const nextStatus = action.status === 'RUNNING' ? 'CLOSED' : 'RUNNING';
    try {
      await api.updateActionStatus(action.id, nextStatus, undefined, `User toggled action to ${nextStatus}.`);
      setActionSuccessNotice(`Action marked as ${nextStatus}!`);
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
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Sentence Case, High-Contrast Action CTAs */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#050507]">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Action lineage
              </h2>
              <span className="font-mono text-[10px] tabular-nums text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
                {filteredActions.length} deliverables
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              disabled={isSeeding}
              onClick={handleSeedJourney}
              className="px-3 py-1.5 rounded-[6px] text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] transition shadow-sm active:scale-95"
            >
              {isSeeding ? 'Seeding...' : 'Seed 3-Meeting Journey'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] rounded-[5px] transition-colors flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <kbd className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 bg-white/[0.06] px-1.5 py-0.5 rounded-[4px] select-none ml-1">
                ESC
              </kbd>
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        {actionSuccessNotice && (
          <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}

        {/* High-Density Summary Strip: Monospace Tabular Nums */}
        <div className="px-6 py-2.5 bg-[#050507] border-b border-white/[0.07] flex items-center justify-between text-xs font-mono tabular-nums text-zinc-400">
          <div className="flex items-center space-x-6">
            <span>
              Total: <strong className="text-zinc-200">{data?.total_actions || 0}</strong>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>
                Running: <strong className="text-emerald-400">{data?.running_count || 0}</strong>
              </span>
            </span>
            <span>
              Closed: <strong className="text-zinc-200">{data?.closed_count || 0}</strong>
            </span>
            <span>
              Blocked: <strong className="text-rose-400">{data?.blocked_count || 0}</strong>
            </span>
          </div>

          <div className="text-[11px] text-zinc-500">
            Audit verification synced
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-[#000000] border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center bg-[#050507] p-0.5 rounded-[6px] border border-white/[0.08] text-xs">
            {(['ALL', 'RUNNING', 'CLOSED', 'BLOCKED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-[5px] text-xs font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st === 'ALL' ? 'All Deliverables' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by task or assignee..."
              className="w-full bg-[#050507] border border-white/[0.08] rounded-[6px] pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] transition"
            />
          </div>
        </div>

        {/* Main Content Area: Flush Divided Ledger Rows */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-4 flex items-start gap-3 animate-pulse border-b border-white/[0.04]">
                  <div className="w-2 h-2 rounded-[2px] bg-white/[0.06] mt-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-64 h-3.5 bg-white/[0.05] rounded-[4px]" />
                    <div className="w-96 h-3 bg-white/[0.03] rounded-[4px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <p className="text-xs text-zinc-400">No deliverables match filter criteria.</p>
              <p className="text-[11px] text-zinc-600 font-mono">
                Ingest meeting transcripts or click "Seed 3-Meeting Journey" above.
              </p>
            </div>
          ) : (
            <div className="border-y border-white/[0.06] divide-y divide-white/[0.06] bg-white/[0.01]">
              {filteredActions.map((action) => {
                const isExpanded = expandedActionIds[action.id] ?? true;
                const historyCount = action.history?.length || 0;
                const originInfo = action.origin_meeting_title
                  ? humanizeTitle(action.origin_meeting_title)
                  : null;

                const isRunning = action.status === 'RUNNING';
                const isClosed = action.status === 'CLOSED';

                return (
                  <div
                    key={action.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isClosed ? 'opacity-70' : 'opacity-100'
                    }`}
                  >
                    {/* Main Row */}
                    <div className="px-6 py-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                        {/* Status Square */}
                        <span
                          className={`w-1.5 h-1.5 rounded-[2px] mt-2 shrink-0 ${
                            isRunning
                              ? 'bg-emerald-400'
                              : isClosed
                              ? 'bg-zinc-600'
                              : 'bg-rose-400'
                          }`}
                        />

                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isRunning
                                    ? 'bg-emerald-400'
                                    : isClosed
                                    ? 'bg-zinc-600'
                                    : 'bg-rose-400'
                                }`}
                              />
                              <span
                                className={
                                  isRunning
                                    ? 'text-emerald-400/90'
                                    : isClosed
                                    ? 'text-zinc-500'
                                    : 'text-rose-400'
                                }
                              >
                                {action.status.toLowerCase()}
                              </span>
                            </span>

                            {action.priority && (
                              <>
                                <span className="text-zinc-600">·</span>
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-400 lowercase">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      action.priority === 'urgent'
                                        ? 'bg-rose-400'
                                        : action.priority === 'high'
                                        ? 'bg-amber-400'
                                        : action.priority === 'medium'
                                        ? 'bg-sky-400'
                                        : 'bg-zinc-500'
                                    }`}
                                  />
                                  <span>{action.priority}</span>
                                </span>
                              </>
                            )}

                            {originInfo && (
                              <>
                                <span className="text-zinc-600">·</span>
                                <span className="text-zinc-400 text-xs">
                                  Origin: <span className="text-zinc-300 font-medium">{originInfo.title}</span>
                                </span>
                                <span className="font-mono text-[10px] text-zinc-500">
                                  {originInfo.slug}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Task Title */}
                          <h3 className="text-[13.5px] font-medium text-zinc-100 leading-snug">
                            {action.task}
                          </h3>

                          {/* Assignee & Follow-up ribbon */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-mono tabular-nums pt-0.5">
                            <span>
                              Assignee: <strong className="text-zinc-300 font-normal">{action.assignee}</strong>
                            </span>

                            {action.deadline && (
                              <>
                                <span>·</span>
                                <span>Target: {action.deadline}</span>
                              </>
                            )}

                            {action.parent_action_id && (
                              <>
                                <span>·</span>
                                <span className="text-indigo-400/90">
                                  ↳ Linked to prior schema definition
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Toggle Status & Expand Timeline */}
                      <div className="flex items-center space-x-2 shrink-0 self-start md:self-center pl-5 md:pl-0">
                        <button
                          onClick={() => handleToggleStatus(action)}
                          className="px-2.5 py-1 rounded-[5px] text-xs font-medium border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 transition-colors flex items-center space-x-1.5"
                        >
                          {isRunning ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Mark Closed</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Re-open</span>
                            </>
                          )}
                        </button>

                        {historyCount > 0 && (
                          <button
                            onClick={() => toggleExpand(action.id)}
                            className="p-1 rounded-[5px] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Timeline Thread: Indented Continuous Thread Stream */}
                    {isExpanded && historyCount > 0 && (
                      <div className="px-6 pb-4 pt-1">
                        <div className="border-l-2 border-white/[0.08] ml-4 pl-4 space-y-3">
                          {action.history.map((ev, idx) => {
                            const isHandoff = ev.event_type === 'HANDOFF';
                            const isStatus = ev.event_type === 'STATUS_CHANGE';
                            const isCreated = ev.event_type === 'CREATED';
                            const meetingTitle = humanizeTitle(ev.meeting_title);
                            const monogram = getMonogram(ev.speaker);

                            return (
                              <div key={idx} className="space-y-1 text-xs">
                                <div className="flex items-center space-x-2">
                                  <span className="w-[18px] h-[18px] rounded-[4px] bg-white/[0.06] text-[10px] font-mono text-zinc-300 flex items-center justify-center shrink-0">
                                    {monogram}
                                  </span>
                                  <span className="text-zinc-200 font-medium">
                                    {ev.speaker || 'System Agent'}
                                  </span>
                                  <span className="text-zinc-600">·</span>
                                  <span className="text-zinc-400">
                                    {meetingTitle.title}
                                  </span>
                                  <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                                    {meetingTitle.slug}
                                  </span>
                                  <span className="text-zinc-600">·</span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono lowercase text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5 rounded-[4px]">
                                    <span
                                      className={`w-1 h-1 rounded-full ${
                                        isHandoff
                                          ? 'bg-purple-400'
                                          : isStatus
                                          ? 'bg-emerald-400'
                                          : 'bg-zinc-500'
                                      }`}
                                    />
                                    <span>{ev.event_type.replace(/_/g, ' ').toLowerCase()}</span>
                                  </span>
                                </div>

                                <p className="text-zinc-400 pl-6 leading-relaxed text-[12.5px]">
                                  {ev.note}
                                </p>

                                {ev.transcript_quote && ev.transcript_quote.trim() !== ev.note.trim() && (
                                  <p className="text-zinc-500 italic pl-6 text-[11px] border-l border-white/10 ml-6">
                                    "{ev.transcript_quote}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
