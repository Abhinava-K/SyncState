import React, { useState, useEffect } from 'react';
import { WeeklyDigestResponse } from '../types';
import { X, Copy, Check } from 'lucide-react';
import { getMonogram } from '../utils/formatters';

interface Props {
  digest: WeeklyDigestResponse | null;
  onClose: () => void;
}

export const WeeklyDigestModal: React.FC<Props> = ({ digest, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!digest) return null;

  const handleCopy = () => {
    const lines: string[] = [
      'Team Execution Digest',
      `Generated: ${new Date(digest.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      '',
    ];

    digest.members.forEach((m) => {
      lines.push(`${m.assignee}`);
      lines.push(`- Active Commitments: ${m.active_tasks.length} tasks`);
      lines.push(`- Decisions Authored: ${m.decisions_count} institutional decisions`);

      const urgentTasks = m.reminders.filter((r) => r.urgency === 'critical_24h' || r.urgency === 'upcoming_48h');
      if (urgentTasks.length > 0) {
        lines.push('- Upcoming Deadlines:');
        urgentTasks.forEach((u) => {
          const urgencyLabel = u.urgency === 'critical_24h' ? 'Due <24h' : 'Due <48h';
          lines.push(`  * [${urgencyLabel}] ${u.task} (Deadline: ${u.deadline})`);
        });
      }

      if (m.active_tasks.length > 0) {
        lines.push('- Task Breakdown:');
        m.active_tasks.forEach((t) => {
          const status = t.is_approved ? 'Verified' : 'Pending';
          lines.push(`  * [${status}] ${t.task} (${t.deadline || 'TBD'})`);
        });
      }

      lines.push('');
    });

    lines.push('---');
    lines.push('SyncState Meeting Governance Engine');

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Clean Sentence Case, High-Contrast Copy Button */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#050507]">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Weekly execution digest
            </h2>
            <span className="font-mono text-[10px] tabular-nums text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
              {digest.members.length} team members
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Copy CTA Button */}
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-[7px] text-xs font-medium flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy for Email</span>
                </>
              )}
            </button>

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

        {/* Content: Structured View */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {digest.members.map((member) => {
                const urgentReminders = member.reminders.filter((r) => r.urgency !== 'normal');
                const monogram = getMonogram(member.assignee);

                return (
                  <div
                    key={member.assignee}
                    className="p-4 rounded-[8px] bg-white/[0.015] border border-white/[0.07] hover:border-white/[0.12] transition-colors space-y-3"
                  >
                    {/* Member Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-[20px] h-[20px] rounded-[4px] bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-zinc-300 flex items-center justify-center shrink-0">
                          {monogram}
                        </span>
                        <div>
                          <h3 className="text-xs font-medium text-zinc-200">
                            {member.assignee}
                          </h3>
                          <p className="text-[10px] text-zinc-500 font-mono tabular-nums">
                            {member.decisions_count} decisions authored
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-[4px]">
                        {member.active_tasks.length} active tasks
                      </span>
                    </div>

                    {/* Upcoming Deadline Urgent Alerts */}
                    {urgentReminders.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase text-amber-400/90 flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>Deadline Warning (&lt;48h)</span>
                        </div>
                        {urgentReminders.map((rem, i) => (
                          <div
                            key={i}
                            className="text-xs text-zinc-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-[4px] space-y-0.5"
                          >
                            <p className="font-medium text-[12px]">{rem.task}</p>
                            <p className="text-[10px] text-zinc-400 font-mono tabular-nums">
                              Due: <strong className="text-amber-300 font-normal">{rem.deadline}</strong> ({rem.days_remaining}d remaining)
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Active Tasks List */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase text-zinc-500">
                        Active Tasks ({member.active_tasks.length})
                      </div>

                      {member.active_tasks.length === 0 ? (
                        <p className="text-[11px] text-zinc-600 font-mono italic">
                          No outstanding active tasks.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {member.active_tasks.map((task) => (
                            <div
                              key={task.id}
                              className="px-2.5 py-1.5 rounded-[4px] bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs text-zinc-300"
                            >
                              <span className="truncate pr-2 text-[12.5px] font-normal">{task.task}</span>
                              <div className="flex items-center space-x-1.5 shrink-0 text-[10px] font-mono tabular-nums">
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400 lowercase">
                                  <span
                                    className={`w-1.2 h-1.2 rounded-full ${
                                      task.priority === 'urgent'
                                        ? 'bg-rose-400'
                                        : task.priority === 'high'
                                        ? 'bg-amber-400'
                                        : 'bg-zinc-500'
                                    }`}
                                  />
                                  <span>{task.priority}</span>
                                </span>
                                {task.deadline && (
                                  <span className="text-zinc-500">
                                    {task.deadline}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    </div>
  );
};
