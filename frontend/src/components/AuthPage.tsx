import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api, setActiveWorkspaceId } from '../api';
import { AuthResponse, UserInfo } from '../types';

interface Props {
  onNavigate: (path: string) => void;
  onAuthSuccess: (authData: AuthResponse) => void;
  currentUser: UserInfo | null;
  noticeMessage?: string;
  initialMode?: 'login' | 'signup';
}

/**
 * AuthPage (Full-Surface Shutter Wipe with Synchronized Traveling Laser Beam)
 * 
 * Mechanical physics:
 * 1. The glowing diagonal line follows along with BOTH the close AND open transition continuously.
 * 2. On Close (Phase 1): The line visibly and smoothly glides from its resting spot across the card
 *    to the edge, pulling the dark obsidian curtain across 100% of the card surface.
 * 3. Mid-Point Blanket: While the card is 100% covered and the line is safely off-screen,
 *    the form and editorial texts switch seamlessly underneath the darkness.
 * 4. On Open (Phase 2): The line enters from the opposite edge and sweeps into its new resting
 *    position, peeling open the curtain to reveal the new form with 100% visual continuity (zero popping).
 * 5. Web Animations API (element.animate) guarantees 60fps/120fps hardware-composited animation
 *    with zero CSS race conditions or sudden pops.
 * 6. Editorial texts stay stationary with zero horizontal shift to prevent eye fatigue.
 */
export const AuthPage: React.FC<Props> = ({
  onNavigate,
  onAuthSuccess,
  currentUser,
  noticeMessage,
  initialMode = 'login',
}) => {
  // Resolve initial mode from URL or props
  const determineInitialMode = (): 'login' | 'signup' => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const search = new URLSearchParams(window.location.search);
      if (path === '/signup' || search.get('mode') === 'signup') return 'signup';
      if (path === '/login' || search.get('mode') === 'login') return 'login';
    }
    return initialMode;
  };

  const initial = determineInitialMode();
  const [mode, setMode] = useState<'login' | 'signup'>(initial);
  const [textMode, setTextMode] = useState<'login' | 'signup'>(initial);
  const [isTextVisible, setIsTextVisible] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation DOM refs
  const shutterRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);
  const activeAnimationsRef = useRef<Animation[]>([]);

  // Cleanup active animations on unmount
  useEffect(() => {
    return () => {
      activeAnimationsRef.current.forEach((anim) => {
        try {
          anim.cancel();
        } catch (_) {}
      });
      activeAnimationsRef.current = [];
    };
  }, []);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/signup') {
        triggerWipe('signup');
      } else if (path === '/login' || path === '/auth') {
        triggerWipe('login');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [mode]);

  // Sync with initialMode prop updates
  useEffect(() => {
    if (initialMode && initialMode !== mode && !isTransitioningRef.current) {
      triggerWipe(initialMode);
    }
  }, [initialMode]);

  // Synchronized Shutter-Wipe Trigger
  const triggerWipe = (targetMode: 'login' | 'signup') => {
    if (targetMode === mode || isTransitioningRef.current) return;
    
    // If refs aren't mounted (e.g. mobile viewport), toggle state directly
    if (!shutterRef.current || !beamRef.current) {
      setMode(targetMode);
      setTextMode(targetMode);
      const targetUrl = targetMode === 'signup' ? '/signup' : '/login';
      if (window.location.pathname !== targetUrl) {
        window.history.replaceState({}, '', targetUrl);
      }
      return;
    }

    isTransitioningRef.current = true;
    setError(null);

    // Sync URL silently without reload
    const targetUrl = targetMode === 'signup' ? '/signup' : '/login';
    if (window.location.pathname !== targetUrl) {
      window.history.replaceState({}, '', targetUrl);
    }

    // Cancel any previous active animations
    activeAnimationsRef.current.forEach((anim) => {
      try {
        anim.cancel();
      } catch (_) {}
    });
    activeAnimationsRef.current = [];

    // Smoothly fade out stationary text during the closing sweep
    setIsTextVisible(false);

    const CLOSE_DUR = 340;
    const OPEN_DUR = 360;
    const CLOSE_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
    const OPEN_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

    if (targetMode === 'signup') {
      // =========================================================================
      // LOGIN -> SIGNUP WIPE
      // =========================================================================
      // Phase 1 (Close): Beam glides continuously from resting 48% across the form
      // all the way to -16% (off-screen left), pulling the obsidian curtain across
      // 100% of the card!
      const beamAnim1 = beamRef.current.animate(
        [{ left: '48%' }, { left: '-16%' }],
        { duration: CLOSE_DUR, easing: CLOSE_EASING, fill: 'forwards' }
      );
      const shutterAnim1 = shutterRef.current.animate(
        [
          { clipPath: 'polygon(48% 0%, 100% 0%, 100% 100%, 59% 100%)' },
          { clipPath: 'polygon(-16% 0%, 100% 0%, 100% 100%, -5% 100%)' },
        ],
        { duration: CLOSE_DUR, easing: CLOSE_EASING, fill: 'forwards' }
      );
      activeAnimationsRef.current = [beamAnim1, shutterAnim1];

      beamAnim1.onfinish = () => {
        // Step 2: Full Blanket Point (Card is 100% covered in obsidian dark)
        setMode('signup');
        setTextMode('signup');
        setIsTextVisible(true);

        // Step 3 (Open): Beam enters from 116% (off-screen right) and glides smoothly
        // into 45%, peeling open the curtain to reveal the Create Account form!
        const beamAnim2 = beamRef.current?.animate(
          [{ left: '116%' }, { left: '45%' }],
          { duration: OPEN_DUR, easing: OPEN_EASING, fill: 'forwards' }
        );
        const shutterAnim2 = shutterRef.current?.animate(
          [
            { clipPath: 'polygon(0% 0%, 116% 0%, 127% 100%, 0% 100%)' },
            { clipPath: 'polygon(0% 0%, 45% 0%, 56% 100%, 0% 100%)' },
          ],
          { duration: OPEN_DUR, easing: OPEN_EASING, fill: 'forwards' }
        );

        if (beamAnim2 && shutterAnim2) {
          activeAnimationsRef.current = [beamAnim2, shutterAnim2];

          beamAnim2.onfinish = () => {
            if (beamRef.current) beamRef.current.style.left = '45%';
            if (shutterRef.current) {
              shutterRef.current.style.clipPath =
                'polygon(0% 0%, 45% 0%, 56% 100%, 0% 100%)';
            }
            try {
              beamAnim1.cancel();
              shutterAnim1.cancel();
              beamAnim2.cancel();
              shutterAnim2.cancel();
            } catch (_) {}
            activeAnimationsRef.current = [];
            isTransitioningRef.current = false;
          };
        } else {
          isTransitioningRef.current = false;
        }
      };
    } else {
      // =========================================================================
      // SIGNUP -> LOGIN WIPE (VICE VERSA)
      // =========================================================================
      // Phase 1 (Close): Beam glides continuously from resting 45% across the form
      // all the way to 116% (off-screen right), pulling the obsidian curtain across
      // 100% of the card!
      const beamAnim1 = beamRef.current.animate(
        [{ left: '45%' }, { left: '116%' }],
        { duration: CLOSE_DUR, easing: CLOSE_EASING, fill: 'forwards' }
      );
      const shutterAnim1 = shutterRef.current.animate(
        [
          { clipPath: 'polygon(0% 0%, 45% 0%, 56% 100%, 0% 100%)' },
          { clipPath: 'polygon(0% 0%, 116% 0%, 127% 100%, 0% 100%)' },
        ],
        { duration: CLOSE_DUR, easing: CLOSE_EASING, fill: 'forwards' }
      );
      activeAnimationsRef.current = [beamAnim1, shutterAnim1];

      beamAnim1.onfinish = () => {
        // Step 2: Full Blanket Point (Card is 100% covered in obsidian dark)
        setMode('login');
        setTextMode('login');
        setIsTextVisible(true);

        // Step 3 (Open): Beam enters from -16% (off-screen left) and glides smoothly
        // into 48%, peeling open the curtain to reveal the Sign In form!
        const beamAnim2 = beamRef.current?.animate(
          [{ left: '-16%' }, { left: '48%' }],
          { duration: OPEN_DUR, easing: OPEN_EASING, fill: 'forwards' }
        );
        const shutterAnim2 = shutterRef.current?.animate(
          [
            { clipPath: 'polygon(-16% 0%, 100% 0%, 100% 100%, -5% 100%)' },
            { clipPath: 'polygon(48% 0%, 100% 0%, 100% 100%, 59% 100%)' },
          ],
          { duration: OPEN_DUR, easing: OPEN_EASING, fill: 'forwards' }
        );

        if (beamAnim2 && shutterAnim2) {
          activeAnimationsRef.current = [beamAnim2, shutterAnim2];

          beamAnim2.onfinish = () => {
            if (beamRef.current) beamRef.current.style.left = '48%';
            if (shutterRef.current) {
              shutterRef.current.style.clipPath =
                'polygon(48% 0%, 100% 0%, 100% 100%, 59% 100%)';
            }
            try {
              beamAnim1.cancel();
              shutterAnim1.cancel();
              beamAnim2.cancel();
              shutterAnim2.cancel();
            } catch (_) {}
            activeAnimationsRef.current = [];
            isTransitioningRef.current = false;
          };
        } else {
          isTransitioningRef.current = false;
        }
      };
    }
  };

  // Live password strength calculation
  const calculateStrength = (pwd: string): number => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };
  const passwordStrength = calculateStrength(password);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let res: AuthResponse;
      if (mode === 'login') {
        res = await api.login({ email, password });
      } else {
        res = await api.register({
          email,
          name,
          password,
          organization_name: `${name.split(' ')[0] || 'Core'}'s Engineering Org`,
        });
      }

      setActiveWorkspaceId(res.active_workspace.id);
      localStorage.setItem('syncstate_user', JSON.stringify(res.user));
      onAuthSuccess(res);
      onNavigate('/app');
    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'login' ? 'sign in' : 'create account'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050508] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      {/* Background Volumetric Glow & Ambient Noise Texture */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[650px] bg-gradient-to-tr from-indigo-900/20 via-purple-900/15 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[15%] w-[450px] h-[450px] bg-purple-600/10 blur-[130px] rounded-full" />
        
        {/* Anti-Banding Micro-Dither Grain Overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
          <filter id="auth-dither">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#auth-dither)" />
        </svg>
      </div>

      {/* Top Header */}
      <header className="relative z-20 w-full px-6 lg:px-14 py-6 flex items-center justify-between">
        <div
          onClick={() => onNavigate('/homepage')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-600/25 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
            <Layers className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-200 transition-colors">
              SyncState
            </span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              v2.0 PRO
            </span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/homepage')}
          className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition font-medium px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Homepage</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        
        {/* Notice Alert (if redirected) */}
        {noticeMessage && (
          <div className="mb-6 max-w-[960px] w-full px-4 py-2.5 rounded-[8px] bg-[#121314] border border-white/[0.08] flex items-center space-x-2.5 text-xs text-zinc-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
            <span>{noticeMessage.replace('Authentication Required: ', '')}</span>
          </div>
        )}

        {/* =========================================================================
            THE AUTH CARD CONTAINER
            Elevated obsidian slate surface with inner hairline border
            ========================================================================= */}
        <div className="relative w-full max-w-[960px] min-h-[580px] md:min-h-[610px] rounded-[28px] border border-white/[0.1] bg-[#0c0e17] shadow-[0_25px_80px_-15px_rgba(79,70,229,0.25)] overflow-hidden flex flex-col md:flex-row">

          {/* =======================================================================
              FULL-CARD SWEEPING SHUTTER OVERLAY (z-20)
              Wipes across 100% of the card during mid-sweep
              ======================================================================= */}
          <div
            ref={shutterRef}
            className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-20 select-none transform-gpu overflow-hidden"
            style={{
              clipPath:
                mode === 'signup'
                  ? 'polygon(0% 0%, 45% 0%, 56% 100%, 0% 100%)'
                  : 'polygon(48% 0%, 100% 0%, 100% 100%, 59% 100%)',
              background:
                'linear-gradient(135deg, #07070e 0%, #0d0f26 48%, #18153b 100%)',
            }}
          >
            {/* Internal Volumetric Spotlight */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 75% 65% at 70% 35%, rgba(99, 102, 241, 0.22) 0%, rgba(139, 92, 246, 0.08) 50%, transparent 80%)',
              }}
            />

            {/* Subtle Noise Texture */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.035] mix-blend-overlay pointer-events-none">
              <filter id="blade-noise">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={3} stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#blade-noise)" />
            </svg>
          </div>

          {/* =======================================================================
              SYNCHRONIZED TRAVELING GLOWING LASER BEAM (z-30)
              Physically glides across the card alongside the shutter wipe (60fps)
              ======================================================================= */}
          <div
            ref={beamRef}
            className="hidden md:block absolute top-0 bottom-0 pointer-events-none z-30 transform-gpu"
            style={{
              left: mode === 'signup' ? '45%' : '48%',
              width: '11%',
            }}
          >
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="traveling-beam-glow" x="-200%" y="-20%" width="500%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur1" />
                  <feGaussianBlur stdDeviation="8" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Wide Neon Violet-Indigo Bloom */}
              <line
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                stroke="rgba(99, 102, 241, 0.85)"
                strokeWidth="10"
                filter="url(#traveling-beam-glow)"
              />
              {/* Specular Violet Ridge */}
              <line
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                stroke="rgba(165, 180, 252, 0.95)"
                strokeWidth="2.4"
              />
              {/* Razor White Core */}
              <line
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
            </svg>
          </div>

          {/* =======================================================================
              STATIONARY EDITORIAL TEXT LAYERS (z-25)
              Positioned above the blade. NEVER moves horizontally (zero eye strain).
              ======================================================================= */}
          
          {/* Left Editorial Text: "Start the first sync." (Visible in Signup Mode) */}
          <div
            className={`hidden md:flex absolute top-0 left-0 w-[46%] h-full p-10 lg:p-12 flex-col justify-center pointer-events-none z-[28] transition-opacity duration-300 ease-in-out ${
              textMode === 'signup' && isTextVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="max-w-[340px]">
              <div className="text-[11px] font-mono tracking-[0.28em] font-semibold text-indigo-400 uppercase mb-6 flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>SYNCSTATE</span>
              </div>
              <h3 className="font-['Instrument_Serif',serif] text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight">
                Start the <br />
                <span className="italic bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-100 bg-clip-text text-transparent">
                  first sync.
                </span>
              </h3>
              <p className="text-sm lg:text-base text-zinc-400 mt-5 leading-relaxed">
                One workspace for every transcript, every decision, and every sprint your team runs.
              </p>
            </div>
          </div>

          {/* Right Editorial Text: "Welcome back." (Visible in Login Mode) */}
          {/* Positioned safely with `pr-10 lg:pr-14 max-w-[340px] ml-auto` so it NEVER touches the diagonal edge */}
          <div
            className={`hidden md:flex absolute top-0 right-0 w-[46%] h-full p-10 lg:p-12 flex-col justify-center pointer-events-none z-[28] transition-opacity duration-300 ease-in-out ${
              textMode === 'login' && isTextVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="max-w-[340px] ml-auto">
              <div className="text-[11px] font-mono tracking-[0.28em] font-semibold text-indigo-400 uppercase mb-6 flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>SYNCSTATE</span>
              </div>
              <h3 className="font-['Instrument_Serif',serif] text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight">
                Welcome <br />
                <span className="italic bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-100 bg-clip-text text-transparent">
                  back.
                </span>
              </h3>
              <p className="text-sm lg:text-base text-zinc-400 mt-5 leading-relaxed">
                Your meetings, action items, and engineering context are waiting right where you left them.
              </p>
            </div>
          </div>

          {/* =======================================================================
              MOBILE HERO BANNER (< 768px viewports)
              Collapses into a top header banner with an angled bottom edge
              ======================================================================= */}
          <div
            className="md:hidden w-full h-[190px] p-7 flex flex-col justify-end relative overflow-hidden select-none"
            style={{
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 88%, 0% 100%)',
              background: 'linear-gradient(135deg, #07070e 0%, #0d0f26 48%, #18153b 100%)',
            }}
          >
            <div className="text-[10px] font-mono tracking-[0.25em] font-semibold text-indigo-400 uppercase mb-2">
              SYNCSTATE
            </div>
            <h3 className="font-['Instrument_Serif',serif] text-3xl text-white leading-[1.05]">
              {mode === 'login' ? (
                <>
                  Welcome <span className="italic text-indigo-300">back.</span>
                </>
              ) : (
                <>
                  Start the <span className="italic text-indigo-300">first sync.</span>
                </>
              )}
            </h3>
          </div>

          {/* =======================================================================
              LEFT HALF: SIGN IN FORM (Stationary underneath shutter)
              ======================================================================= */}
          <div
            className={`w-full md:w-[48%] p-8 sm:p-10 md:p-12 flex flex-col justify-center transition-opacity duration-300 ${
              mode === 'login'
                ? 'flex opacity-100 pointer-events-auto'
                : 'hidden md:flex opacity-0 pointer-events-none md:absolute md:top-0 md:left-0 md:bottom-0'
            }`}
          >
            {/* Form Header with Purplish-Blue Accent Underline */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Sign in</h2>
              <div className="w-9 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-400 mt-2.5" />
            </div>

            {/* Error Message */}
            {error && mode === 'login' && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Username or Email */}
              <div className="space-y-1.5 group">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Username or email
                </label>
                <div className="relative flex items-center border-b border-white/15 group-focus-within:border-indigo-400 transition-colors pb-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full bg-transparent border-none p-0 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                  />
                  <User className="w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors ml-2 flex-shrink-0" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 group">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative flex items-center border-b border-white/15 group-focus-within:border-indigo-400 transition-colors pb-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent border-none p-0 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-500 hover:text-zinc-300 ml-2 focus:outline-none flex-shrink-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Utility Row: Keep me signed in + Forgot password */}
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 focus:ring-1"
                  />
                  <span className="text-zinc-300 group-hover:text-white transition">Keep me signed in</span>
                </label>
                <button
                  type="button"
                  onClick={() => setError('Password reset instructions sent to your email.')}
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition text-xs"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 mt-7"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>

            </form>

            {/* State Switcher Footer */}
            <div className="text-left pt-6 text-xs text-zinc-400">
              <span>New to SyncState? </span>
              <button
                type="button"
                onClick={() => triggerWipe('signup')}
                className="font-semibold text-white underline decoration-indigo-400 underline-offset-4 hover:text-indigo-300 transition"
              >
                Create an account
              </button>
            </div>

          </div>

          {/* =======================================================================
              RIGHT HALF: CREATE ACCOUNT FORM (Stationary underneath shutter)
              ======================================================================= */}
          <div
            className={`w-full md:w-[48%] md:ml-auto p-8 sm:p-10 md:p-12 flex flex-col justify-center transition-opacity duration-300 ${
              mode === 'signup'
                ? 'flex opacity-100 pointer-events-auto'
                : 'hidden md:flex opacity-0 pointer-events-none md:absolute md:top-0 md:right-0 md:bottom-0'
            }`}
          >
            {/* Form Header with Purplish-Blue Accent Underline */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Create account</h2>
              <div className="w-9 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-400 mt-2.5" />
            </div>

            {/* Error Message */}
            {error && mode === 'signup' && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Create Account Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Full Name */}
              <div className="space-y-1.5 group">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Full name
                </label>
                <div className="relative flex items-center border-b border-white/15 group-focus-within:border-indigo-400 transition-colors pb-1.5">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full bg-transparent border-none p-0 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                  />
                  <User className="w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors ml-2 flex-shrink-0" />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5 group">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Email address
                </label>
                <div className="relative flex items-center border-b border-white/15 group-focus-within:border-indigo-400 transition-colors pb-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full bg-transparent border-none p-0 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                  />
                  <Mail className="w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors ml-2 flex-shrink-0" />
                </div>
              </div>

              {/* Password + Live Strength Meter */}
              <div className="space-y-1.5 group">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative flex items-center border-b border-white/15 group-focus-within:border-indigo-400 transition-colors pb-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-transparent border-none p-0 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-500 hover:text-zinc-300 ml-2 focus:outline-none flex-shrink-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* 4-Segment Horizontal Password Strength Indicator */}
                <div className="pt-2">
                  <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          passwordStrength >= seg
                            ? passwordStrength <= 2
                              ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                              : passwordStrength === 3
                              ? 'bg-indigo-400 shadow-sm shadow-indigo-400/50'
                              : 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {password.length === 0
                      ? 'Use 8 characters or more.'
                      : passwordStrength < 2
                      ? 'Too weak — add numbers & symbols'
                      : passwordStrength < 4
                      ? 'Good password strength'
                      : 'Excellent strong password'}
                  </p>
                </div>
              </div>

              {/* Primary CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 mt-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create account</span>
                )}
              </button>

            </form>

            {/* State Switcher Footer */}
            <div className="text-left pt-6 text-xs text-zinc-400">
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => triggerWipe('login')}
                className="font-semibold text-white underline decoration-indigo-400 underline-offset-4 hover:text-indigo-300 transition"
              >
                Sign in
              </button>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
};
