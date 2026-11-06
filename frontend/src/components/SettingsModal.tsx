import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Github, CheckCircle2, Shield, Eye, EyeOff, Save, Sparkles } from 'lucide-react';
import { api } from '../api';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export const SettingsModal: React.FC<Props> = ({ onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [integrationMode, setIntegrationMode] = useState<'mock' | 'live'>('mock');
  const [geminiKey, setGeminiKey] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('acme-corp/product-roadmap');
  const [linearKey, setLinearKey] = useState('');
  const [currentConfig, setCurrentConfig] = useState<any>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    api.getSettings()
      .then((cfg) => {
        setCurrentConfig(cfg);
        setIntegrationMode(cfg.integration_mode || 'mock');
        setGithubRepo(cfg.github_repo || 'acme-corp/product-roadmap');
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      await api.updateSettings({
        integration_mode: integrationMode,
        gemini_api_key: geminiKey || undefined,
        github_token: githubToken || undefined,
        github_repo: githubRepo || undefined,
        linear_api_key: linearKey || undefined,
      });
      setStatusMessage('Settings updated successfully!');
      onSaved();
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] w-full max-w-xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#050507]">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Integrations &amp; credentials
              </h2>
              <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px] border border-white/[0.06]">
                Settings
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure live Gemini AI API and GitHub issue dispatch
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

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 bg-[#121314]">
          {statusMessage && (
            <div
              className={`p-3 rounded-[6px] text-xs flex items-center space-x-2 animate-in fade-in ${
                statusMessage.startsWith('Error')
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Integration Mode Switch */}
          <div className="p-3.5 rounded-[8px] bg-white/[0.02] border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-zinc-200">Execution Mode</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {integrationMode === 'live'
                    ? 'Creates real issues on GitHub using your credentials'
                    : 'Deterministic simulated tickets for offline/demo workflows'}
                </p>
              </div>
              <div className="flex items-center bg-[#000000] p-0.5 rounded-[6px] border border-white/[0.08] text-xs">
                <button
                  type="button"
                  onClick={() => setIntegrationMode('mock')}
                  className={`px-2.5 py-1 rounded-[5px] font-medium transition-all ${
                    integrationMode === 'mock'
                      ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Mock
                </button>
                <button
                  type="button"
                  onClick={() => setIntegrationMode('live')}
                  className={`px-2.5 py-1 rounded-[5px] font-medium transition-all ${
                    integrationMode === 'live'
                      ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Live API
                </button>
              </div>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-zinc-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Google Gemini API Key</span>
              </label>
              {currentConfig?.gemini_api_key_configured && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-[3px]">
                  Configured
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showKeys ? 'text' : 'password'}
                placeholder="AIzaSy... (leave blank to keep current)"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] pr-9 transition"
              />
              <button
                type="button"
                onClick={() => setShowKeys(!showKeys)}
                className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300"
              >
                {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Powers live Gemini diarization, audio transcription &amp; contradiction reasoner.
            </p>
          </div>

          {/* GitHub Integration */}
          <div className="space-y-2 pt-2 border-t border-white/[0.07]">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-zinc-300 flex items-center space-x-1.5">
                <Github className="w-3.5 h-3.5 text-zinc-200" />
                <span>GitHub Issues Integration</span>
              </label>
              {currentConfig?.github_configured && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-[3px]">
                  Connected
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Target Repository</label>
                <input
                  type="text"
                  placeholder="owner/repo (e.g. acme/roadmap)"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] transition"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Personal Access Token</label>
                <input
                  type={showKeys ? 'text' : 'password'}
                  placeholder="ghp_... (repo scope)"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] transition"
                />
              </div>
            </div>
          </div>

          {/* Footer Save Button */}
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
              disabled={saving}
              className="px-3.5 py-1.5 text-xs bg-zinc-100 hover:bg-white text-zinc-950 rounded-[6px] font-medium flex items-center space-x-1.5 shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
