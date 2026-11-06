import React, { useState } from 'react';
import { ConflictRecord, DiarizedTurn } from '../types';
import { CheckCircle2, ArrowRight, X, Edit3 } from 'lucide-react';
import { findMatchingTurnIndex } from '../utils/formatters';

interface Props {
  conflict: ConflictRecord;
  turns?: DiarizedTurn[];
  onResolve: (choice: 'OVERRIDE_PAST' | 'EDIT_NEW' | 'DISMISS', editedStatement?: string) => Promise<void>;
  onHoverTurn: (turnIndex: number | null) => void;
}

export const ConflictDiffCard: React.FC<Props> = ({ conflict, turns, onResolve, onHoverTurn }) => {
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

  const handleMouseEnter = () => {
    const targetTurn = findMatchingTurnIndex(
      {
        verbatim_quote: conflict.candidate_quote,
        statement: conflict.candidate_statement,
      },
      turns
    );
    onHoverTurn(targetTurn);
  };

  const badgeColor = {
    TIMELINE_SLIP: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    TECH_STACK_REVERSAL: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    POLICY_REVERSAL: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    OWNER_DISPUTE: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    DEPENDENCY_DEADLOCK: 'bg-red-500/10 text-red-400 border-red-500/20',
    CONTRACT_INVERSION: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }[conflict.conflict_type] || 'bg-rose-500/10 text-rose-400 border-rose-500/20';

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => onHoverTurn(null)}
      className={`rounded-[8px] border transition-all overflow-hidden ${
        conflict.resolved
          ? 'bg-white/[0.01] border-white/[0.07]'
          : 'bg-rose-950/10 border-rose-500/30'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-2 bg-[#0e0f11] border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`w-1.5 h-1.5 rounded-full ${conflict.resolved ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
          <span className="text-xs font-medium text-zinc-200">
            {conflict.resolved ? 'conflict resolved' : 'contradiction detected'}
          </span>
          <span className={`inline-flex items-center gap-1 font-mono text-[10px] lowercase px-1.5 py-0.5 rounded-[4px] border ${badgeColor}`}>
            <span className="w-1.2 h-1.2 rounded-full bg-current opacity-80" />
            <span>{conflict.conflict_type.replace(/_/g, ' ').toLowerCase()}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono tabular-nums text-zinc-500">
            {Math.round(conflict.confidence * 100)}% match
          </span>
          {conflict.resolved && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono lowercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-[4px]">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              <span>{conflict.resolution_choice?.replace(/_/g, ' ').toLowerCase()}</span>
            </span>
          )}
        </div>
      </div>

      {/* Side-by-side Git-style Diff */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Historical Side */}
          <div className="p-3 rounded-[6px] bg-[#0d0e10] border border-white/[0.07] text-xs space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
              <span className="lowercase text-amber-400/90 font-medium">prior institutional stance</span>
              <span>{conflict.historical_meeting_title}</span>
            </div>
            <p className="font-medium text-zinc-200">{conflict.historical_statement}</p>
            <p className="text-zinc-500 italic border-l-2 border-amber-500/30 pl-2 text-[11px]">
              "{conflict.historical_quote}"
            </p>
          </div>

          {/* Candidate Side */}
          <div className="p-3 rounded-[6px] bg-[#0d0e10] border border-white/[0.07] text-xs space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400 font-mono text-[10px]">
              <span className="lowercase text-rose-400/90 font-medium">new proposed stance</span>
              <span>current session</span>
            </div>
            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full bg-[#121314] border border-white/[0.15] rounded-[4px] p-1.5 text-zinc-200 text-xs focus:border-white/[0.3] outline-none"
                rows={2}
              />
            ) : (
              <p className="font-medium text-zinc-200">{conflict.candidate_quote}</p>
            )}
            <p className="text-zinc-500 italic border-l-2 border-rose-500/30 pl-2 text-[11px]">
              Evidence: "{conflict.candidate_quote}"
            </p>
          </div>
        </div>

        {/* Auditor Reasoning */}
        <div className="px-3 py-2 rounded-[6px] bg-white/[0.02] border border-white/[0.06] text-xs flex items-start space-x-2">
          <p className="text-zinc-400 leading-snug">
            <span className="text-zinc-200 font-medium font-mono text-[11px]">audit note: </span>
            {conflict.reasoning}
          </p>
        </div>

        {/* Action Buttons (Human-in-the-Loop Governance) */}
        {!conflict.resolved && (
          <div className="pt-1 flex items-center justify-end space-x-2">
            {isEditing ? (
              <>
                <button
                  disabled={isLoading}
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.04] rounded-[5px] font-medium"
                >
                  Cancel
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => handleAction('EDIT_NEW')}
                  className="px-3 py-1 text-xs bg-zinc-100 hover:bg-white text-zinc-950 rounded-[5px] font-medium flex items-center space-x-1"
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
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.04] hover:bg-white/[0.08] rounded-[5px] font-medium flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Discard</span>
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 text-xs text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-[5px] font-medium flex items-center space-x-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit stance</span>
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => handleAction('OVERRIDE_PAST')}
                  className="px-3 py-1 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-[5px] font-mono text-[11px] lowercase flex items-center space-x-1.5 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>override past decision</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

