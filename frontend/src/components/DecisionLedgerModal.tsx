import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../api';
import { humanizeTitle } from '../utils/formatters';

interface Props {
  onClose: () => void;
}

export const DecisionLedgerModal: React.FC<Props> = ({ onClose }) => {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'SUPERSEDED'>('ALL');

  useEffect(() => {
    api.getDecisionLedger()
      .then((data) => setDecisions(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filtered = decisions.filter((d) => {
    if (filter === 'ACTIVE') return d.status === 'ACTIVE';
    if (filter === 'SUPERSEDED') return d.status === 'SUPERSEDED';
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Sentence case */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#050507]">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Decision ledger
            </h2>
            <span className="font-mono text-[10px] tabular-nums text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
              {filtered.length} decisions
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Filter Tabs */}
            <div className="flex items-center bg-[#000000] p-0.5 rounded-[6px] border border-white/[0.08] text-xs">
              {(['ALL', 'ACTIVE', 'SUPERSEDED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2.5 py-1 rounded-[5px] font-medium transition-all ${
                    filter === tab
                      ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Close Button with ESC hint */}
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

        {/* Content: High-Density Flush Divided Ledger Rows */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-3 flex items-start gap-3 animate-pulse border-b border-white/[0.04]">
                  <div className="w-2 h-2 rounded-[2px] bg-white/[0.06] mt-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-48 h-3.5 bg-white/[0.05] rounded-[4px]" />
                    <div className="w-full h-3 bg-white/[0.03] rounded-[4px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500 font-mono">
              No decisions found matching filter.
            </div>
          ) : (
            <div className="border-y border-white/[0.06] divide-y divide-white/[0.06] bg-white/[0.01]">
              {filtered.map((dec) => {
                const meetingInfo = humanizeTitle(dec.meeting_title);
                const isQuoteDuplicate =
                  !dec.verbatim_quote ||
                  dec.verbatim_quote.trim().toLowerCase() === dec.statement.trim().toLowerCase();

                return (
                  <div
                    key={dec.id}
                    className={`px-6 py-4 flex items-start justify-between gap-5 hover:bg-white/[0.02] transition-colors ${
                      dec.status === 'ACTIVE' ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        {/* Metadata line: Topic + Meeting Title + Date */}
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="font-mono text-[10px] lowercase text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5 rounded-[4px] shrink-0">
                            {dec.topic ? dec.topic.replace(/_/g, ' ').toLowerCase() : 'decision'}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="text-zinc-300 font-medium truncate max-w-xs">
                            {meetingInfo.title}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                            {meetingInfo.slug}
                          </span>
                          <span className="text-zinc-600">·</span>
                          <span className="font-mono text-[11px] text-zinc-500 tabular-nums shrink-0">
                            {dec.meeting_date}
                          </span>
                        </div>

                        {/* Statement: Shown once clearly with high typographic craft */}
                        <p className="text-[13.5px] font-medium text-zinc-100 leading-snug">
                          {dec.statement}
                        </p>

                        {/* Distinct source quote only if not identical to statement */}
                        {!isQuoteDuplicate && (
                          <p className="text-xs text-zinc-500 italic pl-2.5 border-l-2 border-white/10 mt-1">
                            "{dec.verbatim_quote}"
                          </p>
                        )}

                        {/* Superseded lineage link */}
                        {dec.superseded_by_id && (
                          <div className="pt-0.5 text-xs font-mono text-zinc-500 flex items-center space-x-1.5">
                            <span className="text-zinc-600">↳</span>
                            <span className="text-amber-400/90 lowercase">
                              superseded by {dec.superseded_by_id}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Linear Ghost Dot Indicator */}
                    <div className="shrink-0 pt-0.5">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dec.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-zinc-600'
                          }`}
                        />
                        <span
                          className={
                            dec.status === 'ACTIVE' ? 'text-emerald-400/90' : 'text-zinc-500'
                          }
                        >
                          {dec.status.toLowerCase()}
                        </span>
                      </span>
                    </div>
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
