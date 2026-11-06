import React, { useEffect } from 'react';
import { DiarizedTurn } from '../types';

interface Props {
  turns: DiarizedTurn[];
  activeTurnIndex: number | null;
  onSelectTurn: (index: number) => void;
  isLoading?: boolean;
}

function parseSpeaker(speakerStr: string): { name: string; role?: string; monogram: string } {
  if (!speakerStr) return { name: 'Unknown', monogram: 'UN' };
  const match = speakerStr.match(/^(.*?)\s*\((.*?)\)$/);
  let name = speakerStr;
  let role: string | undefined = undefined;
  if (match) {
    name = match[1].trim();
    role = match[2].trim();
  }
  const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let monogram = 'SP';
  if (parts.length >= 2) {
    monogram = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    monogram = parts[0].substring(0, 2).toUpperCase();
  } else if (parts.length === 1) {
    monogram = parts[0][0].toUpperCase();
  }
  return { name, role, monogram };
}

export const TranscriptViewer: React.FC<Props> = ({
  turns,
  activeTurnIndex,
  onSelectTurn,
  isLoading,
}) => {
  useEffect(() => {
    if (activeTurnIndex !== null && activeTurnIndex !== undefined) {
      const el = document.getElementById(`turn-${activeTurnIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeTurnIndex]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Section Header: Synchronized h-12 with Column 2 */}
      <div className="h-12 px-6 border-b border-white/[0.07] flex items-center justify-between bg-inherit flex-shrink-0">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-medium text-zinc-300">
            Interactive transcript
          </h2>
          <span className="text-[10px] font-mono tabular-nums text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px]">
            {turns.length} turns
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 space-y-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="w-16 h-3 bg-white/[0.04] rounded-[4px] mt-1 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-[18px] h-[18px] rounded-[4px] bg-white/[0.06]" />
                    <div className="w-24 h-3 bg-white/[0.06] rounded-[4px]" />
                    <div className="w-16 h-3 bg-white/[0.03] rounded-[4px]" />
                  </div>
                  <div className="w-full h-8 bg-white/[0.03] rounded-[4px]" />
                </div>
              </div>
            ))}
          </div>
        ) : turns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs py-16">
            <p>No transcript turns loaded</p>
          </div>
        ) : (
          <div>
            {turns.map((turn) => {
              const isActive = activeTurnIndex === turn.turn_index;
              const { name, role, monogram } = parseSpeaker(turn.speaker);

              return (
                <div
                  key={turn.turn_index}
                  id={`turn-${turn.turn_index}`}
                  onClick={() => onSelectTurn(turn.turn_index)}
                  className={`py-3.5 px-6 border-b border-white/[0.04] transition-colors cursor-pointer flex items-start gap-4 ${
                    isActive
                      ? 'bg-[#1a1b1e] border-l-2 border-l-emerald-400 pl-[22px]'
                      : 'hover:bg-[#1a1b1e]'
                  }`}
                >
                  {/* Left Gutter: Monospace Tabular Timestamp */}
                  <div className="w-14 shrink-0 pt-0.5 select-none">
                    <span className="font-mono tabular-nums text-[11px] text-zinc-500">
                      {turn.timestamp}
                    </span>
                  </div>

                  {/* Main Column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-[18px] h-[18px] rounded-[4px] text-[10px] font-mono flex items-center justify-center shrink-0 select-none ${
                            isActive
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                              : 'bg-white/[0.06] border border-white/[0.08] text-zinc-300'
                          }`}
                        >
                          {monogram}
                        </span>
                        <span className={`text-[13px] ${isActive ? 'font-semibold text-white' : 'font-medium text-zinc-200'}`}>
                          {name}
                        </span>
                        {role && (
                          <span className="text-zinc-500 text-xs">
                            · {role}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] tabular-nums text-zinc-600 select-none">
                        #{turn.turn_index}
                      </span>
                    </div>

                    <p className={`text-[13.5px] leading-relaxed font-normal mt-1.5 selection:bg-emerald-500/30 ${
                      isActive ? 'text-zinc-100' : 'text-zinc-300'
                    }`}>
                      {turn.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Synchronized Bottom Bar: Exactly lines up horizontally with Column 2 CommitBar */}
      <div className="h-14 px-6 border-t border-white/[0.07] flex items-center justify-between bg-inherit flex-shrink-0">
        <div />
        <span className="font-mono text-[11px] tabular-nums text-zinc-500">
          {turns.length} turns
        </span>
      </div>
    </div>
  );
};
