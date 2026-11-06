import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, User, Lock, Mail, Building, ArrowRight, Sparkles, CheckCircle2, LogOut, Check } from 'lucide-react';
import { api, setActiveWorkspaceId } from '../api';
import { AuthResponse, UserInfo, WorkspaceInfo } from '../types';

interface Props {
  onClose: () => void;
  onAuthSuccess: (authData: AuthResponse) => void;
  currentUser?: UserInfo | null;
  activeWorkspace?: WorkspaceInfo | null;
  workspaces?: WorkspaceInfo[];
  onSwitchWorkspace?: (wsId: string) => void;
  onSignOut?: () => void;
}

export const AuthModal: React.FC<Props> = ({
  onClose,
  onAuthSuccess,
  currentUser,
  activeWorkspace,
  workspaces = [],
  onSwitchWorkspace,
  onSignOut,
}) => {
  const [mode, setMode] = useState<'profile' | 'signin' | 'register'>(currentUser ? 'profile' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0c] border border-white/[0.1] rounded-[10px] w-full max-w-md flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#050507] border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                {mode === 'profile'
                  ? 'User profile & workspace'
                  : mode === 'signin'
                  ? 'Sign in to SyncState'
                  : 'Create an account'}
              </h2>
              <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded-[4px] border border-white/[0.06]">
                {mode === 'profile' ? 'ACTIVE SESSION' : 'ENTERPRISE'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {mode === 'profile'
                ? 'Team identity & workspace isolation'
                : 'Enterprise workspace isolation & security'}
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

        {/* Mode Tabs */}
        <div className="px-6 py-2.5 bg-[#050507] border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center bg-[#000000] p-0.5 rounded-[6px] border border-white/[0.08] text-xs w-full">
            {currentUser && (
              <button
                onClick={() => { setMode('profile'); setError(null); }}
                className={`flex-1 py-1.5 rounded-[5px] font-medium transition-all text-center ${
                  mode === 'profile'
                    ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Profile &amp; Team
              </button>
            )}
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-1.5 rounded-[5px] font-medium transition-all text-center ${
                mode === 'signin'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {currentUser ? 'Switch Account' : 'Sign In'}
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-1.5 rounded-[5px] font-medium transition-all text-center ${
                mode === 'register'
                  ? 'bg-white/[0.08] text-white border border-white/[0.1] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              New Workspace
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 bg-[#121314]">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-[6px] text-xs text-rose-300 animate-in fade-in">
              {error}
            </div>
          )}

          {/* VIEW: LOGGED-IN PROFILE & WORKSPACES */}
          {mode === 'profile' && (
            <div className="space-y-4">
              {/* User Identity Card */}
              <div className="p-4 rounded-[8px] bg-white/[0.02] border border-white/[0.08] flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold text-sm flex items-center justify-center border border-indigo-500/30 shrink-0">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-zinc-100 truncate">
                      {currentUser?.name || 'Architect'}
                    </span>
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[3px] bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
                      {activeWorkspace?.role || 'Admin'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                    {currentUser?.email || 'architect@syncstate.io'}
                  </p>
                </div>
              </div>

              {/* Active Workspace Card */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-400">Active Workspace</span>
                <div className="p-3.5 rounded-[8px] bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <Building className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-zinc-200 truncate block">
                        {activeWorkspace?.name || 'Core Engineering Team'}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 truncate block">
                        slug: {activeWorkspace?.slug || 'core-eng'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-[4px] shrink-0">
                    CURRENT
                  </span>
                </div>
              </div>

              {/* Other Available Workspaces */}
              {workspaces.length > 1 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-zinc-400">Switch Workspace</span>
                  <div className="border border-white/[0.08] rounded-[8px] divide-y divide-white/[0.04] overflow-hidden bg-white/[0.01]">
                    {workspaces.map((ws) => {
                      const isActive = activeWorkspace?.id === ws.id;
                      return (
                        <div
                          key={ws.id}
                          onClick={() => {
                            if (!isActive && onSwitchWorkspace) onSwitchWorkspace(ws.id);
                          }}
                          className={`p-3 flex items-center justify-between transition-colors ${
                            isActive ? 'bg-white/[0.03]' : 'hover:bg-[#1a1b1e] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                            <span className="text-xs text-zinc-200 font-medium truncate">{ws.name}</span>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{ws.role}</span>
                          </div>
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <span className="text-[11px] text-zinc-400 font-mono">Switch →</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-between border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); }}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                >
                  Switch account →
                </button>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-3 py-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-[6px] font-medium transition flex items-center space-x-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* VIEW: SIGN IN OR REGISTER */}
          {mode !== 'profile' && (
            <div className="space-y-4">
              {/* Quick Demo Sign-in */}
              {mode === 'signin' && (
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.08] rounded-[8px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-zinc-200 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Quick demo sign-in</span>
                    </span>
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[3px] bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
                      Demo
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2.5 leading-relaxed">
                    Sign in instantly as Lead Architect with pre-configured institutional memory.
                  </p>
                  <button
                    type="button"
                    onClick={handleDemoSignIn}
                    disabled={isLoading}
                    className="w-full py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-[6px] text-xs font-medium transition active:scale-[0.98] flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <span>Sign in as Demo Architect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Mercer"
                          className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Company / Organization</label>
                      <div className="relative">
                        <Building className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="Acme Engineering Team"
                          className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] transition"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0d0e10] border border-white/[0.08] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/[0.2] transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-[6px] text-xs font-medium transition active:scale-[0.98] disabled:opacity-50 mt-2 shadow-sm"
                >
                  {isLoading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Organization Workspace'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 bg-[#050507] border-t border-white/[0.07] text-[11px] text-zinc-500 text-center">
          Workspaces strictly isolate meeting transcripts, institutional memory, and issue tracker credentials.
        </div>
      </div>
    </div>
  );
};
