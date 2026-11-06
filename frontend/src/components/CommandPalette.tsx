import React, { useState, useEffect, useRef } from 'react';
import { MeetingSummaryItem } from '../types';
import { Search, Folder, Plus, Mic, Database, GitBranch, BarChart2, Settings, Trash2, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  meetings: MeetingSummaryItem[];
  onSelectMeeting: (id: string) => void;
  onOpenIngest: () => void;
  onOpenLiveListener: () => void;
  onOpenLedger: () => void;
  onOpenLineage: () => void;
  onOpenDigest: () => void;
  onOpenSettings: () => void;
  onOpenFullTranscript?: () => void;
  onResetData: () => void;
}

export const CommandPalette: React.FC<Props> = ({
  isOpen,
  onClose,
  meetings,
  onSelectMeeting,
  onOpenIngest,
  onOpenLiveListener,
  onOpenLedger,
  onOpenLineage,
  onOpenDigest,
  onOpenSettings,
  onOpenFullTranscript,
  onResetData,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(query.toLowerCase())
  );

  const actions = [
    {
      id: 'ingest',
      label: 'Ingest Meeting Transcript',
      shortcut: '⌘I',
      icon: Plus,
      action: () => {
        onClose();
        onOpenIngest();
      },
    },
    {
      id: 'listener',
      label: 'Start Live Voice Listener',
      shortcut: '⌘L',
      icon: Mic,
      action: () => {
        onClose();
        onOpenLiveListener();
      },
    },
    {
      id: 'full-transcript',
      label: 'View Full Meeting Transcript',
      shortcut: '',
      icon: FileText,
      action: () => {
        onClose();
        if (onOpenFullTranscript) onOpenFullTranscript();
      },
    },
    {
      id: 'ledger',
      label: 'Open Memory Ledger',
      shortcut: '',
      icon: Database,
      action: () => {
        onClose();
        onOpenLedger();
      },
    },
    {
      id: 'lineage',
      label: 'Audit Action Lineage',
      shortcut: '',
      icon: GitBranch,
      action: () => {
        onClose();
        onOpenLineage();
      },
    },
    {
      id: 'digest',
      label: 'Generate Weekly Digest',
      shortcut: '',
      icon: BarChart2,
      action: () => {
        onClose();
        onOpenDigest();
      },
    },
    {
      id: 'settings',
      label: 'Configure Settings & Credentials',
      shortcut: '',
      icon: Settings,
      action: () => {
        onClose();
        onOpenSettings();
      },
    },
    {
      id: 'reset',
      label: 'Wipe Database Clean (Clean Slate)',
      shortcut: '',
      icon: Trash2,
      action: () => {
        onClose();
        onResetData();
      },
    },
  ].filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/[0.08] space-x-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search meetings, actions, commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-white/[0.06] rounded-[4px] select-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredMeetings.length > 0 && (
            <div className="px-2 py-1 text-[10px] font-mono uppercase text-zinc-500">
              Meetings
            </div>
          )}
          {filteredMeetings.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => {
                onSelectMeeting(m.id);
                onClose();
              }}
              className="w-full px-3 py-2 text-left rounded-[6px] hover:bg-white/[0.04] text-xs text-zinc-200 flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Folder className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
                <span className="truncate">{m.title}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-zinc-500">{m.date}</span>
                <kbd className="text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
                  {idx + 1}
                </kbd>
              </div>
            </button>
          ))}

          {actions.length > 0 && (
            <div className="px-2 pt-2 pb-1 text-[10px] font-mono uppercase text-zinc-500">
              Quick Actions
            </div>
          )}
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={act.action}
                className="w-full px-3 py-2 text-left rounded-[6px] hover:bg-white/[0.04] text-xs text-zinc-200 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
                  <span>{act.label}</span>
                </div>
                {act.shortcut && (
                  <kbd className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
                    {act.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}

          {filteredMeetings.length === 0 && actions.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">
              No results found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

