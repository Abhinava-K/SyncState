import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  Building,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowLeft,
  Zap,
  Shield,
  Loader2
} from 'lucide-react';
import { api, setActiveWorkspaceId } from '../api';
import { AuthResponse, UserInfo } from '../types';

interface Props {
  onNavigate: (path: string) => void;
  onAuthSuccess: (authData: AuthResponse) => void;
  currentUser: UserInfo | null;
  noticeMessage?: string;
}

export const AuthPage: React.FC<Props> = ({ onNavigate, onAuthSuccess, currentUser, noticeMessage }) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick 1-Click Demo Login
  const handleDemoSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login({
        email: 'demo@syncstate.io',
        password: 'syncstate123',
      });
      setActiveWorkspaceId(res.active_workspace.id);
      localStorage.setItem('syncstate_user', JSON.stringify(res.user));
      onAuthSuccess(res);
      onNavigate('/app');
    } catch (err: any) {
      setError(err.message || 'Demo sign in failed. Please try manual entry.');
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
      localStorage.setItem('syncstate_user', JSON.stringify(res.user));
      onAuthSuccess(res);
      onNavigate('/app');
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'signin' ? 'sign in' : 'create account'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden">
      
      {/* Background Aura Gradients & Dot Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-[40%] -left-[200px] w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] rounded-full" />
        <div className="absolute top-[50%] -right-[200px] w-[500px] h-[500px] bg-purple-500/10 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.25] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,#000_65%,transparent_100%)]" />
      </div>

      {/* Top Simple Header */}
      <header className="relative z-20 w-full px-6 lg:px-12 py-5 flex items-center justify-between">
        <div
          onClick={() => onNavigate('/homepage')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-600/25 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-200 transition-colors">SyncState</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              v2.0 PRO
            </span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/homepage')}
          className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Homepage</span>
        </button>
      </header>

      {/* Main Auth Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-4">
          
          {/* Notice Alert if redirected */}
          {noticeMessage && (
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center space-x-2.5 text-xs text-indigo-300 shadow-lg animate-in fade-in">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{noticeMessage}</span>
            </div>
          )}

          {/* Card Container */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 backdrop-blur-xl shadow-2xl shadow-indigo-950/50 overflow-hidden ring-1 ring-white/10">
            
            {/* Header Badge */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-800/80 bg-zinc-950/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>Enterprise Workspace Gate</span>
                </span>
                <span className="text-xs text-zinc-500 font-mono">SQLite Isolation</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {mode === 'signin' ? 'Sign in to SyncState' : 'Create an Account'}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                {mode === 'signin'
                  ? 'Access your institutional memory ledger and collision audit console.'
                  : 'Start enforcing meeting governance with zero silent architectural drift.'}
              </p>
            </div>

            {/* Quick 1-Click Demo Architect Access */}
            <div className="p-6 pb-2 border-b border-zinc-800/60 bg-gradient-to-b from-indigo-950/20 to-transparent">
              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600/90 via-indigo-500 to-purple-600/90 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 ring-1 ring-white/20 transition active:scale-98 group disabled:opacity-50"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white">1-Click Demo Architect Sign In</div>
                    <div className="text-[10px] text-indigo-200 font-mono font-normal">Pre-loaded with 10 edge cases & ledger</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono">
                  <span className="bg-zinc-900/90 px-3 text-zinc-400">or manual authentication</span>
                </div>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition text-xs ${
                    mode === 'signin'
                      ? 'bg-zinc-800 text-white font-semibold shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition text-xs ${
                    mode === 'register'
                      ? 'bg-zinc-800 text-white font-semibold shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Extra Fields */}
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-zinc-300 uppercase">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-zinc-300 uppercase">Organization / Team</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Acme Core Eng (optional)"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition font-sans"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-300 uppercase">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition font-sans"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-zinc-300 uppercase">Password</label>
                  {mode === 'signin' && (
                    <span className="text-[10px] text-zinc-500 font-mono">Demo: syncstate123</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition font-sans"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Create Enterprise Account'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

            </form>

            {/* Footer Trust Indicators */}
            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 flex items-center justify-between">
              <span className="flex items-center space-x-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Multi-Tenant Isolated</span>
              </span>
              <span>100% Deterministic SQLite</span>
            </div>

          </div>

          {/* Bottom Help */}
          <div className="text-center mt-6 text-xs text-zinc-400 space-x-2">
            <span>Want to test without signing up?</span>
            <button
              onClick={handleDemoSignIn}
              className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4"
            >
              Use instant demo mode
            </button>
          </div>

        </div>
      </main>

    </div>
  );
};
