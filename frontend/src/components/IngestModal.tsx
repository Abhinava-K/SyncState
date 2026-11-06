import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Sparkles, AlertTriangle, Mic, MicOff, FileUp, CheckCircle } from 'lucide-react';
import { api } from '../api';

interface Props {
  onClose: () => void;
  onIngestSuccess: (meetingId: string) => void;
}

const SAMPLE_MEETING_2 = {
  meeting_title: "Sprint Planning & Stack Check (Meeting 2)",
  date: "2026-10-24",
  raw_text: `Sam (01:20): Given our sprint velocity, let's stick with MongoDB for the next 6 months to avoid schema migration delays.
Priya (02:45): The marketing campaign has been brought forward, so our target release freeze is now November 5th.
Rahul (04:10): I will deliver the Stripe webhook integration and payment gateway tests by Friday.
Sarah (05:00): I can run performance load testing on the checkout flow before Tuesday.`
};

export const IngestModal: React.FC<Props> = ({ onClose, onIngestSuccess }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'mic' | 'text'>('file');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleLoadSample2 = () => {
    setActiveTab('text');
    setTitle(SAMPLE_MEETING_2.meeting_title);
    setDate(SAMPLE_MEETING_2.date);
    setRawText(SAMPLE_MEETING_2.raw_text);
  };

  // Start Mic Recording
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied or not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // File Drop handling
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const meetingTitle = title || (selectedFile ? selectedFile.name : 'Untitled Sync');

    setIsLoading(true);
    try {
      if (activeTab === 'file' && selectedFile) {
        const fname = selectedFile.name.toLowerCase();
        const isTextBased = fname.endsWith('.vtt') || fname.endsWith('.srt') || fname.endsWith('.txt') || fname.endsWith('.json');

        if (isTextBased) {
          // Read file text directly in browser - zero multipart server dependency needed!
          const textContent = await selectedFile.text();
          const res = await api.ingestMeeting({
            meeting_title: meetingTitle,
            date: date,
            raw_text: textContent,
          });
          onIngestSuccess(res.meeting_id);
          onClose();
          return;
        }

        // For binary audio files (.wav, .mp3)
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('meeting_title', meetingTitle);
        formData.append('date', date);

        const res = await api.uploadMeeting(formData);
        onIngestSuccess(res.meeting_id);
        onClose();
      } else if (activeTab === 'mic' && recordedBlob) {
        const formData = new FormData();
        const file = new File([recordedBlob], 'mic_recording.webm', { type: 'audio/webm' });
        formData.append('file', file);
        formData.append('meeting_title', meetingTitle || 'Live Standup Sync');
        formData.append('date', date);

        const res = await api.uploadMeeting(formData);
        onIngestSuccess(res.meeting_id);
        onClose();
      } else if (activeTab === 'text') {
        if (!rawText.trim()) {
          setError('Please paste meeting dialogue or load the sample.');
          setIsLoading(false);
          return;
        }
        const res = await api.ingestMeeting({
          meeting_title: meetingTitle,
          date: date,
          raw_text: rawText,
        });
        onIngestSuccess(res.meeting_id);
        onClose();
      } else {
        setError('Please select a file or record audio before submitting.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to ingest meeting');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#050507]">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Ingest meeting transcript
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Upload transcript file (.vtt, .srt, audio), record microphone, or paste dialogue
            </p>
          </div>

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

        {/* Ingestion Source Tabs */}
        <div className="px-6 py-2.5 border-b border-white/[0.07] bg-[#050507] flex items-center justify-between">
          <div className="flex items-center bg-[#000000] p-0.5 rounded-[6px] border border-white/[0.08] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`px-3 py-1.5 rounded-[5px] font-medium transition-all ${
                activeTab === 'file'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Upload file
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mic')}
              className={`px-3 py-1.5 rounded-[5px] font-medium transition-all ${
                activeTab === 'mic'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Record audio
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`px-3 py-1.5 rounded-[5px] font-medium transition-all ${
                activeTab === 'text'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Paste text
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-[#121314]">
          {error && (
            <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Meeting Title</label>
              <input
                type="text"
                placeholder="e.g. Architecture Alignment or Sprint Sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/[0.2] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-white/[0.2] transition"
              />
            </div>
          </div>

          {/* TAB 1: FILE DROPZONE */}
          {activeTab === 'file' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border border-dashed border-white/[0.12] hover:border-white/[0.25] rounded-[8px] p-8 flex flex-col items-center justify-center bg-white/[0.01] hover:bg-[#1a1b1e] transition-all cursor-pointer text-center group"
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".vtt,.srt,.txt,.json,.wav,.mp3,.webm,.m4a"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                    if (!title) setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                  }
                }}
              />
              <FileUp className="w-7 h-7 text-zinc-400 mb-2 group-hover:text-zinc-200 transition-colors" />
              {selectedFile ? (
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                  <p className="text-[11px] font-mono tabular-nums text-zinc-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB · Click to change file
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-medium text-zinc-200">
                    Drag &amp; drop your meeting file here, or browse
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Supports Zoom/Meet <code className="text-zinc-400 font-mono">.vtt</code>, <code className="text-zinc-400 font-mono">.srt</code>, <code className="text-zinc-400 font-mono">.txt</code>, or audio recordings (<code className="text-zinc-400 font-mono">.wav</code>, <code className="text-zinc-400 font-mono">.mp3</code>)
                  </p>
                </>
              )}
            </div>
          )}

          {/* TAB 2: LIVE MIC RECORDER */}
          {activeTab === 'mic' && (
            <div className="p-8 rounded-[8px] bg-white/[0.01] border border-white/[0.08] flex flex-col items-center justify-center space-y-3 text-center">
              <div className="relative">
                {isRecording && (
                  <span className="absolute -inset-1 rounded-full bg-rose-500/20 animate-ping" />
                )}
                <div
                  className={`w-12 h-12 rounded-[8px] flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : recordedBlob
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/[0.04] text-zinc-400 border border-white/[0.08]'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </div>
              </div>

              <div>
                <div className="font-mono tabular-nums text-2xl font-semibold text-zinc-100">
                  {formatTimer(recordDuration)}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {isRecording
                    ? 'Recording live audio from microphone...'
                    : recordedBlob
                    ? 'Audio recording ready for transcription & audit'
                    : 'Click start to record an ad-hoc sync with your team'}
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-[6px] text-xs font-medium flex items-center space-x-1.5 shadow-sm transition active:scale-[0.98]"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{recordedBlob ? 'Re-record audio' : 'Start recording'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 rounded-[6px] text-xs font-medium flex items-center space-x-1.5 transition active:scale-[0.98]"
                  >
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Stop recording</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TEXT PASTE */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Transcript text (Format: <code className="text-zinc-300 font-mono">Speaker (Time): Text</code>)
                </label>
                <textarea
                  rows={8}
                  placeholder={`Alex (01:15): Let's migrate to PostgreSQL.\nRahul (02:00): I'll finish the auth schema by Thursday.`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] p-3 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/[0.2] resize-y leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] rounded-[5px] font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isRecording}
              className="px-3.5 py-1.5 text-xs bg-zinc-100 hover:bg-white text-zinc-950 rounded-[6px] font-medium flex items-center space-x-1.5 shadow-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Ingesting & auditing...' : 'Ingest & run audit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
