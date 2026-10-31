import React, { useState, useEffect } from 'react';
import { X, Database, GitCommit, CheckCircle2, AlertOctagon, Archive } from 'lucide-react';
import { api } from '../api';

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

  const filtered = decisions.filter((d) => {
    if (filter === 'ACTIVE') return d.status === 'ACTIVE';
    if (filter === 'SUPERSEDED') return d.status === 'SUPERSEDED';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-zinc-100">Institutional Decision Ledger</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Immutable cross-meeting memory and decision evolution history
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
              {(['ALL', 'ACTIVE', 'SUPERSEDED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    filter === tab
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">Loading decision ledger...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">No decisions found</div>
          ) : (
            filtered.map((dec) => (
              <div
                key={dec.id}
                className={`p-4 rounded-xl border transition-all ${
                  dec.status === 'ACTIVE'
                    ? 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    : 'bg-zinc-950/30 border-zinc-850 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {dec.topic}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      from <strong className="text-zinc-300">{dec.meeting_title}</strong> ({dec.meeting_date})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {dec.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ACTIVE</span>
                      </span>
                    ) : dec.status === 'SUPERSEDED' ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded">
                        <Archive className="w-3 h-3" />
                        <span>SUPERSEDED</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                        {dec.status}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm font-semibold text-zinc-200 mb-1">{dec.statement}</p>
                <p className="text-xs text-zinc-400 italic border-l-2 border-zinc-700 pl-2">
                  "{dec.verbatim_quote}"
                </p>

                {dec.superseded_by_id && (
                  <div className="mt-2 text-[11px] font-mono text-amber-400 flex items-center space-x-1">
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>Superseded by decision: {dec.superseded_by_id}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

