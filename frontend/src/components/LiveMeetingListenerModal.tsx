import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Clock,
  Radio,
  CheckCircle2,
  X,
  AlertCircle,
  FileText,
  Sparkles,
  Trash2,
  Volume2
} from 'lucide-react';
import { api } from '../api';
import { DiarizedTurn } from '../types';
import { getMonogram } from '../utils/formatters';

interface Props {
  onClose: () => void;
  onIngestSuccess: (meetingId: string) => void;
}

const SAMPLE_MANAGER_SCRIPT = `Good morning everyone. I'm going to run through this week's key decisions and work assignments.
First, for our database architecture, we decided to stick with MongoDB for the next 6 months to avoid schema migration delays.
Second, marketing has moved up the launch, so our target release freeze is now November 5th.
David, I need you to take ownership of the user auth and JWT session migration by next week.
Sarah, you will run performance load testing on the checkout payment flow on Tuesday.
Maya, please design the dark mode Tailwind CSS theme for the marketing landing page by Friday.
Rahul, you will also add rate limiting to the login endpoint by Wednesday.
Alright, that's everything for today's sync. Let's get to work.`;

// In-browser 16-bit PCM WAV Encoder
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // 1 Channel (Mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16 bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export const LiveMeetingListenerModal: React.FC<Props> = ({ onClose, onIngestSuccess }) => {
  const [meetingTitle, setMeetingTitle] = useState('Sprint Standup & Architectural Allocation');
  const [isListening, setIsListening] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [turns, setTurns] = useState<DiarizedTurn[]>([]);
  const [interimText, setInterimText] = useState('');
  const [manualText, setManualText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'stream' | 'editor'>('stream');

  // Audio capture refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const elapsedSecondsRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const turnsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (turnsEndRef.current) {
      turnsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns, interimText]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startListening = async () => {
    setError(null);
    setStatusMessage(null);
    pcmChunksRef.current = [];

    try {
      // 1. Initialize Direct Microphone Audio Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);

      // Volume Analyser for visual feedback
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      // Raw PCM Audio Recorder Node (Captures direct audio regardless of browser network state)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!isListeningRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(inputData));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      audioContextRef.current = audioCtx;
      scriptProcessorRef.current = processor;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 2. Try Web Speech API in parallel (Live interim streaming)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
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
                  setTurns((prev) => [
                    ...prev,
                    {
                      turn_index: prev.length,
                      speaker: 'Speaker',
                      timestamp: formatTimer(elapsedSecondsRef.current),
                      text: trimmed,
                    }
                  ]);
                  setInterimText('');
                }
              } else {
                interim += transcript;
              }
            }
            setInterimText(interim);
          };

          recognition.onerror = (event: any) => {
            // If Web Speech API fails due to network/firewall, direct audio recording is still safely capturing!
            if (event.error === 'network') {
              setStatusMessage('Live speech text preview is offline on this network. Direct microphone audio recording is active and will be transcribed automatically on finish.');
            } else if (event.error !== 'no-speech') {
              console.warn('Speech recognition warning:', event.error);
            }
          };

          recognition.onend = () => {
            if (isListeningRef.current && recognitionRef.current) {
              try {
                recognition.start();
              } catch (e) {}
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('Web Speech API initialization fallback:', e);
        }
      }

      setIsListening(true);
      isListeningRef.current = true;

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          setRecordedDuration(prev + 1);
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(`Microphone access error: ${err.message || 'Permission denied'}. Please check microphone settings in your browser.`);
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const stopListening = () => {
    setIsListening(false);
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) {}
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
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
    setIsSubmitting(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. If turns or manual text already exist, ingest directly
      let allTurns: DiarizedTurn[] = [...turns];
      if (interimText.trim()) {
        allTurns.push({
          turn_index: allTurns.length,
          speaker: 'Speaker',
          timestamp: formatTimer(elapsedSeconds),
          text: interimText.trim(),
        });
        setInterimText('');
      }

      if (activeTab === 'editor' && manualText.trim()) {
        const lines = manualText.split('\n').filter((l) => l.trim().length > 0);
        allTurns = lines.map((line, idx) => ({
          turn_index: idx,
          speaker: 'Speaker',
          timestamp: `0${idx}:15`,
          text: line.trim()
        }));
      }

      if (allTurns.length > 0) {
        const res = await api.ingestMeeting({
          meeting_title: meetingTitle || 'Live Audio Sync',
          date: today,
          turns: allTurns,
        });
        onIngestSuccess(res.meeting_id);
        onClose();
        return;
      }

      // 2. If no text turns yet, encode recorded microphone PCM chunks to a real .wav file and transcribe via backend!
      if (pcmChunksRef.current.length > 0 && audioContextRef.current) {
        const totalSamples = pcmChunksRef.current.reduce((acc, c) => acc + c.length, 0);
        if (totalSamples > 0) {
          const allSamples = new Float32Array(totalSamples);
          let offset = 0;
          for (const chunk of pcmChunksRef.current) {
            allSamples.set(chunk, offset);
            offset += chunk.length;
          }

          const wavBlob = encodeWAV(allSamples, audioContextRef.current.sampleRate);
          const formData = new FormData();
          formData.append('file', wavBlob, 'live_speech_recording.wav');
          formData.append('meeting_title', meetingTitle || 'Live Voice Recording');
          formData.append('date', today);

          const res = await api.uploadMeeting(formData);
          onIngestSuccess(res.meeting_id);
          onClose();
          return;
        }
      }

      setError('No audio recorded or spoken turns detected yet. Speak into your microphone or paste a script.');
      setIsSubmitting(false);
    } catch (err: any) {
      setError(err.message || 'Audio transcription failed. You can use the "Quick-Load Manager Monologue" button to test the governance engine.');
      setIsSubmitting(false);
    }
  };

  const handleLoadSampleScript = () => {
    const lines = SAMPLE_MANAGER_SCRIPT.split('\n').filter((l) => l.trim().length > 0);
    const sampleTurns: DiarizedTurn[] = lines.map((line, idx) => ({
      turn_index: idx,
      speaker: 'Speaker',
      timestamp: `0${idx}:15`,
      text: line.trim()
    }));
    setTurns(sampleTurns);
    setManualText(SAMPLE_MANAGER_SCRIPT);
    setError(null);
    setStatusMessage(null);
  };

  const handleClearAll = () => {
    setTurns([]);
    setInterimText('');
    setManualText('');
    pcmChunksRef.current = [];
    setElapsedSeconds(0);
    setRecordedDuration(0);
    setError(null);
    setStatusMessage(null);
  };

  const hasContentToSubmit =
    turns.length > 0 ||
    interimText.trim().length > 0 ||
    manualText.trim().length > 0 ||
    pcmChunksRef.current.length > 0 ||
    recordedDuration > 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#050507] border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Live meeting listener
              </h2>
              <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px] border border-white/[0.06]">
                Dual-engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Direct microphone stream with automated speaker &amp; assignee attribution
            </p>
          </div>

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

        {/* Live Audio Control Bar */}
        <div className="px-6 py-3 bg-[#050507] border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="Meeting title..."
              className="bg-[#121314] border border-white/[0.08] rounded-[6px] px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] flex-1 max-w-sm transition"
            />

            {/* Timer & Live Volume Meter */}
            <div className="flex items-center space-x-2.5 bg-[#121314] border border-white/[0.08] px-2.5 py-1.5 rounded-[6px]">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="font-mono tabular-nums text-xs text-zinc-200">{formatTimer(elapsedSeconds)}</span>
              {isListening && (
                <div className="flex items-center space-x-1.5 pl-2 border-l border-white/[0.08]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Recording microphone" />
                  <div className="flex items-end space-x-0.5 h-3.5 w-10">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-emerald-400/80 rounded-t transition-all duration-75"
                        style={{
                          height: `${Math.max(20, (volumeLevel * (i * 0.2)) % 100)}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action & Control Buttons */}
          <div className="flex items-center space-x-2">
            {!isListening ? (
              <button
                type="button"
                onClick={startListening}
                className="px-3.5 py-1.5 rounded-[6px] text-xs font-medium bg-zinc-100 text-zinc-950 hover:bg-white flex items-center space-x-1.5 shadow-sm transition active:scale-[0.98]"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{recordedDuration > 0 ? 'Resume recording' : 'Start listening'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopListening}
                className="px-3 py-1.5 rounded-[6px] text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 flex items-center space-x-1.5 transition active:scale-[0.98]"
              >
                <Square className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span>Pause recording</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting || !hasContentToSubmit}
              onClick={handleFinishMeeting}
              className={`px-3.5 py-1.5 rounded-[6px] text-xs font-medium flex items-center space-x-1.5 transition active:scale-[0.98] ${
                hasContentToSubmit
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white shadow-sm'
                  : 'bg-white/[0.04] text-zinc-600 border border-white/[0.06] cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Transcribing & auditing...' : 'End & audit meeting'}</span>
            </button>
          </div>
        </div>

        {/* View Tabs & Quick Helper Tools */}
        <div className="px-6 py-2.5 bg-[#050507] border-b border-white/[0.07] flex items-center justify-between text-xs">
          <div className="flex items-center bg-[#000000] p-0.5 rounded-[6px] border border-white/[0.08] text-xs">
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-2.5 py-1 rounded-[5px] font-medium transition-all ${
                activeTab === 'stream'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Live stream ({turns.length})
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-2.5 py-1 rounded-[5px] font-medium transition-all ${
                activeTab === 'editor'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Notes editor
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleLoadSampleScript}
              className="px-2.5 py-1 rounded-[5px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-xs font-medium transition flex items-center space-x-1.5"
              title="Loads the 1-minute Manager Monologue script to test collision auditing immediately"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quick-load monologue</span>
            </button>

            {(turns.length > 0 || manualText.trim() || pcmChunksRef.current.length > 0) && (
              <button
                onClick={handleClearAll}
                className="text-xs text-zinc-500 hover:text-rose-400 px-2 py-1 transition flex items-center space-x-1"
                title="Clear current transcript & audio"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Status & Error Alerts */}
        <div className="flex-1 overflow-y-auto bg-[#121314]">
          {statusMessage && (
            <div className="m-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-[6px] text-amber-300 text-xs flex items-start space-x-2 animate-in fade-in">
              <Volume2 className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="m-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-[6px] text-rose-300 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start space-x-2 max-w-xl">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                <div>
                  <span className="font-medium text-rose-200">Notice: </span>
                  <span>{error}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleScript}
                className="px-3 py-1 rounded-[5px] bg-zinc-100 text-zinc-950 font-medium text-xs shadow-sm hover:bg-white transition flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load monologue &amp; test</span>
              </button>
            </div>
          )}

          {activeTab === 'stream' ? (
            <div className="h-full">
              {turns.length === 0 && !interimText && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                  <div className={`w-12 h-12 rounded-[8px] flex items-center justify-center mb-3 transition ${
                    isListening ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse' : 'bg-white/[0.04] border border-white/[0.08] text-zinc-400'
                  }`}>
                    <Mic className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-zinc-200">
                    {isListening ? 'Recording live microphone audio...' : 'Microphone ready'}
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                    {isListening
                      ? 'Speak freely into your microphone. Words stream live, and raw audio is recorded. Click "End & audit meeting" when done.'
                      : 'Click "Start listening" to speak, or use "Quick-load monologue" to test instant contradiction auditing.'}
                  </p>
                </div>
              )}

              <div className="divide-y divide-white/[0.04]">
                {turns.map((turn, i) => (
                  <div
                    key={i}
                    className="py-3 px-6 flex items-start gap-4 transition-colors hover:bg-[#1a1b1e]"
                  >
                    {/* Left Gutter: Monospace Tabular Timestamp */}
                    <div className="w-14 shrink-0 pt-0.5 select-none font-mono tabular-nums text-[11px] text-zinc-500">
                      {turn.timestamp}
                    </div>

                    {/* Main Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-[18px] h-[18px] rounded-[4px] bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-zinc-300 flex items-center justify-center shrink-0 select-none">
                            {getMonogram(turn.speaker)}
                          </span>
                          <span className="font-medium text-[13px] text-zinc-200">
                            {turn.speaker}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] tabular-nums text-zinc-600 select-none">
                          #{i + 1}
                        </span>
                      </div>
                      <p className="text-[13.5px] text-zinc-300 leading-relaxed font-normal mt-1">
                        {turn.text}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Real-time Interim Streaming Bubble */}
                {interimText && (
                  <div className="py-3 px-6 flex items-start gap-4 bg-white/[0.02] border-l-2 border-l-indigo-400">
                    <div className="w-14 shrink-0 pt-0.5 select-none font-mono tabular-nums text-[11px] text-indigo-400">
                      {formatTimer(elapsedSeconds)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs text-indigo-300 font-medium">Listening to speech...</span>
                      </div>
                      <p className="text-[13.5px] text-zinc-300 italic mt-1 leading-relaxed">
                        {interimText}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div ref={turnsEndRef} />
            </div>
          ) : (
            <div className="h-full p-6 flex flex-col space-y-2">
              <div className="text-xs text-zinc-400 flex items-center justify-between">
                <span>Direct speech notes / transcript input</span>
                <span className="text-[11px] font-mono text-zinc-500">One turn per line</span>
              </div>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste or type meeting speech lines here... (e.g. David, I need you to take ownership of user auth by next week)"
                className="flex-1 w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] p-4 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="px-6 py-2.5 bg-[#050507] border-t border-white/[0.07] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] text-zinc-400">
              {pcmChunksRef.current.length > 0 || isListening
                ? `Direct audio active (${recordedDuration}s). Click "End & audit meeting" to transcribe and audit.`
                : `${turns.length} turn(s) staged. SyncState will cross-audit every decision and task against institutional memory on finish.`}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
            {isListening ? 'RECORDING' : 'READY'}
          </span>
        </div>
      </div>
    </div>
  );
};
