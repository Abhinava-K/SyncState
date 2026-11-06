import React from 'react';
import { Lock } from 'lucide-react';

interface Props {
  approvedCount: number;
  unresolvedConflictCount: number;
  trackerTarget?: 'linear' | 'github';
  onTrackerChange?: (target: 'linear' | 'github') => void;
  onCommit: () => Promise<void>;
  isCommitting: boolean;
}

export const CommitBar: React.FC<Props> = ({
  approvedCount,
  unresolvedConflictCount,
  onCommit,
  isCommitting,
}) => {
  const isLocked = unresolvedConflictCount > 0;

  return (
    <div className="h-14 px-6 bg-[#121314] border-t border-white/[0.07] flex items-center justify-between flex-shrink-0">
      {/* Left: Dispatch Target Badge */}
      <div className="flex items-center space-x-2.5">
        <span className="text-xs text-zinc-400 font-normal">Dispatch target:</span>
        <span className="font-mono text-[11px] text-zinc-300 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-[4px]">
          GitHub Issues
        </span>
      </div>

      {/* Right: Authoritative Monospace Status + High-Contrast Primary CTA */}
      <div className="flex items-center space-x-4">
        {isLocked && (
          <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono tabular-nums">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 animate-pulse" />
            <span className="text-rose-300">
              Dispatch locked · {unresolvedConflictCount} unresolved conflict{unresolvedConflictCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <button
          disabled={isLocked || isCommitting || approvedCount === 0}
          onClick={onCommit}
          className={`flex items-center text-xs transition-all shadow-sm ${
            isLocked || approvedCount === 0
              ? 'bg-white/[0.04] text-zinc-500 cursor-not-allowed border border-white/[0.06] rounded-[7px] px-3.5 py-1.5'
              : 'bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-[7px] px-3.5 py-1.5'
          }`}
        >
          {isLocked ? (
            <div className="flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Dispatch Locked</span>
            </div>
          ) : (
            <div className="flex items-center">
              <span>
                {isCommitting
                  ? 'Dispatching...'
                  : `Approve & Dispatch ${approvedCount} Task${approvedCount !== 1 ? 's' : ''}`}
              </span>
              <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-black/10 text-zinc-900 rounded-[4px] select-none font-normal">
                ⌘↵
              </kbd>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
