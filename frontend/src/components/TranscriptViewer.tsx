import React from 'react';
import { DiarizedTurn } from '../types';
import { User, Clock, MessageSquare } from 'lucide-react';

interface Props {
  turns: DiarizedTurn[];
  activeTurnIndex: number | null;
  onSelectTurn: (index: number) => void;
}

export const TranscriptViewer: React.FC<Props> = ({ turns, activeTurnIndex, onSelectTurn }) => {
  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">Interactive Transcript</h2>
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded font-mono">
          {turns.length} turns
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {turns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p>No transcript turns loaded</p>
          </div>
        ) : (
          turns.map((turn) => {
            const isActive = activeTurnIndex === turn.turn_index;
            return (
              <div
                key={turn.turn_index}
                id={`turn-${turn.turn_index}`}
                onClick={() => onSelectTurn(turn.turn_index)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-950/30 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/50'
                    : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 font-medium text-zinc-300">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-semibold text-zinc-200">{turn.speaker}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-zinc-500 font-mono text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{turn.timestamp}</span>
                    <span className="ml-1 text-zinc-600">#{turn.turn_index}</span>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed font-sans pl-5 border-l-2 border-zinc-800/80">
                  {turn.text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

