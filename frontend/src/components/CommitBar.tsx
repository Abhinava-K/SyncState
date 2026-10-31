import React from 'react';
import { Send, Lock, CheckCircle, ShieldAlert } from 'lucide-react';

interface Props {
  approvedCount: number;
  unresolvedConflictCount: number;
  trackerTarget: 'linear' | 'github';
  onTrackerChange: (target: 'linear' | 'github') => void;
  onCommit: () => Promise<void>;
  isCommitting: boolean;
}

export const CommitBar: React.FC<Props> = ({
  approvedCount,
  unresolvedConflictCount,
  trackerTarget,
  onTrackerChange,
  onCommit,
  isCommitting,
}) => {
  const isLocked = unresolvedConflictCount > 0;

  return (
    <div className="p-3.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between shadow-2xl">
      {/* Left: Tracker Target Toggle */}
      <div className="flex items-center space-x-3">
        <span className="text-xs text-zinc-400 font-medium">Post tasks to:</span>
        <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => onTrackerChange('linear')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              trackerTarget === 'linear'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Linear
          </button>
          <button
            onClick={() => onTrackerChange('github')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              trackerTarget === 'github'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            GitHub Issues
          </button>
        </div>
      </div>

      {/* Right: State & Dispatch Action */}
      <div className="flex items-center space-x-3">
        {isLocked ? (
          <div className="flex items-center space-x-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-lg">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 animate-pulse" />
            <span>Resolve {unresolvedConflictCount} conflict{unresolvedConflictCount > 1 ? 's' : ''} to unlock dispatch</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>All governance checks verified</span>
          </div>
        )}

        <button
          disabled={isLocked || isCommitting || approvedCount === 0}
          onClick={onCommit}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all shadow-md ${
            isLocked || approvedCount === 0
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-750'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 active:scale-[0.98]'
          }`}
        >
          {isLocked ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Dispatch Locked</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>
                {isCommitting
                  ? 'Dispatching...'
                  : `Approve & Dispatch ${approvedCount} Tasks (Cmd+Enter)`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

