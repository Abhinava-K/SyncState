import React, { useState, useEffect } from 'react';
import { MeetingIngestResponse, DiarizedTurn } from '../types';
import { X, Search, Copy, Check, FileText } from 'lucide-react';
import { parseSpeaker } from '../utils/formatters';

interface Props {
  meeting: MeetingIngestResponse | null;
  onClose: () => void;
}

export const FullTranscriptModal: React.FC<Props> = ({ meeting, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'dialog' | 'raw'>('dialog');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!meeting) return null;

  const turns: DiarizedTurn[] = meeting.turns || [];

  // Filter turns by search term
  const filteredTurns = turns.filter((t) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.speaker.toLowerCase().includes(term) ||
      t.text.toLowerCase().includes(term) ||
      t.timestamp.toLowerCase().includes(term)
    );
  });

  // Calculate stats
  const totalWords = turns.reduce((acc, t) => acc + (t.text ? t.text.split(/\s+/).length : 0), 0);
  const uniqueSpeakers = Array.from(new Set(turns.map((t) => t.speaker))).length;

  // Build raw plaintext transcript
  const rawText = turns
    .map((t) => `[${t.timestamp}] ${t.speaker} (#${t.turn_index}):\n${t.text}\n`)
    .join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#050507]">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-1.5 text-zinc-300">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Full meeting transcript
                </h2>
              </div>
              <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
                uncut · verbatim
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {meeting.meeting_title} · {meeting.date}
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#000000] p-0.5 rounded-[6px] border border-white/[0.08] text-xs">
              <button
                onClick={() => setViewMode('dialog')}
                className={`px-2.5 py-1 rounded-[5px] font-medium transition-all ${
                  viewMode === 'dialog'
                    ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Dialog
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-2.5 py-1 rounded-[5px] font-medium transition-all ${
                  viewMode === 'raw'
                    ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Raw Text
              </button>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-[7px] text-xs font-medium flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
              title="Copy entire raw transcript to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy raw</span>
                </>
              )}
            </button>

            {/* Close Button with ESC hint */}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] rounded-[5px] transition-colors flex items-center space-x-1"
              title="Close modal (Escape)"
            >
              <X className="w-4 h-4" />
              <kbd className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 bg-white/[0.06] px-1.5 py-0.5 rounded-[4px] select-none ml-1">
                ESC
              </kbd>
            </button>
          </div>
        </div>

        {/* Subheader: Metadata and Search Bar */}
        <div className="px-6 py-2.5 border-b border-white/[0.06] bg-[#0c0d0f] flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-xs text-zinc-400 font-mono tabular-nums">
            <span>{turns.length} turns</span>
            <span>·</span>
            <span>{totalWords.toLocaleString()} words</span>
            <span>·</span>
            <span>{uniqueSpeakers} speakers</span>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter uncut transcript..."
              className="w-full bg-[#050507] border border-white/[0.08] focus:border-white/[0.2] rounded-[6px] pl-8 pr-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto bg-[#121314]">
          {viewMode === 'raw' ? (
            <div className="p-6">
              <pre className="p-4 rounded-[6px] bg-[#050507] border border-white/[0.08] font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed select-all">
                {rawText}
              </pre>
            </div>
          ) : filteredTurns.length === 0 ? (
            <div className="py-20 text-center text-xs text-zinc-500 font-mono">
              No matching transcript turns found for "{searchTerm}".
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredTurns.map((turn) => {
                const cleanName = turn.speaker.replace(/\(.*\)/, '').trim();
                const monogram = cleanName.slice(0, 2).toUpperCase() || 'SP';

                return (
                  <div
                    key={turn.turn_index}
                    className="py-3 px-6 flex items-start gap-4 hover:bg-[#1a1b1e] transition-colors"
                  >
                    {/* Timestamp */}
                    <div className="w-14 shrink-0 pt-0.5 select-none">
                      <span className="font-mono tabular-nums text-[11px] text-zinc-500">
                        {turn.timestamp}
                      </span>
                    </div>

                    {/* Turn Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-[18px] h-[18px] rounded-[4px] bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-zinc-300 flex items-center justify-center shrink-0 select-none">
                            {monogram}
                          </span>
                          <span className="text-[13px] font-medium text-zinc-200">
                            {turn.speaker}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-zinc-600 select-none">
                          #{turn.turn_index}
                        </span>
                      </div>

                      <p className="text-[13.5px] text-zinc-300 leading-relaxed font-normal mt-1 selection:bg-white/10 whitespace-pre-wrap">
                        {turn.text}
                      </p>
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

