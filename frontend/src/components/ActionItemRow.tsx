import React, { useState } from 'react';
import { ExtractedActionItem } from '../types';
import { CheckSquare, Square, User, Calendar, ExternalLink, Flag } from 'lucide-react';

interface Props {
  item: ExtractedActionItem;
  onToggle: (id: string, current: boolean) => void;
  onUpdate: (id: string, updates: Partial<ExtractedActionItem>) => void;
  onHoverTurn: (turnIndex: number | null) => void;
}

export const ActionItemRow: React.FC<Props> = ({ item, onToggle, onUpdate, onHoverTurn }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [taskText, setTaskText] = useState(item.task);

  const priorityStyles = {
    urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    medium: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    low: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  }[item.priority || 'medium'];

  const handleSave = () => {
    setIsEditing(false);
    if (taskText !== item.task) {
      onUpdate(item.id, { task: taskText });
    }
  };

  return (
    <div
      onMouseEnter={() => onHoverTurn(item.turn_index)}
      onMouseLeave={() => onHoverTurn(null)}
      className={`p-3 rounded-lg border transition-all flex items-start space-x-3 ${
        item.is_approved
          ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
          : 'bg-zinc-950/40 border-zinc-900 opacity-60'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, item.is_approved)}
        className="mt-0.5 text-zinc-400 hover:text-indigo-400 transition-colors focus:outline-none"
      >
        {item.is_approved ? (
          <CheckSquare className="w-4 h-4 text-indigo-400" />
        ) : (
          <Square className="w-4 h-4 text-zinc-600" />
        )}
      </button>

      {/* Main Content */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
        ) : (
          <p
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium text-zinc-200 leading-snug cursor-text hover:text-white"
          >
            {item.task}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
          {/* Assignee */}
          <div className="flex items-center space-x-1 bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300 font-medium">
            <User className="w-3 h-3 text-indigo-400" />
            <span>{item.assignee}</span>
          </div>

          {/* Status Pill */}
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-semibold flex items-center space-x-1 ${
            item.status === 'CLOSED'
              ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
              : item.status === 'BLOCKED'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'CLOSED' ? 'bg-zinc-500' : 'bg-emerald-400 animate-pulse'}`} />
            <span>{item.status || 'RUNNING'}</span>
          </span>

          {/* Deadline */}
          {item.deadline && (
            <div className="flex items-center space-x-1 bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300 font-mono">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>{item.deadline}</span>
            </div>
          )}

          {/* Priority */}
          <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase font-mono ${priorityStyles}`}>
            {item.priority}
          </span>

          {/* External Synced Ticket */}
          {item.external_issue_url ? (
            <a
              href={item.external_issue_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors font-mono"
            >
              <span>{item.external_issue_url.split('/').pop()}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-zinc-500 text-[10px] italic">Ready to Dispatch</span>
          )}
        </div>
      </div>
    </div>
  );
};

