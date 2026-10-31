import React, { useState } from 'react';
import { ConflictRecord } from '../types';
import { AlertTriangle, CheckCircle2, ArrowRight, Sparkles, X, Edit3, ShieldAlert } from 'lucide-react';

interface Props {
  conflict: ConflictRecord;
  onResolve: (choice: 'OVERRIDE_PAST' | 'EDIT_NEW' | 'DISMISS', editedStatement?: string) => Promise<void>;
  onHoverTurn: (turnIndex: number | null) => void;
}

export const ConflictDiffCard: React.FC<Props> = ({ conflict, onResolve, onHoverTurn }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(conflict.candidate_quote);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (choice: 'OVERRIDE_PAST' | 'EDIT_NEW' | 'DISMISS') => {
    setIsLoading(true);
    try {
      await onResolve(choice, choice === 'EDIT_NEW' ? editedText : undefined);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const badgeColor = {
    TIMELINE_SLIP: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    TECH_STACK_REVERSAL: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    POLICY_REVERSAL: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    OWNER_DISPUTE: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  }[conflict.conflict_type] || 'bg-rose-500/10 text-rose-400 border-rose-500/30';

  return (
    <div
      onMouseEnter={() => onHoverTurn(0)}
      onMouseLeave={() => onHoverTurn(null)}
      className={`rounded-xl border transition-all overflow-hidden ${
        conflict.resolved
          ? 'bg-zinc-900/40 border-emerald-500/30'
          : 'bg-rose-950/20 border-rose-500/40 shadow-[0_4px_20px_rgba(244,63,94,0.08)]'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {conflict.resolved ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            {conflict.resolved ? 'Conflict Resolved' : 'Contradiction Detected'}
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
            {conflict.conflict_type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
            {Math.round(conflict.confidence * 100)}% match
          </span>
          {conflict.resolved && (
            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
              {conflict.resolution_choice}
            </span>
          )}
        </div>
      </div>

      {/* Side-by-side Git-style Diff */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Historical Side */}
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
              <span className="uppercase text-amber-400/90 font-semibold">Past Institutional Decision</span>
              <span>{conflict.historical_meeting_title}</span>
            </div>
            <p className="font-semibold text-zinc-200">{conflict.historical_statement}</p>
            <p className="text-zinc-400 italic border-l-2 border-amber-500/40 pl-2 text-[11px]">
              "{conflict.historical_quote}"
            </p>
          </div>

          {/* Candidate Side */}
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-rose-500/30 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
              <span className="uppercase text-rose-400 font-semibold">New Proposed Stance</span>
              <span>Current Meeting</span>
            </div>
            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded p-1.5 text-zinc-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                rows={2}
              />
            ) : (
              <p className="font-semibold text-zinc-200">{conflict.candidate_quote}</p>
            )}
            <p className="text-zinc-400 italic border-l-2 border-rose-500/40 pl-2 text-[11px]">
              Evidence: "{conflict.candidate_quote}"
            </p>
          </div>
        </div>

        {/* Auditor Reasoning */}
        <div className="px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs flex items-start space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-zinc-300 leading-snug">
            <strong className="text-indigo-300 font-medium">Agent Audit: </strong>
            {conflict.reasoning}
          </p>
        </div>

        {/* Action Buttons (Human-in-the-Loop Governance) */}
        {!conflict.resolved && (
          <div className="pt-2 flex items-center justify-end space-x-2">
            {isEditing ? (
              <>
                <button
                  disabled={isLoading}
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => handleAction('EDIT_NEW')}
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save & Conform</span>
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={isLoading}
                  onClick={() => handleAction('DISMISS')}
                  className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 rounded font-medium flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Discard Candidate</span>
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded font-medium flex items-center space-x-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Stance</span>
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => handleAction('OVERRIDE_PAST')}
                  className="px-3 py-1.5 text-xs bg-rose-600/90 hover:bg-rose-600 text-white rounded font-medium flex items-center space-x-1 shadow-sm"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Override Past Decision</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

