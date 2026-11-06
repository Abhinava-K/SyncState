import React, { useState } from 'react';
import { ExtractedActionItem, DiarizedTurn } from '../types';
import { CheckSquare, Square, ExternalLink } from 'lucide-react';
import { findMatchingTurnIndex } from '../utils/formatters';

interface Props {
  item: ExtractedActionItem;
  turns?: DiarizedTurn[];
  onToggle: (id: string, current: boolean) => void;
  onUpdate: (id: string, updates: Partial<ExtractedActionItem>) => void;
  onHoverTurn: (turnIndex: number | null) => void;
}

export const ActionItemRow: React.FC<Props> = ({ item, turns, onToggle, onUpdate, onHoverTurn }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [taskText, setTaskText] = useState(item.task);

  const handleSave = () => {
    setIsEditing(false);
    if (taskText !== item.task) {
      onUpdate(item.id, { task: taskText });
    }
  };

  const handleMouseEnter = () => {
    const targetTurn = findMatchingTurnIndex(
      {
        turn_index: item.turn_index,
        verbatim_quote: item.verbatim_quote,
        assignee: item.assignee,
        task: item.task,
      },
      turns
    );
    onHoverTurn(targetTurn);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => onHoverTurn(null)}
      className={`px-6 py-3 flex items-start justify-between gap-4 hover:bg-[#1a1b1e] transition-colors ${
        item.is_approved ? 'opacity-100' : 'opacity-40'
      }`}
    >
      <div className="flex items-start space-x-3 min-w-0 flex-1">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(item.id, item.is_approved)}
          className="mt-0.5 text-zinc-400 hover:text-white transition-colors focus:outline-none shrink-0"
        >
          {item.is_approved ? (
            <CheckSquare className="w-4 h-4 text-zinc-100" />
          ) : (
            <Square className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />
          )}
        </button>

        {/* Content */}
        <div className="space-y-1 min-w-0 flex-1">
          {isEditing ? (
            <input
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full bg-[#0d0e10] border border-white/[0.15] rounded-[5px] px-2 py-1 text-xs text-zinc-100 outline-none focus:border-white/[0.3]"
              autoFocus
            />
          ) : (
            <p
              onClick={() => setIsEditing(true)}
              className="text-[13.5px] font-medium text-zinc-100 leading-snug cursor-text hover:text-white transition-colors"
            >
              {item.task}
            </p>
          )}

          {/* Compact Inline Metadata: Minimalist Linear Dot + Monospace Text */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-mono tabular-nums">
            <span className="text-zinc-300 font-medium">
              {item.assignee}
            </span>

            {item.priority && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 lowercase">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.priority === 'urgent'
                        ? 'bg-rose-400'
                        : item.priority === 'high'
                        ? 'bg-amber-400'
                        : item.priority === 'medium'
                        ? 'bg-sky-400'
                        : 'bg-zinc-500'
                    }`}
                  />
                  <span>{item.priority}</span>
                </span>
              </>
            )}

            {item.deadline && (
              <>
                <span>·</span>
                <span className="text-zinc-400">
                  due {item.deadline}
                </span>
              </>
            )}

            {item.status && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium lowercase">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'CLOSED'
                        ? 'bg-emerald-400'
                        : item.status === 'BLOCKED'
                        ? 'bg-rose-400'
                        : 'bg-zinc-500'
                    }`}
                  />
                  <span
                    className={
                      item.status === 'CLOSED'
                        ? 'text-emerald-400/90'
                        : item.status === 'BLOCKED'
                        ? 'text-rose-400'
                        : 'text-zinc-400'
                    }
                  >
                    {item.status.toLowerCase()}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Status / External Link */}
      <div className="shrink-0 pt-0.5">
        {item.external_issue_url ? (
          <a
            href={item.external_issue_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span>{item.external_issue_url.split('/').pop()}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
};
