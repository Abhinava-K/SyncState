import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Clock,
  Radio,
  CheckCircle2,
  X,
  Volume2,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';
import { DiarizedTurn } from '../types';

interface Props {
  onClose: () => void;
  onIngestSuccess: (meetingId: string) => void;
}

export const LiveMeetingListenerModal: React.FC<Props> = ({ onClose, onIngestSuccess }) => {
  const [meetingTitle, setMeetingTitle] = useState('Sprint Planning & Stack Alignment');
  const [isListening, setIsListening] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [turns, setTurns] = useState<DiarizedTurn[]>([]);
  const [interimText, setInterimText] = useState('');
  const [speakers, setSpeakers] = useState<string[]>([
    'Alex (Tech Lead)',
    'Rahul (Backend)',
    'Sarah (QA)',
    'Priya (Product)'
  ]);
  const [currentSpeaker, setCurrentSpeaker] = useState('Alex (Tech Lead)');
  const [newSpeakerInput, setNewSpeakerInput] = useState('');
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Audio & Speech Recognition refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const currentSpeakerRef = useRef(currentSpeaker);
  const turnsRef = useRef<DiarizedTurn[]>([]);
  const turnsEndRef = useRef<HTMLDivElement | null>(null);

  // Sync ref with state
  useEffect(() => {
    currentSpeakerRef.current = currentSpeaker;
  }, [currentSpeaker]);

  useEffect(() => {
    turnsRef.current = turns;
    if (turnsEndRef.current) {
      turnsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startListening = async () => {
    setError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge for $0.00 free live transcription.');
      return;
    }

    try {
      // 1. Microphone Audio Stream & Visualizer
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 2. Continuous Speech Recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            const trimmed = transcript.trim();
            if (trimmed) {
              const newTurn: DiarizedTurn = {
                turn_index: turnsRef.current.length,
                speaker: currentSpeakerRef.current,
                timestamp: formatTimer(elapsedSeconds),
                text: trimmed,
              };
              setTurns((prev) => [...prev, newTurn]);
              setInterimText('');
            }
          } else {
            interim += transcript;
          }
        }
        setInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition status:', event.error);
        }
      };

      // Auto-restart on continuous pause to guarantee non-stop 30+ minute meeting recording
      recognition.onend = () => {
        if (recognitionRef.current && isListening) {
          try {
            recognition.start();
          } catch (e) {
            // Already started or restarting
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError(`Microphone permission error: ${err.message || 'Access denied'}`);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setVolumeLevel(0);
  };

  const handleFinishMeeting = async () => {
    stopListening();

    // If interim text remained, commit as final turn
    let allTurns = [...turns];
    if (interimText.trim()) {
      allTurns.push({
        turn_index: allTurns.length,
        speaker: currentSpeaker,
        timestamp: formatTimer(elapsedSeconds),
        text: interimText.trim(),
      });
    }

    if (allTurns.length === 0) {
      setError('No spoken turns detected yet. Speak into your microphone before concluding.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.ingestMeeting({
        meeting_title: meetingTitle || 'Live Meeting Sync',
        date: today,
        turns: allTurns,
      });

      onIngestSuccess(res.meeting_id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit live meeting to governance pipeline.');
      setIsSubmitting(false);
    }
  };

  const handleAddSpeaker = () => {
    if (newSpeakerInput.trim() && !speakers.includes(newSpeakerInput.trim())) {
      const added = newSpeakerInput.trim();
      setSpeakers([...speakers, added]);
      setCurrentSpeaker(added);
      setNewSpeakerInput('');
      setShowAddSpeaker(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${isListening ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
              <Radio className={`w-5 h-5 ${isListening ? 'animate-pulse text-rose-500' : ''}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-zinc-100">In-Meeting Live Voice Listener</h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  $0.00 Free Tier Native
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Zero API fee continuous speech recognition with institutional memory conflict auditing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Audio & Control Bar */}
        <div className="px-6 py-3 bg-zinc-950/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1">
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="Meeting Title..."
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 flex-1 max-w-md"
            />

            {/* Timer & Volume Status */}
            <div className="flex items-center space-x-3 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span className="font-mono text-sm text-zinc-200">{formatTimer(elapsedSeconds)}</span>
              {isListening && (
                <div className="flex items-center space-x-1 pl-2 border-l border-zinc-800">
                  <div
                    className="w-2 h-2 rounded-full bg-rose-500 animate-ping"
                    title="Live Recording"
                  />
                  <div className="flex items-end space-x-0.5 h-4 w-12">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-emerald-400 rounded-t transition-all duration-75"
                        style={{
                          height: `${Math.max(15, (volumeLevel * (i * 0.2)) % 100)}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {!isListening ? (
              <button
                type="button"
                onClick={startListening}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-600/20 transition active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>Start Listening</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopListening}
                className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-sm font-medium transition"
              >
                <Square className="w-4 h-4 text-amber-400" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              disabled={turns.length === 0 && !interimText || isSubmitting}
              onClick={handleFinishMeeting}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-600/20 transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Auditing Meeting...' : 'End & Run Governance Audit'}</span>
            </button>
          </div>
        </div>

        {/* Speaker Selector Strip */}
        <div className="px-6 py-2.5 bg-zinc-950/20 border-b border-zinc-800/80 flex items-center space-x-2 overflow-x-auto text-xs">
          <span className="text-zinc-400 uppercase font-mono tracking-wider flex items-center space-x-1 pr-2">
            <Users className="w-3.5 h-3.5 mr-1" />
            Speaking Now:
          </span>
          {speakers.map((s) => (
            <button
              key={s}
              onClick={() => setCurrentSpeaker(s)}
              className={`px-3 py-1 rounded-full transition font-medium whitespace-nowrap ${
                currentSpeaker === s
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-400'
                  : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60'
              }`}
            >
              {s}
            </button>
          ))}

          {!showAddSpeaker ? (
            <button
              onClick={() => setShowAddSpeaker(true)}
              className="text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded text-xs hover:bg-zinc-800 transition"
            >
              + Add Speaker
            </button>
          ) : (
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={newSpeakerInput}
                onChange={(e) => setNewSpeakerInput(e.target.value)}
                placeholder="Name..."
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-200 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSpeaker()}
              />
              <button
                onClick={handleAddSpeaker}
                className="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs font-medium"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddSpeaker(false)}
                className="text-zinc-400 hover:text-zinc-200 px-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Live Transcript Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-950/20">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {turns.length === 0 && !interimText && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <div className="w-16 h-16 rounded-full bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center mb-4 text-zinc-400">
                <Mic className="w-8 h-8" />
              </div>
              <p className="text-base font-medium text-zinc-300">Ready to listen to your meeting</p>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Click <strong>"Start Listening"</strong> and talk freely. Words will stream in real time, segmented by speaker and timestamped automatically.
              </p>
            </div>
          )}

          {turns.map((turn, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-indigo-400">{turn.speaker}</span>
                <span className="font-mono text-[11px] text-zinc-500">{turn.timestamp}</span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed">{turn.text}</p>
            </div>
          ))}

          {/* Real-time Interim Streaming Bubble */}
          {interimText && (
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 animate-pulse">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-indigo-300">{currentSpeaker} (Speaking...)</span>
                <span className="font-mono text-[11px] text-indigo-400">{formatTimer(elapsedSeconds)}</span>
              </div>
              <p className="text-sm text-zinc-300 italic">{interimText}</p>
            </div>
          )}

          <div ref={turnsEndRef} />
        </div>

        {/* Footer Guidance */}
        <div className="px-6 py-3 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>
              Captured <strong>{turns.length}</strong> speaker turn(s). SyncState will cross-audit every decision and task against institutional memory on finish.
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {isListening ? 'Streaming Speech • Active' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
};
