import React, { useState, useRef } from 'react';
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-zinc-100">Ingest Meeting (Real Data Pipeline)</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Drop Zoom/Meet .vtt, record audio, or paste transcript
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ingestion Source Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950 px-6 pt-3 space-x-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'file'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload File (.vtt, .srt, audio)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mic')}
            className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'mic'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Record Live Mic</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`pb-2.5 flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'text'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Transcript Text</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* TAB 1: FILE DROPZONE */}
          {activeTab === 'file' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-zinc-750 hover:border-indigo-500/60 rounded-xl p-8 flex flex-col items-center justify-center bg-zinc-950/50 transition-colors cursor-pointer text-center"
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
              <FileUp className="w-8 h-8 text-indigo-400 mb-2 opacity-80" />
              {selectedFile ? (
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-zinc-200">
                    Drag &amp; drop your meeting file here, or browse
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Supports Zoom/Meet <code className="text-indigo-300">.vtt</code>, <code className="text-indigo-300">.srt</code>, <code className="text-indigo-300">.txt</code>, or audio recordings (<code className="text-indigo-300">.wav</code>, <code className="text-indigo-300">.mp3</code>)
                  </p>
                </>
              )}
            </div>
          )}

          {/* TAB 2: LIVE MIC RECORDER */}
          {activeTab === 'mic' && (
            <div className="p-8 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                {isRecording && (
                  <span className="absolute -inset-2 rounded-full bg-rose-500/20 animate-ping"></span>
                )}
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
                    isRecording
                      ? 'bg-rose-600 text-white shadow-rose-600/30'
                      : recordedBlob
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-750'
                  }`}
                >
                  <Mic className="w-7 h-7" />
                </div>
              </div>

              <div>
                <div className="font-mono text-xl font-bold text-zinc-100">
                  {formatTimer(recordDuration)}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {isRecording
                    ? 'Recording live audio from microphone...'
                    : recordedBlob
                    ? 'Audio recording ready for transcription & audit'
                    : 'Click Start to record an ad-hoc sync with your team'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-rose-600/20 transition-all"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{recordedBlob ? 'Re-Record Audio' : 'Start Recording'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all"
                  >
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Stop Recording</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TEXT PASTE */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-semibold text-zinc-200">Load Test Contradiction Sample</span>
                  <p className="text-zinc-500 text-[11px]">
                    Meeting 2 contains MongoDB &amp; Nov 5 release date shifts to trigger audit
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSample2}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Load Sample</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Transcript Text (Format: <code className="text-indigo-300">Speaker (Time): Text</code>)
                </label>
                <textarea
                  rows={6}
                  placeholder={`Alex (01:15): Let's migrate to PostgreSQL.\nRahul (02:00): I'll finish the auth schema by Thursday.`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isRecording}
              className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98]"
            >
              <FileText className="w-4 h-4" />
              <span>{isLoading ? 'Ingesting & Auditing...' : 'Ingest & Run Agent'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
