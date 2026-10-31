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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-zinc-100">Live Integrations & Credentials</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connect live Gemini AI and your real GitHub/Linear issue board
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

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {statusMessage && (
            <div className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
              statusMessage.startsWith('Error') 
                ? 'bg-rose-950/40 border border-rose-500/40 text-rose-300' 
                : 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
            }`}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Integration Mode Switch */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-200">Execution Mode</span>
                <p className="text-[11px] text-zinc-400">
                  {integrationMode === 'live' 
                    ? '⚡ LIVE MODE: Creates real issues on GitHub/Linear using your credentials'
                    : '🛡️ MOCK MODE: Deterministic zero-failure simulated tickets (ideal for hackathon demos)'}
                </p>
              </div>
              <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setIntegrationMode('mock')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    integrationMode === 'mock'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Mock
                </button>
                <button
                  type="button"
                  onClick={() => setIntegrationMode('live')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    integrationMode === 'live'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Live API
                </button>
              </div>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-zinc-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Gemini API Key</span>
              </label>
              {currentConfig?.gemini_api_key_configured && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowKeys(!showKeys)}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
              >
                {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Powers live Gemini 2.5 Flash diarization, audio transcription & conflict reasoner.
            </p>
          </div>

          {/* GitHub Integration */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-zinc-300 flex items-center space-x-1.5">
                <Github className="w-3.5 h-3.5 text-zinc-200" />
                <span>GitHub Issues Integration</span>
              </label>
              {currentConfig?.github_configured && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">GitHub Personal Access Token</label>
                <input
                  type={showKeys ? 'text' : 'password'}
                  placeholder="ghp_... (with 'repo' scope)"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 transition-all"
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

