import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Database,
  Calendar,
  Lock,
  Unlock,
  GitPullRequest,
  Check,
  ChevronRight,
  Radio,
  FileText,
  BarChart3,
  Cpu,
  RefreshCw,
  Terminal,
  ExternalLink,
  Users,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Copy,
  CheckCheck,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { UserInfo } from '../types';

interface Props {
  onNavigate: (path: string) => void;
  onEnterApp?: () => void;
  onOpenLiveListener?: () => void;
  currentUser?: UserInfo | null;
}

type ScenarioKey = 'stack' | 'deadlock' | 'ownership';

interface ScenarioData {
  id: ScenarioKey;
  label: string;
  collisionType: string;
  badgeColor: string;
  speaker: string;
  speakerRole: string;
  timestamp: string;
  speechText: string;
  historicalId: string;
  historicalDate: string;
  historicalStance: string;
  auditExplanation: string;
  matchScore: number;
  linearIssueId: string;
  linearIssueTitle: string;
  linearAssignee: string;
  linearTeam: string;
}

export const LandingPage: React.FC<Props> = ({ onNavigate, onEnterApp, onOpenLiveListener, currentUser }) => {
  const [activeEdgeTab, setActiveEdgeTab] = useState<'collisions' | 'compatible'>('collisions');
  
  const handleTryApp = () => {
    if (onEnterApp) {
      onEnterApp();
    } else if (currentUser) {
      onNavigate('/app');
    } else {
      onNavigate('/auth');
    }
  };
  
  // Interactive Simulation State (Linear & Resend animated workflow)
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('stack');
  const [simStep, setSimStep] = useState<number>(0); // 0: Ingest, 1: Ledger Scan, 2: Collision Trap, 3: Resolved, 4: Dispatched
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [screenTab, setScreenTab] = useState<'simulation' | 'telemetry'>('simulation');
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const [userOverrideTriggered, setUserOverrideTriggered] = useState<boolean>(false);

  const scenarios: Record<ScenarioKey, ScenarioData> = {
    stack: {
      id: 'stack',
      label: '1. Tech Stack Reversal',
      collisionType: 'TECH_STACK_REVERSAL',
      badgeColor: 'border-red-500/40 bg-red-500/10 text-red-400',
      speaker: 'Sam Chen',
      speakerRole: 'Engineering Manager',
      timestamp: '00:03:42',
      speechText: "Given our aggressive sprint deadline, let's stick with MongoDB for the next 6 months to avoid schema migration delays.",
      historicalId: 'LEDGER-032',
      historicalDate: 'Oct 12 Consensus',
      historicalStance: 'Standardize on PostgreSQL for all relational storage and primary user records.',
      auditExplanation: 'Direct semantic contradiction: Sticking with MongoDB reverses locked institutional consensus without an approved RFC or migration plan.',
      matchScore: 94,
      linearIssueId: 'SYN-104',
      linearIssueTitle: 'RFC Required: PostgreSQL to MongoDB Stack Reversal Stance',
      linearAssignee: 'Sam Chen',
      linearTeam: 'Core Infrastructure'
    },
    deadlock: {
      id: 'deadlock',
      label: '2. Temporal Deadlock',
      collisionType: 'DEPENDENCY_DEADLOCK',
      badgeColor: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
      speaker: 'Sarah Jenkins',
      speakerRole: 'QA Lead',
      timestamp: '00:05:18',
      speechText: "Sarah, let's schedule full end-to-end performance load testing on the payment gateway this Tuesday morning.",
      historicalId: 'LEDGER-041',
      historicalDate: 'Sprint 14 Commitment',
      historicalStance: 'Stripe webhook integration and payment gateway deliverable promised by Friday (Rahul).',
      auditExplanation: 'Temporal dependency deadlock: Downstream load testing is scheduled for Tuesday, 3 days before the prerequisite Stripe service is deployed.',
      matchScore: 91,
      linearIssueId: 'SYN-105',
      linearIssueTitle: 'Timeline Realignment: Stripe Gateway Prerequisite before QA Load Test',
      linearAssignee: 'Sarah Jenkins',
      linearTeam: 'Quality Assurance'
    },
    ownership: {
      id: 'ownership',
      label: '3. Ownership Collision',
      collisionType: 'OWNER_DISPUTE',
      badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
      speaker: 'David Kim',
      speakerRole: 'Staff Engineer',
      timestamp: '00:07:30',
      speechText: "I am taking over complete ownership of the user auth microservice and JWT session migration by next week.",
      historicalId: 'LEDGER-019',
      historicalDate: 'Sprint 14 Allocation',
      historicalStance: 'User auth and JWT session migration explicitly assigned to Rahul (Target Due Date: Thursday).',
      auditExplanation: 'Uncoordinated assignment clash: Domain "Auth Migration" previously held by Rahul is being reassigned to David without handoff protocol.',
      matchScore: 89,
      linearIssueId: 'SYN-106',
      linearIssueTitle: 'Ownership Handoff: JWT Migration Transfer (Rahul → David)',
      linearAssignee: 'David Kim',
      linearTeam: 'Identity & Auth'
    }
  };

  const currentScen = scenarios[activeScenario];

  // Auto-play simulation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimStep((prev) => (prev + 1) % 5);
      setUserOverrideTriggered(false);
    }, 3800);
    return () => clearInterval(interval);
  }, [isPlaying, activeScenario]);

  const handleStepSelect = (step: number) => {
    setSimStep(step);
    setIsPlaying(false);
  };

  const handleScenarioChange = (scen: ScenarioKey) => {
    setActiveScenario(scen);
    setSimStep(0);
    setUserOverrideTriggered(false);
  };

  const handleManualOverride = () => {
    setUserOverrideTriggered(true);
    setSimStep(3); // Move to resolved immediately
    setTimeout(() => {
      setSimStep(4); // Move to dispatched
    }, 1200);
  };

  const copyTelemetry = () => {
    const payload = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        event: 'SYNCSTATE_GOVERNANCE_AUDIT',
        scenario: currentScen.id,
        stage: ['INGESTION', 'MEMORY_SCAN', 'COLLISION_TRAPPED', 'RESOLVED', 'LINEAR_DISPATCHED'][simStep],
        speaker: { name: currentScen.speaker, role: currentScen.speakerRole },
        transcript: currentScen.speechText,
        collision: {
          type: currentScen.collisionType,
          confidence: currentScen.matchScore / 100,
          historical_ref: currentScen.historicalId,
          explanation: currentScen.auditExplanation
        },
        linear_dispatch: {
          issue_id: currentScen.linearIssueId,
          title: currentScen.linearIssueTitle,
          status: simStep >= 3 ? 'DISPATCHED' : 'BLOCKED_BY_CIRCUIT_BREAKER'
        }
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const edgeCases = {
    collisions: [
      {
        type: 'TECH_STACK_REVERSAL',
        tag: 'Architecture',
        badgeColor: 'border-red-500/30 bg-red-500/10 text-red-400',
        past: 'Standardize on PostgreSQL for all relational storage and primary user records.',
        proposal: "Given our sprint velocity, let's stick with MongoDB for the next 6 months to avoid schema migration delays.",
        audit: 'Proposes MongoDB directly reversing earlier institutional consensus without migration approval.'
      },
      {
        type: 'CONTRACT_INVERSION',
        tag: 'API Contracts',
        badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        past: 'All internal microservices will use REST JSON endpoints with strict OpenAPI contracts.',
        proposal: 'We should switch to gRPC for backend inter-service calls to optimize binary throughput.',
        audit: 'Interface Contract Inversion: Previous sync locked REST; current proposal introduces gRPC breaking contract compatibility.'
      },
      {
        type: 'DEPENDENCY_DEADLOCK',
        tag: 'Workflow',
        badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
        past: 'Stripe webhook integration and payment gateway delivered by Friday (Rahul).',
        proposal: 'Run performance load testing on the checkout payment flow on Tuesday (Sarah).',
        audit: 'Downstream load testing scheduled for Tuesday before prerequisite Stripe webhook completes on Friday.'
      },
      {
        type: 'TIMELINE_SLIP',
        tag: 'Milestone',
        badgeColor: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
        past: 'Hard release freeze deadline set for November 15th to allow two full weeks of QA.',
        proposal: 'Marketing campaign brought forward, so our target release freeze is now November 5th.',
        audit: 'Milestone pulled forward by 10 days, cutting critical QA testing cycle without sign-off.'
      },
      {
        type: 'OWNER_DISPUTE',
        tag: 'Assignment',
        badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
        past: 'Feature ownership of user auth and JWT session migration held by Rahul (Due: Thursday).',
        proposal: 'I am taking ownership of the user auth and JWT session migration by next week (David).',
        audit: 'Domain Auth previously assigned to Rahul now assigned to David without recorded handoff.'
      }
    ],
    compatible: [
      {
        type: 'CACHE_EXTENSION',
        tag: 'Compatible',
        badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        past: 'Standardize on PostgreSQL for primary relational database.',
        proposal: 'Introduce Redis as an in-memory cache layer in front of the PostgreSQL database.',
        audit: 'Layered Cache Extension: Redis enhances PostgreSQL read latency without replacing primary storage.'
      },
      {
        type: 'MILESTONE_DESCOPING',
        tag: 'Compatible',
        badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        past: 'Hard release freeze deadline set for November 15th.',
        proposal: "For our November 15th release, let's descope the CSV export button to sprint 4 to protect the deadline.",
        audit: 'Protective Descoping: Descoping non-critical UI buttons protects the committed milestone.'
      },
      {
        type: 'RATE_LIMIT_AUGMENTATION',
        tag: 'Compatible',
        badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        past: 'Deploy user profile API endpoint by Monday.',
        proposal: 'Also add rate limiting to the login endpoint by Wednesday.',
        audit: 'Additive Security Feature: Rate limiting complements the auth endpoint without breaking contract.'
      },
      {
        type: 'UI_DARK_MODE',
        tag: 'Compatible',
        badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        past: 'All internal microservices will use REST JSON endpoints.',
        proposal: 'Design the dark mode Tailwind CSS theme for the marketing landing page by Friday.',
        audit: 'Independent UI Layer: Landing page frontend work is decoupled from internal microservices.'
      },
      {
        type: 'QA_INTEGRATION_TEST',
        tag: 'Compatible',
        badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        past: 'Deploy the user profile API endpoint by Monday (Rahul).',
        proposal: 'Write integration tests for the user profile endpoint on Thursday (Sarah).',
        audit: 'Valid Sequential Dependency: Downstream testing scheduled for Thursday after Monday delivery.'
      }
    ]
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      
      {/* Background Aura Gradients & Dot Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-[35%] -left-[200px] w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] rounded-full" />
        <div className="absolute top-[60%] -right-[200px] w-[500px] h-[500px] bg-purple-500/10 blur-[150px] rounded-full" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.25] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,#000_65%,transparent_100%)]" />
      </div>

      {/* Top Floating Glass Navigation (Linear / Resend Style) */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-zinc-950/70 border-b border-zinc-800/60 px-6 lg:px-12 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-7 text-xs font-medium text-zinc-400">
            <a href="#interactive-simulator" className="hover:text-zinc-200 transition flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Interactive Demo</span>
            </a>
            <a href="#collision-engine" className="hover:text-zinc-200 transition">Collision Engine</a>
            <a href="#institutional-memory" className="hover:text-zinc-200 transition">Institutional Memory</a>
            <a href="#live-listener" className="hover:text-zinc-200 transition">Voice Listener</a>
            <a href="#edge-cases" className="hover:text-zinc-200 transition">10 Edge Cases</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            {onOpenLiveListener && (
              <button
                onClick={onOpenLiveListener}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition"
              >
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Live Listener</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">$0.00</span>
              </button>
            )}

            {currentUser ? (
              <button
                onClick={() => onNavigate('/app')}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 text-xs font-medium transition"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="truncate max-w-[110px]">{currentUser.name.split(' ')[0]}</span>
                <span className="text-[10px] text-indigo-400 font-mono">App →</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('/auth')}
                className="text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl hover:bg-zinc-900 transition font-medium"
              >
                Sign In
              </button>
            )}

            <button
              onClick={handleTryApp}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 ring-1 ring-white/20 transition active:scale-95 group"
            >
              <span>{currentUser ? 'Open App' : 'Try Free'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Landing Flow */}
      <main className="relative z-10 flex-1">
        
        {/* HERO SECTION */}
        <section className="pt-20 pb-16 md:pt-28 md:pb-24 px-6 lg:px-12 max-w-6xl mx-auto text-center">
          
          {/* Linear / Aceternity Style Floating Pill with Animated Beam */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 shadow-xl mb-8 hover:border-zinc-700 transition cursor-default">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="font-medium text-zinc-200">Autonomous Meeting Governance Platform</span>
            <span className="text-zinc-600">|</span>
            <span className="text-indigo-400 font-mono text-[11px] flex items-center space-x-1">
              <span>Zero Silent Drift</span>
              <ChevronRight className="w-3 h-3 inline" />
            </span>
          </div>

          {/* Hero Typography */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.08] mb-6">
            Engineering meetings drift. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
              SyncState enforces.
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            The autonomous platform that audits meeting speech in real-time, traps architectural contradictions against institutional memory, and dispatches verified tickets directly to Linear & GitHub.
          </p>

          {/* Hero Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-14">
            <button
              onClick={handleTryApp}
              className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 ring-1 ring-white/20 transition-all active:scale-95 group"
            >
              <span>{currentUser ? 'Open App Console' : 'Try the App Free'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#interactive-simulator"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-medium text-sm transition group"
            >
              <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Watch Live Demo</span>
            </a>
          </div>

          {/* Metrics & Performance Pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-zinc-800/60 text-left">
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm">
              <div className="text-xl font-bold font-mono text-indigo-400">0.06s</div>
              <div className="text-xs text-zinc-400 mt-0.5">Audit Latency</div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm">
              <div className="text-xl font-bold font-mono text-emerald-400">100%</div>
              <div className="text-xs text-zinc-400 mt-0.5">Deterministic Ledger</div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm">
              <div className="text-xl font-bold font-mono text-purple-400">5 / 5</div>
              <div className="text-xs text-zinc-400 mt-0.5">Collision Precision</div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm">
              <div className="text-xl font-bold font-mono text-zinc-200">Linear + GH</div>
              <div className="text-xs text-zinc-400 mt-0.5">Native Dispatch</div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* INTERACTIVE ANIMATED PRODUCT SIMULATOR (Linear / Resend Inspired) */}
        {/* ------------------------------------------------------------------ */}
        <section id="interactive-simulator" className="px-6 lg:px-12 max-w-6xl mx-auto pb-24 scroll-mt-20">
          
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE INTERACTIVE SIMULATION</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Watch SyncState trap drift in 5 steps.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Test how real-time speech triggers instant memory audits, circuit breaker containment, and Linear ticket generation.
            </p>
          </div>

          {/* macOS Chrome Window Frame with Linear Border Glow */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950 shadow-2xl shadow-indigo-950/50 overflow-hidden ring-1 ring-white/10 relative">
            
            {/* Top macOS Header Bar with View Switcher */}
            <div className="px-4 py-3 bg-zinc-900/95 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              
              {/* Traffic Lights & Title */}
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-zinc-400 pl-3 hidden sm:inline">
                  syncstate://governance-engine/workspace:core-eng
                </span>
              </div>

              {/* Scenario Selector Tabs */}
              <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                {(['stack', 'deadlock', 'ownership'] as ScenarioKey[]).map((scenKey) => (
                  <button
                    key={scenKey}
                    onClick={() => handleScenarioChange(scenKey)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition ${
                      activeScenario === scenKey
                        ? 'bg-indigo-600 text-white font-medium shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {scenarios[scenKey].label}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle: Interactive UI vs Realtime Telemetry Terminal */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs font-mono">
                  <button
                    onClick={() => setScreenTab('simulation')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition ${
                      screenTab === 'simulation'
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Interactive Screen
                  </button>
                  <button
                    onClick={() => setScreenTab('telemetry')}
                    className={`px-2.5 py-1 rounded-md text-[11px] flex items-center space-x-1 transition ${
                      screenTab === 'telemetry'
                        ? 'bg-zinc-800 text-zinc-100 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Terminal className="w-3 h-3 text-indigo-400" />
                    <span>Telemetry JSON</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Stepper Progress Bar (Step 0 to 4) */}
            <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-4 py-2 flex items-center justify-between text-xs font-mono overflow-x-auto">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {[
                  { step: 0, label: '1. Ingest' },
                  { step: 1, label: '2. Ledger Scan' },
                  { step: 2, label: '3. Collision Trapped' },
                  { step: 3, label: '4. Decision Sign-off' },
                  { step: 4, label: '5. Linear Dispatched' }
                ].map((item) => (
                  <button
                    key={item.step}
                    onClick={() => handleStepSelect(item.step)}
                    className={`flex items-center space-x-1.5 py-1 px-2 rounded transition whitespace-nowrap ${
                      simStep === item.step
                        ? 'text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20'
                        : simStep > item.step
                        ? 'text-zinc-400 hover:text-zinc-200'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {simStep > item.step ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${simStep === item.step ? 'bg-indigo-400 animate-ping' : 'bg-zinc-700'}`} />
                    )}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Play / Pause / Replay Controls */}
              <div className="flex items-center space-x-2 pl-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                  title={isPlaying ? 'Pause auto-play' : 'Resume auto-play'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={() => {
                    setSimStep(0);
                    setUserOverrideTriggered(false);
                  }}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                  title="Replay simulation from start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* MAIN STAGE CONTENT */}
            {screenTab === 'simulation' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
                
                {/* Left Column: Live Audio Stream & Transcript Ingest */}
                <div className="md:col-span-5 p-5 border-r border-zinc-800/80 bg-zinc-950/60 space-y-4 font-mono text-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    
                    {/* Audio Status Header with Live Equalizer Waves */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                          Live Diarized Speech Ingest
                        </span>
                      </div>
                      
                      {/* Active Animated EQ Waves */}
                      <div className="flex items-end space-x-1 h-5">
                        <div className="w-1 bg-indigo-500 rounded-full animate-eq-1" />
                        <div className="w-1 bg-indigo-400 rounded-full animate-eq-2" />
                        <div className="w-1 bg-purple-400 rounded-full animate-eq-3" />
                        <div className="w-1 bg-purple-500 rounded-full animate-eq-4" />
                        <div className="w-1 bg-indigo-500 rounded-full animate-eq-5" />
                      </div>
                    </div>

                    {/* Speaker Turn 1 (Historical anchor) */}
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1 opacity-60 transition">
                      <div className="flex justify-between text-indigo-400 font-semibold text-[11px]">
                        <span>Alex Rivera (Tech Lead)</span>
                        <span className="text-zinc-400 font-mono">00:01:10</span>
                      </div>
                      <p className="text-zinc-300 font-sans text-xs">
                        "For our core database architecture, we committed to PostgreSQL and signed off the schema baseline."
                      </p>
                    </div>

                    {/* Active Candidate Turn (Triggers Conflict) */}
                    <div
                      className={`p-3.5 rounded-xl border transition-all duration-300 relative ${
                        simStep >= 2
                          ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-950/30'
                          : simStep === 1
                          ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-950/30'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[11px] mb-1.5">
                        <span className="font-semibold text-zinc-200 flex items-center space-x-1.5">
                          <span className={`w-2 h-2 rounded-full ${simStep >= 2 ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                          <span className="text-white font-medium">{currentScen.speaker}</span>
                          <span className="text-zinc-400 text-[10px]">({currentScen.speakerRole})</span>
                        </span>
                        <span className="text-zinc-400 font-mono">{currentScen.timestamp}</span>
                      </div>

                      <p className="text-zinc-200 font-sans text-xs leading-relaxed">
                        "{currentScen.speechText}"
                      </p>

                      {/* Micro Stage Pill */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">Audio Format: 16-bit PCM @ 16kHz</span>
                        <span className={`${simStep >= 2 ? 'text-rose-400 font-bold' : 'text-indigo-400'}`}>
                          {simStep === 0 && '● Capturing Audio...'}
                          {simStep === 1 && '● Vector Auditing...'}
                          {simStep >= 2 && '⚠ Drift Intercepted'}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Micro Footer Status */}
                  <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>NLP Assignee & Action Binding</span>
                    <span className="text-emerald-400 font-semibold">Autonomous</span>
                  </div>
                </div>

                {/* Right Column: Animated Institutional Memory & Governance Engine */}
                <div className="md:col-span-7 p-6 bg-zinc-900/30 flex flex-col justify-between space-y-4 relative overflow-hidden">
                  
                  {/* Laser Scanline Effect during Step 1 (Ledger Audit) */}
                  {simStep === 1 && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-scanline z-20 pointer-events-none" />
                  )}

                  <div className="space-y-4">
                    
                    {/* Top Governance Engine Status Pill */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        {simStep >= 3 ? (
                          <span className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>GOVERNANCE AUDIT RESOLVED & SIGNED OFF</span>
                          </span>
                        ) : simStep === 2 ? (
                          <span className="font-semibold text-rose-400 flex items-center space-x-1.5 animate-pulse">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span>CROSS-MEETING ARCHITECTURAL COLLISION DETECTED</span>
                          </span>
                        ) : simStep === 1 ? (
                          <span className="font-semibold text-indigo-400 flex items-center space-x-1.5">
                            <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                            <span>SCANNING INSTITUTIONAL MEMORY LEDGER...</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-zinc-400 flex items-center space-x-1.5">
                            <Shield className="w-4 h-4 text-zinc-400" />
                            <span>INSTITUTIONAL MEMORY LEDGER STANDBY</span>
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded text-[11px] border border-zinc-800 flex items-center space-x-1.5">
                        <span>Vector Match:</span>
                        <span className={`font-bold ${simStep >= 2 ? 'text-rose-400' : 'text-indigo-400'}`}>
                          {simStep === 0 ? '0%' : simStep === 1 ? '78%...' : `${currentScen.matchScore}%`}
                        </span>
                      </div>
                    </div>

                    {/* Step 1 & 2: Conflict Containment Card */}
                    <div
                      className={`p-4 rounded-xl transition-all duration-300 space-y-3 border relative ${
                        simStep >= 3
                          ? 'bg-zinc-950 border-emerald-500/40'
                          : simStep === 2
                          ? 'bg-zinc-950 border-rose-500/50 shadow-xl shadow-rose-950/20'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      {/* Badge & Ref ID */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded border ${currentScen.badgeColor}`}>
                          {currentScen.collisionType}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          Matched Against {currentScen.historicalId} ({currentScen.historicalDate})
                        </span>
                      </div>

                      {/* Past Agreement vs New Proposal Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                          <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">
                            Locked Institutional Baseline
                          </span>
                          <p className="text-zinc-200 font-medium leading-snug">
                            {currentScen.historicalStance}
                          </p>
                        </div>
                        <div
                          className={`p-2.5 rounded-lg border transition ${
                            simStep >= 2
                              ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-mono text-rose-400 block mb-1">
                            New Meeting Proposal
                          </span>
                          <p className="font-medium leading-snug">
                            "{currentScen.speechText}"
                          </p>
                        </div>
                      </div>

                      {/* AI Agent Audit Explanation */}
                      <div className="text-xs p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-start space-x-2">
                        <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed text-zinc-300">
                          <strong className="text-white">Deterministic Audit:</strong> {currentScen.auditExplanation}
                        </p>
                      </div>

                      {/* Interactive Action Buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-mono text-zinc-400">
                          Governance Action Required
                        </span>
                        <div className="flex items-center space-x-2 text-xs">
                          <button
                            onClick={() => handleStepSelect(0)}
                            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
                          >
                            Discard Candidate
                          </button>
                          <button
                            onClick={handleManualOverride}
                            className={`px-3 py-1 rounded-lg font-medium transition shadow flex items-center space-x-1 ${
                              simStep >= 3
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                          >
                            {simStep >= 3 ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Override Approved</span>
                              </>
                            ) : (
                              <span>Approve Override RFC</span>
                            )}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Step 4: Dispatched Linear Ticket Preview (Linear Inspired Card) */}
                    {simStep >= 4 && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-zinc-900 via-indigo-950/20 to-zinc-900 border border-indigo-500/40 space-y-2 animate-float">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center space-x-1.5 text-indigo-400 font-bold">
                            <GitPullRequest className="w-3.5 h-3.5" />
                            <span>LINEAR TICKET AUTO-DISPATCHED</span>
                          </span>
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            ✓ {currentScen.linearIssueId} CREATED
                          </span>
                        </div>
                        <div className="text-xs text-zinc-200 font-medium">
                          {currentScen.linearIssueTitle}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
                          <span>Assignee: {currentScen.linearAssignee}</span>
                          <span className="text-zinc-500">Team: {currentScen.linearTeam}</span>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Circuit Breaker Dispatch Bar */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                      simStep >= 3
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : simStep === 2
                        ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {simStep >= 3 ? (
                        <>
                          <Unlock className="w-4 h-4 text-emerald-400" />
                          <span className="font-medium text-emerald-300">
                            Issue Dispatch Circuit Breaker: Unlocked. Linear & GitHub sync active.
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-rose-400" />
                          <span className="font-medium text-rose-300">
                            Issue Dispatch Circuit Breaker: Locked (1 collision pending team review).
                          </span>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={handleTryApp}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shrink-0 ml-2"
                    >
                      Open Live Console
                    </button>
                  </div>

                </div>

              </div>
            ) : (
              /* REALTIME TELEMETRY EVENT STREAM TAB (Resend Inspired) */
              <div className="p-6 bg-zinc-950 font-mono text-xs space-y-4 min-h-[480px] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-zinc-200 font-semibold">Resend-Grade Audit Event Stream</span>
                      <span className="text-zinc-500 text-[11px]">// real-time event pipeline</span>
                    </div>
                    <button
                      onClick={copyTelemetry}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition text-[11px]"
                    >
                      {copiedLog ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLog ? 'Copied JSON!' : 'Copy Event Payload'}</span>
                    </button>
                  </div>

                  {/* Terminal JSON Block */}
                  <pre className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                    <code>
                      {`{\n`}
                      {`  "event_id": "evt_${Math.random().toString(36).substring(2, 9)}",\n`}
                      {`  "timestamp": "${new Date().toISOString()}",\n`}
                      {`  "pipeline_stage": "${['INGESTION', 'MEMORY_SCAN', 'COLLISION_TRAPPED', 'RESOLVED', 'LINEAR_DISPATCHED'][simStep]}",\n`}
                      {`  "scenario": "${currentScen.id}",\n`}
                      {`  "speaker": {\n`}
                      {`    "name": "${currentScen.speaker}",\n`}
                      {`    "role": "${currentScen.speakerRole}",\n`}
                      {`    "timestamp": "${currentScen.timestamp}"\n`}
                      {`  },\n`}
                      {`  "transcript_text": "${currentScen.speechText}",\n`}
                      {`  "audit_engine": {\n`}
                      {`    "vector_similarity": ${currentScen.matchScore / 100},\n`}
                      {`    "collision_type": "${currentScen.collisionType}",\n`}
                      {`    "historical_baseline_ref": "${currentScen.historicalId}",\n`}
                      {`    "circuit_breaker": "${simStep >= 3 ? 'BYPASSED_RESOLVED' : 'ENGAGED_LOCKED'}"\n`}
                      {`  },\n`}
                      {`  "downstream_dispatch": {\n`}
                      {`    "target": "Linear",\n`}
                      {`    "ticket_id": "${currentScen.linearIssueId}",\n`}
                      {`    "ticket_title": "${currentScen.linearIssueTitle}",\n`}
                      {`    "status": "${simStep >= 4 ? 'DISPATCHED_TO_LINEAR_API_200_OK' : 'PENDING_RESOLVE'}"\n`}
                      {`  }\n`}
                      {`}`}
                    </code>
                  </pre>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Stream Protocol: WebSockets + Server-Sent Events</span>
                  <span className="text-indigo-400 font-mono">Status: 200 OK • Stream Active</span>
                </div>
              </div>
            )}

          </div>

        </section>

        {/* ------------------------------------------------------------------ */}
        {/* BENTO GRID: FOUR ARCHITECTURAL PILLARS (Linear / Trigger.dev Style) */}
        {/* ------------------------------------------------------------------ */}
        <section id="collision-engine" className="py-20 px-6 lg:px-12 max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-mono tracking-widest text-indigo-400 mb-3">Institutional Governance Architecture</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Four pillars engineered for zero drift.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Bento Card 1: Deep Collision Engine */}
            <div className="lg:col-span-2 p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition relative overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Deep Architectural Collision Engine</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Understands domain semantics rather than naive text matching. Detects tech stack reversals, interface contract inversions (e.g. gRPC vs REST), dependency deadlocks (load testing scheduled before webhook delivery), and feature ownership disputes.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300">
                  <span className="text-rose-400 block font-semibold mb-1">Contract Inversion</span>
                  Prevents breaking protocol shifts without team review.
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300">
                  <span className="text-amber-400 block font-semibold mb-1">Dependency Deadlock</span>
                  Blocks testing tasks that precede deliverable dates.
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300">
                  <span className="text-indigo-400 block font-semibold mb-1">Owner Dispute</span>
                  Catches overlapping feature assignments across sprints.
                </div>
              </div>
            </div>

            {/* Bento Card 2: Institutional Memory Ledger */}
            <div id="institutional-memory" className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-105 transition-transform">
                  <Database className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Institutional Memory Ledger</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Persistent SQLite memory that indexes agreements from day one. Every consensus stance is locked with speaker attribution, verbatim quotes, and chronological lineage.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Multi-Workspace Isolation</span>
                <span className="text-purple-400 font-semibold">Active</span>
              </div>
            </div>

            {/* Bento Card 3: Dual-Engine Live Voice Listener with Active Soundwave */}
            <div id="live-listener" className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                    <Radio className="w-5 h-5 text-rose-400 animate-pulse" />
                  </div>
                  {/* Miniature Equalizer Waveform */}
                  <div className="flex items-end space-x-1 h-4">
                    <div className="w-1 bg-rose-500 rounded-full animate-eq-1" />
                    <div className="w-1 bg-rose-400 rounded-full animate-eq-3" />
                    <div className="w-1 bg-rose-500 rounded-full animate-eq-2" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">$0.00 Live Voice Listener</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Runs directly in your browser. Captures 16-bit PCM microphone audio, automatically attributes tasks to named teammates, and filters out noise and small talk.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Native Browser Audio</span>
                <span className="text-emerald-400 font-semibold">$0.00 Tier</span>
              </div>
            </div>

            {/* Bento Card 4: Bi-Directional Issue Dispatch */}
            <div id="integrations" className="lg:col-span-2 p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                <GitPullRequest className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Linear & GitHub Dispatch</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Action items don't stay trapped in meeting transcripts. Staged tasks are cleaned of conversational chatter and posted directly to Linear teams or GitHub repositories with audit receipts and assignee links.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-Formatted Linear Markdown Tickets</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>GitHub Milestones & Issue Labels</span>
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cryptographic Governance Sign-off</span>
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* 10 EDGE CASES INTERACTIVE MATRIX */}
        {/* ------------------------------------------------------------------ */}
        <section id="edge-cases" className="py-20 px-6 lg:px-12 max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs uppercase font-mono tracking-widest text-indigo-400 mb-3">Audited Precision</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              The 10 Software Architecture Edge Cases
            </p>
            <p className="text-sm text-zinc-400">
              SyncState precisely detects the 5 true collisions while suppressing false alarms on the 5 compatible architectural progressions.
            </p>

            {/* Toggle Tabs */}
            <div className="inline-flex p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 mt-6">
              <button
                onClick={() => setActiveEdgeTab('collisions')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeEdgeTab === 'collisions'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                5 True Collisions (Flagged)
              </button>
              <button
                onClick={() => setActiveEdgeTab('compatible')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeEdgeTab === 'compatible'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                5 Compatible Evolutions (Allowed)
              </button>
            </div>
          </div>

          <div className="space-y-3.5 max-w-4xl mx-auto">
            {edgeCases[activeEdgeTab].map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${item.badgeColor}`}>
                      {item.type}
                    </span>
                    <span className="text-zinc-400 font-mono text-[11px]">Domain: {item.tag}</span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400">Case #{idx + 1}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">Historical Baseline</span>
                    <p className="text-zinc-300">{item.past}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">New Proposal</span>
                    <p className="text-zinc-200">{item.proposal}</p>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 pt-1 flex items-start space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-400"><strong className="text-zinc-300">Audit Stance:</strong> {item.audit}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* BOTTOM HERO SECTION (Call To Action) */}
        {/* ------------------------------------------------------------------ */}
        <section className="py-24 px-6 lg:px-12 max-w-5xl mx-auto text-center relative">
          <div className="p-12 md:p-16 rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-900/40 to-zinc-950 border border-indigo-500/30 relative overflow-hidden shadow-2xl shadow-indigo-950/50">
            
            {/* Ambient Radial Gradient Halo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-transparent blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-semibold">
                Autonomous Governance Awaits
              </span>
              
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Stop meeting drift before <br />
                it breaks production.
              </h2>
              
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
                Ingest your first meeting transcript or start the zero-cost voice listener now. Eliminate forgotten agreements, overlapping tasks, and silent architectural reversals.
              </p>

              {/* Big Bottom Action Button */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleTryApp}
                  className="w-full sm:w-auto flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-base shadow-2xl shadow-indigo-600/40 ring-1 ring-white/20 transition-all active:scale-95 group"
                >
                  <span>{currentUser ? 'Open SyncState Workspace' : 'Try SyncState Platform Free'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="pt-3 text-xs text-zinc-400 flex items-center justify-center space-x-4 font-mono">
                <span>✓ 100% Deterministic Local Engine</span>
                <span>•</span>
                <span>✓ Zero Cloud API Lock-in</span>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950/90 py-8 px-6 lg:px-12 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-zinc-200">SyncState</span>
            <span>— Autonomous Meeting Governance & Execution Engine</span>
          </div>

          <div className="flex items-center space-x-6 text-zinc-400 font-mono text-[11px]">
            <span className="flex items-center space-x-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Governance Systems Operational</span>
            </span>
            <button onClick={() => onNavigate('/auth')} className="hover:text-zinc-200 transition">
              Sign In / Sign Up
            </button>
            <button onClick={handleTryApp} className="hover:text-zinc-200 transition">
              Launch App Console
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};
