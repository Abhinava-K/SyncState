import React, { useState } from 'react';
import { WeeklyDigestResponse } from '../types';
import { X, Copy, Check, User, Clock, AlertCircle, Calendar, ExternalLink } from 'lucide-react';

interface Props {
  digest: WeeklyDigestResponse | null;
  onClose: () => void;
}

export const WeeklyDigestModal: React.FC<Props> = ({ digest, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [viewMarkdown, setViewMarkdown] = useState(false);

  if (!digest) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(digest.markdown_summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
              <span>📊 Weekly Team Execution Digest & Reminders</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automated workload aggregation & upcoming deadline reminders per person
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMarkdown(!viewMarkdown)}
              className="px-3 py-1.5 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-colors"
            >
              {viewMarkdown ? 'Structured View' : 'Raw Markdown'}
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy for Slack/Email'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {viewMarkdown ? (
            <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {digest.markdown_summary}
            </pre>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {digest.members.map((member) => {
                const urgentReminders = member.reminders.filter((r) => r.urgency !== 'normal');
                return (
                  <div
                    key={member.assignee}
                    className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 hover:border-zinc-750 transition-all space-y-3"
                  >
                    {/* Member Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-zinc-200">{member.assignee}</h3>
                          <p className="text-[10px] text-zinc-500">
                            {member.decisions_count} decisions authored
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono bg-zinc-850 px-2 py-0.5 rounded text-zinc-300">
                        {member.active_tasks.length} active tasks
                      </span>
                    </div>

                    {/* Deadline Urgent Alerts */}
                    {urgentReminders.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Upcoming Deadline Alert (&lt;48h)</span>
                        </div>
                        {urgentReminders.map((rem, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded text-xs border flex items-center justify-between ${
                              rem.urgency === 'critical_24h'
                                ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            <span className="truncate pr-2 font-medium">{rem.task}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 flex-shrink-0">
                              {rem.deadline}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tasks List */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Current Commitments
                      </div>
                      {member.active_tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-2 rounded bg-zinc-900/60 border border-zinc-800 text-xs flex items-center justify-between"
                        >
                          <span className="text-zinc-300 truncate pr-2">{task.task}</span>
                          {task.external_issue_url ? (
                            <a
                              href={task.external_issue_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center space-x-1 flex-shrink-0"
                            >
                              <span>{task.external_issue_url.split('/').pop()}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-mono">Pending</span>
                          )}
                        </div>
                      ))}
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

