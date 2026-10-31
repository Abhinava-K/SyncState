import React, { useState } from 'react';
import { X, ShieldCheck, User, Lock, Mail, Building, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { api, setActiveWorkspaceId } from '../api';
import { AuthResponse } from '../types';

interface Props {
  onClose: () => void;
  onAuthSuccess: (authData: AuthResponse) => void;
}

export const AuthModal: React.FC<Props> = ({ onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login({
        email: 'demo@syncstate.io',
        password: 'syncstate123',
      });
      setActiveWorkspaceId(res.active_workspace.id);
      onAuthSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let res: AuthResponse;
      if (mode === 'signin') {
        res = await api.login({ email, password });
      } else {
        res = await api.register({
          email,
          name,
          password,
          organization_name: orgName || 'Engineering Org',
        });
      }

      setActiveWorkspaceId(res.active_workspace.id);
      onAuthSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'signin' ? 'sign in' : 'create account'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                {mode === 'signin' ? 'Sign In to SyncState' : 'Create an Account'}
              </h2>
              <p className="text-xs text-zinc-400">Enterprise workspace isolation & security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 text-xs font-medium">
          <button
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              mode === 'signin'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              mode === 'register'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Register Workspace
          </button>
        </div>

        {/* Content & Form */}
        <div className="p-6 space-y-4">
          {/* Quick Demo Sign-in */}
          {mode === 'signin' && (
            <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-indigo-300 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1" />
                  Quick Hackathon / Demo Sign-In
                </span>
                <span className="text-[10px] font-mono bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded">
                  Demo
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-2">
                Sign in instantly as Lead Architect with pre-configured institutional memory.
              </p>
              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={isLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition active:scale-95 flex items-center justify-center space-x-1"
              >
                <span>Sign In as Demo Architect</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Company / Organization</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Acme Engineering Team"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-xl text-sm font-semibold transition active:scale-95 disabled:opacity-50 mt-2"
            >
              {isLoading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Organization Workspace'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-950/90 border-t border-zinc-800 text-[11px] text-zinc-500 text-center">
          Workspaces strictly isolate all meeting transcripts, institutional memory, and issue tracker credentials.
        </div>
      </div>
    </div>
  );
};
