import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Database,
  Lock,
  Unlock,
  GitPullRequest,
  Check,
  ChevronRight,
  Radio,
  RefreshCw,
  Terminal,
  Play,
  Pause,
  RotateCcw,
  Copy,
  CheckCheck,
  Activity,
  Search,
  GitCommit,
  ExternalLink,
  Filter,
  Sparkles,
  Clock,
  GitBranch
} from 'lucide-react';
import { UserInfo } from '../types';
import { HeroGearCanvas } from './HeroGearCanvas';
import { AmbientStageBackground } from './ui/AmbientStageBackground';
import { CobaltSprite } from './CobaltSprite';

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
  githubIssueId: string;
  githubIssueTitle: string;
  githubAssignee: string;
  githubRepo: string;
}

export interface LedgerDecision {
  id: string;
  topic: string;
  category: 'database' | 'timeline' | 'api' | 'security';
  categoryLabel: string;
  badgeColor: string;
  title: string;
  status: 'ACTIVE' | 'RATIFIED' | 'MONITORED';
  speaker: string;
  speakerRole: string;
  meetingTitle: string;
  meetingDate: string;
  timestamp: string;
  verbatimQuote: string;
  evolution: {
    stage: string;
    meeting: string;
    note: string;
    type: 'baseline' | 'collision' | 'resolution';
  }[];
  githubIssue: {
    id: string;
    title: string;
    status: string;
  };
  hash: string;
}

const LEDGER_DECISIONS: LedgerDecision[] = [
  {
    id: 'DEC-001',
    topic: 'DATABASE_ARCHITECTURE',
    category: 'database',
    categoryLabel: 'Database Architecture',
    badgeColor: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10',
    title: 'Standardize on PostgreSQL for primary transactional datastore',
    status: 'RATIFIED',
    speaker: 'Alex',
    speakerRole: 'Tech Lead',
    meetingTitle: 'meeting_1_baseline.vtt',
    meetingDate: 'Nov 01, 2026',
    timestamp: '00:01:10 #0',
    verbatimQuote: 'We chose PostgreSQL for our database architecture and we are completely standardizing on it.',
    evolution: [
      {
        stage: 'Baseline Ingestion',
        meeting: 'Meeting 1 (Baseline)',
        note: 'Consensus locked: PostgreSQL selected for relational ACID compliance.',
        type: 'baseline'
      },
      {
        stage: 'Contradiction Trapped',
        meeting: 'Meeting 2 (Lifecycle Progress)',
        note: 'David proposed MongoDB for dynamic JSON. Circuit breaker engaged: Tech Stack Reversal blocked.',
        type: 'collision'
      },
      {
        stage: 'Consensus Ratified',
        meeting: 'Meeting 3 (Ratification)',
        note: 'Team agreed PostgreSQL remains primary DB; MongoDB approved solely for unvalidated raw event logs.',
        type: 'resolution'
      }
    ],
    githubIssue: {
      id: '104',
      title: 'Standardize Postgres connection pooling & Prisma migrations',
      status: 'DISPATCHED'
    },
    hash: 'sha256:8f2a...c4b1'
  },
  {
    id: 'DEC-002',
    topic: 'RELEASE_TIMELINE',
    category: 'timeline',
    categoryLabel: 'Release Milestones',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    title: 'Hard release freeze locked for November 15th to allow 2 weeks QA',
    status: 'ACTIVE',
    speaker: 'Alex',
    speakerRole: 'Tech Lead',
    meetingTitle: 'meeting_1_baseline.vtt',
    meetingDate: 'Nov 01, 2026',
    timestamp: '00:02:50 #1',
    verbatimQuote: 'Our hard release freeze deadline is set for November 15th to allow two full weeks of QA testing.',
    evolution: [
      {
        stage: 'Milestone Locked',
        meeting: 'Meeting 1 (Baseline)',
        note: 'Release freeze set for Nov 15th. 14 days mandatory QA buffer.',
        type: 'baseline'
      },
      {
        stage: 'Timeline Slip Alert',
        meeting: 'Meeting 2 (Lifecycle Progress)',
        note: 'Priya suggested Dec 1st freeze. Collision Engine flagged schedule conflict against staging deployment.',
        type: 'collision'
      },
      {
        stage: 'Schedule Preserved',
        meeting: 'Meeting 3 (Ratification)',
        note: 'Alex & Priya signed off: Nov 15th release freeze reaffirmed with reduced non-critical scope.',
        type: 'resolution'
      }
    ],
    githubIssue: {
      id: '108',
      title: 'QA staging freeze verification checklist & regression tests',
      status: 'DISPATCHED'
    },
    hash: 'sha256:4d1e...9a7f'
  },
  {
    id: 'DEC-003',
    topic: 'API_CONTRACT',
    category: 'api',
    categoryLabel: 'API Contracts',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    title: 'Internal microservices strictly standardized on REST JSON & OpenAPI specs',
    status: 'ACTIVE',
    speaker: 'Alex',
    speakerRole: 'Tech Lead',
    meetingTitle: 'meeting_1_baseline.vtt',
    meetingDate: 'Nov 01, 2026',
    timestamp: '00:04:30 #3',
    verbatimQuote: 'We decided that all internal microservices will use REST JSON endpoints with strict OpenAPI contracts.',
    evolution: [
      {
        stage: 'Contract Standardized',
        meeting: 'Meeting 1 (Baseline)',
        note: 'REST JSON agreed across all backend services with automated OpenAPI contract validation.',
        type: 'baseline'
      },
      {
        stage: 'Interface Audit Verified',
        meeting: 'Meeting 2 (Lifecycle Progress)',
        note: 'Stripe webhook integration audited for European multi-currency; zero contract inversions detected.',
        type: 'resolution'
      }
    ],
    githubIssue: {
      id: '112',
      title: 'Generate OpenAPI 3.1 schema specs for billing & profile services',
      status: 'DISPATCHED'
    },
    hash: 'sha256:3b7c...e210'
  },
  {
    id: 'DEC-004',
    topic: 'SECURITY_POLICY',
    category: 'security',
    categoryLabel: 'Security & Auth',
    badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    title: 'Mandatory Multi-Factor Authentication (MFA) required for admin accounts',
    status: 'ACTIVE',
    speaker: 'Priya',
    speakerRole: 'Product Lead',
    meetingTitle: 'meeting_1_baseline.vtt',
    meetingDate: 'Nov 01, 2026',
    timestamp: '00:07:08 #6',
    verbatimQuote: 'Our team policy is to require MFA login for all administrative user accounts.',
    evolution: [
      {
        stage: 'Policy Enacted',
        meeting: 'Meeting 1 (Baseline)',
        note: 'MFA requirement established for all administrative privileges and internal dashboards.',
        type: 'baseline'
      },
      {
        stage: 'Ownership Handoff Tracked',
        meeting: 'Meeting 2 (Lifecycle Progress)',
        note: 'Rahul handed off auth & JWT session migration to David to accelerate enterprise SSO roadmap.',
        type: 'resolution'
      }
    ],
    githubIssue: {
      id: '115',
      title: 'Enforce TOTP / WebAuthn MFA on admin authentication routes',
      status: 'DISPATCHED'
    },
    hash: 'sha256:7c9d...5a44'
  }
];

export const LandingPage: React.FC<Props> = ({ onNavigate, onEnterApp, onOpenLiveListener, currentUser }) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [scrollY, setScrollY] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => {
      const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
      setScrollY(currentScroll);
    };

    // Run immediately on mount
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTryApp = () => {
    if (onEnterApp) {
      onEnterApp();
    } else if (currentUser) {
      onNavigate('/app');
    } else {
      onNavigate('/signup');
    }
  };

  // Interactive Simulation State (Animated workflow)
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('stack');
  const [simStep, setSimStep] = useState<number>(0); // 0: Ingest, 1: Ledger Scan, 2: Collision Trap, 3: Resolved, 4: Dispatched
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [screenTab, setScreenTab] = useState<'simulation' | 'telemetry'>('simulation');
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  // Institutional Memory Ledger Explorer State
  const [ledgerCategory, setLedgerCategory] = useState<'all' | 'database' | 'timeline' | 'api' | 'security'>('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>('DEC-001');

  const filteredDecisions = LEDGER_DECISIONS.filter((dec) => {
    const matchesCat = ledgerCategory === 'all' || dec.category === ledgerCategory;
    const matchesSearch =
      ledgerSearch.trim() === '' ||
      dec.title.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      dec.topic.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      dec.speaker.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      dec.verbatimQuote.toLowerCase().includes(ledgerSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeDecision =
    LEDGER_DECISIONS.find((d) => d.id === selectedDecisionId) || filteredDecisions[0] || LEDGER_DECISIONS[0];

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
      githubIssueId: '104',
      githubIssueTitle: 'RFC Required: PostgreSQL to MongoDB Stack Reversal Stance',
      githubAssignee: 'Sam Chen',
      githubRepo: 'acme-corp/product-roadmap'
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
      githubIssueId: '105',
      githubIssueTitle: 'Timeline Realignment: Stripe Gateway Prerequisite before QA Load Test',
      githubAssignee: 'Sarah Jenkins',
      githubRepo: 'acme-corp/product-roadmap'
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
      githubIssueId: '106',
      githubIssueTitle: 'Ownership Handoff: JWT Migration Transfer (Rahul → David)',
      githubAssignee: 'David Kim',
      githubRepo: 'acme-corp/product-roadmap'
    }
  };

  const currentScen = scenarios[activeScenario];

  // Auto-play simulation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimStep((prev) => (prev + 1) % 5);
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
  };

  const handleManualOverride = () => {
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
        stage: ['INGESTION', 'MEMORY_SCAN', 'COLLISION_TRAPPED', 'RESOLVED', 'GITHUB_DISPATCHED'][simStep],
        speaker: { name: currentScen.speaker, role: currentScen.speakerRole },
        transcript: currentScen.speechText,
        collision: {
          type: currentScen.collisionType,
          confidence: currentScen.matchScore / 100,
          historical_ref: currentScen.historicalId,
          explanation: currentScen.auditExplanation
        },
        github_dispatch: {
          issue_id: currentScen.githubIssueId,
          title: currentScen.githubIssueTitle,
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

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">

      {/* Top Floating Glass Navigation (Resend-Style Glassmorphism) */}
      {/* Dynamic Scroll Glassmorphism: Purely transparent at top, frosted glass on scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full px-6 lg:px-14 transition-all duration-300 ease-in-out ${
          scrollY > 15
            ? 'backdrop-blur-xl bg-black/60 border-b border-white/[0.08] py-3.5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
            : 'bg-transparent border-b border-transparent py-5 sm:py-6 shadow-none'
        }`}
        style={{
          WebkitBackdropFilter: scrollY > 15 ? 'blur(16px)' : 'none',
        }}
      >
        <div className="max-w-[1380px] mx-auto flex items-center justify-between">

          {/* Left Cluster: Logo & Navigation Links grouped together (Matches Trigger.dev format) */}
          <div className="flex items-center space-x-8 lg:space-x-10">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3.5 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-600/25 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
                <Layers className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                SyncState
              </span>
            </div>

            {/* Desktop Nav Links (Grouped in page chronological order) */}
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-sm font-medium text-zinc-400">
              <a href="#interactive-simulator" className="hover:text-zinc-200 transition flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Demo</span>
              </a>
              <a href="#institutional-memory" className="hover:text-zinc-200 transition">Memory Ledger</a>
              <a href="#collision-engine" className="hover:text-zinc-200 transition">Collision Engine</a>
            </nav>
          </div>

          {/* Right Cluster: Action CTAs (Log in & Elongated Get started) */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {currentUser ? (
              <button
                onClick={() => onNavigate('/app')}
                className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-medium transition"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="truncate max-w-[120px]">{currentUser.name.split(' ')[0]}</span>
                <span className="text-xs text-indigo-400 font-mono">App →</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('/login')}
                className="text-sm font-medium text-zinc-400 hover:text-white px-3 py-1.5 transition-colors"
              >
                Log in
              </button>
            )}

            {/* Elongated Get Started Button (Preserving Existing Design, with Subtle Arrow) */}
            <button
              onClick={handleTryApp}
              className="flex items-center justify-center space-x-1.5 px-6 sm:px-7 py-2 min-w-[130px] rounded-full bg-[#1e1e23] hover:bg-[#282830] border border-white/10 hover:border-white/20 text-white text-sm font-medium transition active:scale-95 shadow-sm"
            >
              <span>{currentUser ? 'Open App' : 'Get started'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Landing Flow */}
      <main className="relative z-10 flex-1">

        {/* HERO SECTION: 2-Column Split Layout with 3D Procedural Interlocking Gears (Resend Aesthetic) */}
        {/* Full width container allows exact equal border distances for the two hero divs */}
        {/* Generous bottom padding (pb-36 md:pb-52) lets the ambient stage light trail breathe and naturally taper without clipping */}
        <section className={`pt-28 pb-36 md:pt-36 md:pb-52 w-full relative transition-all duration-1000 ease-out overflow-hidden ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>

          {/* Resend-Inspired Volumetric Stage Lighting Background (4-Layer Anamorphic Light Streaks + SVG Micro-Dither) */}
          <AmbientStageBackground showBacklightPedestal={true} animated={true} />

          {/* =========================================================================
              TWO-DIV SPACING CONTROL FUNCTION (Only controls these two divs):
              - Param 1 (`borderDistance` = 100): Both text & gearbox divs are EXACTLY
                100px away from their respective left & right webpage borders.
              - Param 2 (`distanceBetween` = 48): Minimum gap between the two divs.
              ========================================================================= */}
          <div
            className="w-full flex flex-col lg:flex-row items-center justify-between"
            style={{
              paddingLeft: 'max(24px, 300px)',
              paddingRight: 'max(24px, 200px)',
              columnGap: '48px',
            }}
          >

            {/* Div 1: Left Text Container (Pinned exactly 100px from left screen border) */}
            <div className="flex-1 max-w-[650px] text-left relative z-10 pr-0 lg:pr-4">

              {/* Platform Pill */}
              <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs sm:text-sm text-zinc-300 shadow-xl mb-8 hover:border-white/20 transition cursor-default">
                <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-ping" />
                <span className="font-medium text-zinc-200">Autonomous Meeting Governance</span>
                <span className="text-zinc-600">|</span>
                <span className="text-indigo-400 font-mono text-xs flex items-center space-x-1">
                  <span>Zero Silent Drift</span>
                  <ChevronRight className="w-3.5 h-3.5 inline ml-0.5" />
                </span>
              </div>

              {/* Developer Headline: Your codebase has Git. Your decisions have SyncState. (Original styling restored) */}
              <h1 className="text-4xl sm:text-6xl lg:text-[72px] xl:text-[80px] font-extrabold tracking-[-0.04em] text-white leading-[1.08] mb-9">
                Your codebase has Git. <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
                  Your decisions have SyncState.
                </span>
              </h1>

              {/* Resend-Style Descriptive Subheadline */}
              <p className="text-base sm:text-lg text-zinc-400 font-normal leading-relaxed mb-10 max-w-[560px]">
                The autonomous platform that audits meeting speech in real-time, traps architectural contradictions against institutional memory, and dispatches verified issues directly to GitHub.
              </p>

              {/* Resend-Inspired Action Buttons (Exact Dark Frosted Pill + Text Link) */}
              <div className="flex items-center space-x-6 mb-12">
                <button
                  onClick={handleTryApp}
                  className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-full bg-[#18181b] hover:bg-[#27272a] border border-white/20 text-white font-medium text-sm transition-all active:scale-95 shadow-lg shadow-black/40"
                >
                  <span>{currentUser ? 'Open App Console' : 'Get started'}</span>
                </button>

                <a
                  href="#interactive-simulator"
                  className="flex items-center space-x-1.5 text-zinc-400 hover:text-white font-medium text-sm transition group"
                >
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Watch Live Demo</span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>

              {/* Metrics & Performance Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-7 border-t border-white/[0.08] text-left">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="text-2xl font-bold font-mono text-indigo-400 tracking-tight">0.06s</div>
                  <div className="text-xs text-zinc-400 mt-1 font-medium">Audit Latency</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">100%</div>
                  <div className="text-xs text-zinc-400 mt-1 font-medium">Deterministic Ledger</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="text-2xl font-bold font-mono text-purple-400 tracking-tight">5 / 5</div>
                  <div className="text-xs text-zinc-400 mt-1 font-medium">Collision Precision</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                  <div className="text-2xl font-bold font-mono text-zinc-200 tracking-tight">GitHub</div>
                  <div className="text-xs text-zinc-400 mt-1 font-medium">Issue Dispatch</div>
                </div>
              </div>

            </div>

            {/* Div 2: Right Gearbox Animation (Pinned exactly 100px from right screen border) */}
            <div className="flex-shrink-0 flex items-center justify-center relative">
              <HeroGearCanvas xOffset={0} scale={1.05} width="580px" height="680px" />
            </div>

          </div>

        </section>

        {/* ------------------------------------------------------------------ */}
        {/* INTERACTIVE ANIMATED PRODUCT SIMULATOR */}
        {/* PARALLAX EFFECT 1: Floats upward with parallax depth on scroll */}
        {/* ------------------------------------------------------------------ */}
        <section
          id="interactive-simulator"
          className="px-6 lg:px-14 max-w-[1440px] mx-auto pb-28 scroll-mt-20 relative transition-transform duration-100 ease-out"
          style={{
            transform: `translateY(${Math.max(-45, Math.min(45, (scrollY - 420) * -0.07))}px)`
          }}
        >
          {/* Ambient Parallax Backdrop Glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none -z-10"
            style={{
              transform: `translate(-50%, -50%) translateY(${(scrollY - 420) * 0.05}px)`
            }}
          />

          {/* Resend-Style Curved Dome Banner (Broader than demo box with fair gap) */}
          <div className="w-full max-w-[1400px] mx-auto mb-20 relative">
            <div className="rounded-t-[44px] sm:rounded-t-[56px] border-t border-white/[0.18] bg-gradient-to-b from-white/[0.04] via-transparent to-transparent pt-14 pb-8 px-8 text-center relative overflow-hidden">
              {/* Top soft radial glow matching Image 2 */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[680px] h-24 bg-white/[0.07] blur-3xl pointer-events-none rounded-full -translate-y-1/2" />
              <p className="text-sm sm:text-base text-zinc-300 font-normal leading-relaxed max-w-xl mx-auto">
                Engineering teams trust SyncState<br className="hidden sm:inline" /> to eliminate architectural drift across every sprint.
              </p>
            </div>
          </div>

          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Watch SyncState trap drift in 5 steps.
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-2">
              Test how real-time speech triggers instant memory audits, circuit breaker containment, and GitHub issue generation.
            </p>
          </div>

          {/* macOS Chrome Window Frame with Studio Border Glow */}
          <div className="max-w-[1320px] mx-auto rounded-2xl border border-white/[0.08] bg-[#121314] shadow-2xl overflow-hidden ring-1 ring-white/5 relative">

            {/* Top macOS Header Bar with View Switcher */}
            <div className="px-4 py-3 bg-[#050507] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">

              {/* Traffic Lights & Title */}
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-zinc-500 pl-3 hidden sm:inline">
                  syncstate://governance-engine/workspace:core-eng
                </span>
              </div>

              {/* Scenario Selector Tabs */}
              <div className="flex items-center space-x-1 bg-[#0a0a0c] p-1 rounded-[6px] border border-white/[0.08] text-xs">
                {(['stack', 'deadlock', 'ownership'] as ScenarioKey[]).map((scenKey) => (
                  <button
                    key={scenKey}
                    onClick={() => handleScenarioChange(scenKey)}
                    className={`px-2.5 py-1 rounded-[4px] font-mono text-[11px] transition ${activeScenario === scenKey
                      ? 'bg-white/[0.08] text-white font-medium border border-white/[0.1] shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                  >
                    {scenarios[scenKey].label}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle: Interactive UI vs Realtime Telemetry Terminal */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-[#0a0a0c] p-0.5 rounded-[6px] border border-white/[0.08] text-xs font-mono">
                  <button
                    onClick={() => setScreenTab('simulation')}
                    className={`px-2.5 py-1 rounded-[4px] text-[11px] transition ${screenTab === 'simulation'
                      ? 'bg-white/[0.08] text-zinc-100 font-medium border border-white/[0.1] shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                  >
                    Interactive Screen
                  </button>
                  <button
                    onClick={() => setScreenTab('telemetry')}
                    className={`px-2.5 py-1 rounded-[4px] text-[11px] flex items-center space-x-1 transition ${screenTab === 'telemetry'
                      ? 'bg-white/[0.08] text-zinc-100 font-medium border border-white/[0.1] shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                  >
                    <Terminal className="w-3 h-3 text-zinc-400" />
                    <span>Telemetry JSON</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Stepper Progress Bar (Step 0 to 4) */}
            <div className="bg-[#050507] border-b border-white/[0.08] px-4 py-2 flex items-center justify-between text-xs font-mono overflow-x-auto">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {[
                  { step: 0, label: '1. Ingest' },
                  { step: 1, label: '2. Ledger Scan' },
                  { step: 2, label: '3. Collision Trapped' },
                  { step: 3, label: '4. Decision Sign-off' },
                  { step: 4, label: '5. GitHub Dispatched' }
                ].map((item) => (
                  <button
                    key={item.step}
                    onClick={() => handleStepSelect(item.step)}
                    className={`flex items-center space-x-1.5 py-1 px-2 rounded-[4px] transition whitespace-nowrap ${simStep === item.step
                      ? 'text-zinc-100 bg-white/[0.08] font-medium border border-white/[0.12]'
                      : simStep > item.step
                        ? 'text-zinc-400 hover:text-zinc-200'
                        : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                  >
                    {simStep > item.step ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${simStep === item.step ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                    )}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Play / Pause / Replay Controls */}
              <div className="flex items-center space-x-2 pl-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded-[4px] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 transition"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={() => {
                    setSimStep(0);
                  }}
                  className="p-1 rounded-[4px] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* MAIN STAGE CONTENT */}
            {screenTab === 'simulation' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px]">

                {/* Left Column: Live Audio Stream & Transcript Ingest */}
                <div className="md:col-span-5 p-5 border-r border-white/[0.08] bg-[#121314] space-y-4 font-mono text-xs flex flex-col justify-between">
                  <div className="space-y-3">

                    {/* Audio Status Header with Live Equalizer Waves */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                      <div className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        <span className="font-mono text-[11px] text-zinc-300 lowercase">
                          live speech ingest
                        </span>
                      </div>

                      {/* Active Animated EQ Waves */}
                      <div className="flex items-end space-x-1 h-4">
                        <div className="w-0.5 bg-zinc-400 rounded-full animate-eq-1" />
                        <div className="w-0.5 bg-zinc-300 rounded-full animate-eq-2" />
                        <div className="w-0.5 bg-zinc-400 rounded-full animate-eq-3" />
                        <div className="w-0.5 bg-zinc-300 rounded-full animate-eq-4" />
                        <div className="w-0.5 bg-zinc-400 rounded-full animate-eq-5" />
                      </div>
                    </div>

                    {/* Speaker Turn 1 (Historical anchor) */}
                    <div className="p-3 rounded-[8px] bg-[#121314] hover:bg-[#1a1b1e] border border-white/[0.08] space-y-1 opacity-70 transition-colors">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-zinc-300 font-medium">Alex Rivera (Tech Lead)</span>
                        <span className="text-zinc-500 font-mono text-[10px]">00:01:10</span>
                      </div>
                      <p className="text-zinc-400 font-sans text-xs">
                        "For our core database architecture, we committed to PostgreSQL and signed off the schema baseline."
                      </p>
                    </div>

                    {/* Active Candidate Turn (Triggers Conflict) */}
                    <div
                      className={`p-3.5 rounded-[8px] border transition-colors relative bg-[#121314] hover:bg-[#1a1b1e] ${simStep >= 2
                        ? 'border-rose-500/40'
                        : simStep === 1
                          ? 'border-white/[0.16]'
                          : 'border-white/[0.08]'
                        }`}
                    >
                      <div className="flex justify-between items-center text-[11px] mb-1.5">
                        <span className="font-medium text-zinc-200 flex items-center space-x-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${simStep >= 2 ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                          <span className="text-zinc-100">{currentScen.speaker}</span>
                          <span className="text-zinc-500 text-[10px]">({currentScen.speakerRole})</span>
                        </span>
                        <span className="text-zinc-500 font-mono text-[10px]">{currentScen.timestamp}</span>
                      </div>

                      <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                        "{currentScen.speechText}"
                      </p>

                      {/* Micro Stage Status */}
                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">16-bit PCM @ 16kHz</span>
                        <span className={`${simStep >= 2 ? 'text-rose-400' : 'text-zinc-400'} lowercase`}>
                          {simStep === 0 && '● capturing audio'}
                          {simStep === 1 && '● vector auditing'}
                          {simStep >= 2 && 'drift intercepted'}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Micro Footer Status */}
                  <div className="p-2.5 rounded-[6px] bg-[#0a0a0c] border border-white/[0.06] text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                    <span>NLP action binding</span>
                    <span className="text-emerald-400 lowercase">autonomous</span>
                  </div>
                </div>

                {/* Right Column: Animated Institutional Memory & Governance Engine */}
                <div className="md:col-span-7 p-6 bg-[#121314] flex flex-col justify-between space-y-4 relative overflow-hidden">

                  {/* Laser Scanline Effect during Step 1 (Ledger Audit) */}
                  {simStep === 1 && (
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-scanline z-20 pointer-events-none" />
                  )}

                  <div className="space-y-4">

                    {/* Top Governance Engine Status Pill */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        {simStep >= 3 ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>governance audit resolved &amp; signed off</span>
                          </span>
                        ) : simStep === 2 ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            <span>architectural collision detected</span>
                          </span>
                        ) : simStep === 1 ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase text-zinc-300">
                            <RefreshCw className="w-3 h-3 text-zinc-400 animate-spin" />
                            <span>scanning institutional memory...</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                            <span>institutional memory standby</span>
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-zinc-400 bg-[#050507] px-2 py-0.5 rounded-[4px] text-[10px] border border-white/[0.08] flex items-center space-x-1.5">
                        <span>Vector Match:</span>
                        <span className={`font-medium ${simStep >= 2 ? 'text-rose-400' : 'text-zinc-200'}`}>
                          {simStep === 0 ? '0%' : simStep === 1 ? '78%...' : `${currentScen.matchScore}%`}
                        </span>
                      </div>
                    </div>

                    {/* Step 1 & 2: Conflict Containment Card */}
                    <div
                      className={`p-4 rounded-[10px] transition-all space-y-3 border bg-[#121314] hover:bg-[#1a1b1e] ${simStep >= 3
                        ? 'border-emerald-500/30'
                        : simStep === 2
                          ? 'border-rose-500/40 shadow-lg shadow-black/40'
                          : 'border-white/[0.08]'
                        }`}
                    >
                      {/* Badge & Ref ID */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase text-rose-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>{currentScen.collisionType.replace(/_/g, ' ').toLowerCase()}</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          Matched Against {currentScen.historicalId} ({currentScen.historicalDate})
                        </span>
                      </div>

                      {/* Past Agreement vs New Proposal Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-[6px] bg-[#0a0a0c] border border-white/[0.06]">
                          <span className="text-[10px] font-mono text-zinc-500 lowercase block mb-1">
                            locked institutional baseline
                          </span>
                          <p className="text-zinc-200 font-sans leading-relaxed text-xs">
                            {currentScen.historicalStance}
                          </p>
                        </div>
                        <div
                          className={`p-3 rounded-[6px] border transition ${simStep >= 2
                            ? 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                            : 'bg-[#0a0a0c] border-white/[0.06] text-zinc-300'
                            }`}
                        >
                          <span className="text-[10px] font-mono text-rose-400/90 lowercase block mb-1">
                            new meeting proposal
                          </span>
                          <p className="font-sans leading-relaxed text-xs">
                            "{currentScen.speechText}"
                          </p>
                        </div>
                      </div>

                      {/* AI Agent Audit Explanation */}
                      <div className="text-xs p-3 rounded-[6px] bg-[#0a0a0c] border border-white/[0.06] flex items-start space-x-2">
                        <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed text-zinc-300">
                          <strong className="text-zinc-100 font-medium">Audit:</strong> {currentScen.auditExplanation}
                        </p>
                      </div>

                      {/* Interactive Action Buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-mono text-zinc-500">
                          Governance action required
                        </span>
                        <div className="flex items-center space-x-2 text-xs">
                          <button
                            onClick={() => handleStepSelect(0)}
                            className="px-3 py-1.5 rounded-[5px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] font-medium transition"
                          >
                            Discard
                          </button>
                          <button
                            onClick={handleManualOverride}
                            className={`px-3 py-1.5 rounded-[5px] font-medium transition flex items-center space-x-1.5 ${simStep >= 3
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-zinc-100 hover:bg-white text-zinc-950 shadow-sm'
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

                    {/* Step 4: Dispatched GitHub Issue Preview */}
                    {simStep >= 4 && (
                      <div className="p-4 rounded-[10px] bg-[#121314] hover:bg-[#1a1b1e] border border-emerald-500/20 space-y-2 transition-colors">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium lowercase text-emerald-400">
                            <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
                            <span>github issue auto-dispatched</span>
                          </span>
                          <span className="text-zinc-400 text-[11px] font-mono">
                            ✓ #{currentScen.githubIssueId} created
                          </span>
                        </div>
                        <div className="text-xs font-medium text-zinc-100">
                          {currentScen.githubIssueTitle}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-white/[0.05]">
                          <span>Assignee: <strong className="text-zinc-200 font-normal">{currentScen.githubAssignee}</strong></span>
                          <span className="text-zinc-500">Repo: {currentScen.githubRepo}</span>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Circuit Breaker Dispatch Bar */}
                  <div
                    className={`p-3 rounded-[8px] border flex items-center justify-between text-xs font-mono transition bg-[#121314] hover:bg-[#1a1b1e] ${simStep >= 3
                      ? 'border-emerald-500/30 text-emerald-300'
                      : simStep === 2
                        ? 'border-rose-500/40 text-rose-300'
                        : 'border-white/[0.08] text-zinc-400'
                      }`}
                  >
                    <div className="flex items-center space-x-2">
                      {simStep >= 3 ? (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300 lowercase">
                            circuit breaker: unlocked (github sync active)
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="text-rose-300 lowercase">
                            circuit breaker: locked (1 collision pending review)
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleTryApp}
                      className="px-3 py-1 rounded-[5px] bg-white/[0.08] hover:bg-white/[0.12] text-zinc-200 font-medium text-xs border border-white/[0.1] transition shrink-0 ml-2"
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
                      {`  "pipeline_stage": "${['INGESTION', 'MEMORY_SCAN', 'COLLISION_TRAPPED', 'RESOLVED', 'GITHUB_DISPATCHED'][simStep]}",\n`}
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
                      {`    "target": "GitHub Issues",\n`}
                      {`    "issue_id": "${currentScen.githubIssueId}",\n`}
                      {`    "issue_title": "${currentScen.githubIssueTitle}",\n`}
                      {`    "status": "${simStep >= 4 ? 'DISPATCHED_TO_GITHUB_API_200_OK' : 'PENDING_RESOLVE'}"\n`}
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
        {/* NEW SECTION: INTERACTIVE INSTITUTIONAL MEMORY LEDGER EXPLORER */}
        {/* The persistent source of truth where past consensus is indexed */}
        {/* ------------------------------------------------------------------ */}
        <section id="institutional-memory" className="py-24 px-6 lg:px-14 max-w-[1360px] mx-auto relative z-10 scroll-mt-20">

          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Architecture shouldn't live in forgotten meeting recordings.
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-3 max-w-2xl mx-auto leading-relaxed">
              SyncState indexes every technical agreement, release freeze, and contract into an immutable decision graph. When someone proposes a contradictory stance weeks later, the collision engine flags it instantly.
            </p>
          </div>

          {/* Main Ledger UI Frame */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121314] shadow-2xl overflow-hidden ring-1 ring-white/5 relative">

            {/* Top Toolbar: Search Input + Category Filter Tabs */}
            <div className="p-4 sm:p-5 bg-[#050507] border-b border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">

              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1 bg-[#0a0a0c] p-1 rounded-[6px] border border-white/[0.08] overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
                {[
                  { key: 'all', label: 'All Decisions', count: 4 },
                  { key: 'database', label: 'Database Architecture', count: 1 },
                  { key: 'timeline', label: 'Release Milestones', count: 1 },
                  { key: 'api', label: 'API Contracts', count: 1 },
                  { key: 'security', label: 'Security & Auth', count: 1 }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setLedgerCategory(tab.key as any)}
                    className={`px-3 py-1.5 rounded-[5px] text-xs font-mono transition-all whitespace-nowrap flex items-center space-x-1.5 ${ledgerCategory === tab.key
                      ? 'bg-white/[0.08] text-white font-medium border border-white/[0.1] shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] bg-white/[0.06] text-zinc-400 font-normal">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Real-time Search Bar */}
              <div className="relative min-w-[240px] sm:min-w-[280px]">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search decisions, speakers, quotes..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-[6px] bg-[#0a0a0c] border border-white/[0.08] focus:border-white/[0.2] focus:outline-none text-xs text-zinc-200 placeholder:text-zinc-500 font-mono transition"
                />
                {ledgerSearch && (
                  <button
                    onClick={() => setLedgerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-mono"
                  >
                    ✕
                  </button>
                )}
              </div>

            </div>

            {/* Split Screen: Left Decision List (5 cols) + Right Deep Inspection (7 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">

              {/* Left Column: Decision Cards List (Interactive) */}
              <div className="lg:col-span-5 p-4 sm:p-5 space-y-2.5 max-h-[640px] overflow-y-auto bg-[#121314]">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2 px-1">
                  <span className="text-[11px] text-zinc-400">Indexed consensus stances</span>
                  <span className="text-zinc-500 text-[10px]">{filteredDecisions.length} records</span>
                </div>

                {filteredDecisions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs font-mono">
                    No decisions matched "{ledgerSearch}".
                  </div>
                ) : (
                  filteredDecisions.map((dec) => {
                    const isSelected = activeDecision.id === dec.id;
                    return (
                      <div
                        key={dec.id}
                        onClick={() => setSelectedDecisionId(dec.id)}
                        className={`p-3.5 rounded-[8px] border text-left cursor-pointer transition-colors relative group ${isSelected
                          ? 'bg-[#1a1b1e] border-white/[0.16] shadow-sm'
                          : 'bg-[#121314] hover:bg-[#1a1b1e] border-white/[0.06]'
                          }`}
                      >
                        {/* Top Metadata */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-mono text-zinc-400 lowercase">
                            {dec.categoryLabel}
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] lowercase text-emerald-400/90">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{dec.status.toLowerCase()}</span>
                          </span>
                        </div>

                        {/* Stance Title */}
                        <h4 className="text-xs font-medium text-zinc-100 line-clamp-2 mb-2 group-hover:text-white transition">
                          {dec.title}
                        </h4>

                        {/* Speaker & Origin */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-2 border-t border-white/[0.05]">
                          <span className="text-zinc-400">
                            {dec.speaker} <span className="text-zinc-600">({dec.speakerRole})</span>
                          </span>
                          <span>{dec.meetingDate}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Deep Inspection Panel */}
              <div className="lg:col-span-7 p-6 sm:p-7 bg-[#121314] flex flex-col justify-between space-y-6">

                {/* Header Information */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-[6px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300">
                        <Lock className="w-3.5 h-3.5 text-zinc-300" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-medium text-zinc-200">{activeDecision.id}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-xs font-mono text-zinc-400 lowercase">{activeDecision.categoryLabel}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">Origin: {activeDecision.meetingTitle} ({activeDecision.meetingDate})</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] lowercase text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>immutable consensus</span>
                      </span>
                    </div>
                  </div>

                  {/* Core Consensus Stance */}
                  <div className="mt-5">
                    <span className="text-[10px] font-mono lowercase text-zinc-500 block mb-1">
                      enforced consensus stance
                    </span>
                    <h3 className="text-base sm:text-lg font-medium text-zinc-100 tracking-tight leading-snug">
                      "{activeDecision.title}"
                    </h3>
                  </div>

                  {/* Verbatim Audio Transcript Box */}
                  <div className="mt-4 p-3.5 rounded-[8px] bg-[#0a0a0c] border border-white/[0.06] relative">
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-2">
                      <span className="flex items-center space-x-1.5 text-zinc-400 lowercase">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>verbatim transcript evidence [{activeDecision.timestamp}]</span>
                      </span>
                      <span>Audio Attributed</span>
                    </div>
                    <blockquote className="text-xs font-mono text-zinc-300 italic leading-relaxed pl-3 border-l-2 border-white/[0.15]">
                      "{activeDecision.verbatimQuote}"
                    </blockquote>
                    <div className="mt-2 text-right text-[10px] text-zinc-500 font-mono">
                      — <strong className="text-zinc-300 font-normal">{activeDecision.speaker}</strong> ({activeDecision.speakerRole})
                    </div>
                  </div>

                  {/* Decision Evolution Timeline */}
                  <div className="mt-5">
                    <span className="text-[10px] font-mono lowercase text-zinc-500 block mb-2.5">
                      cross-meeting evolution &amp; audit trail
                    </span>
                    <div className="space-y-2.5">
                      {activeDecision.evolution.map((evo, idx) => (
                        <div key={idx} className="flex items-start space-x-2.5 text-xs font-mono">
                          <div className="w-4 h-4 rounded-[3px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 text-[10px] mt-0.5 shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 p-2.5 rounded-[6px] bg-[#0a0a0c] border border-white/[0.06]">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-zinc-200 text-xs">{evo.stage}</span>
                              <span className="text-[10px] text-zinc-500">{evo.meeting}</span>
                            </div>
                            <p className="text-zinc-400 text-[11px] font-sans leading-relaxed">{evo.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Downstream Impact & Cryptographic Proof */}
                <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-white/[0.04] text-zinc-300 border border-white/[0.08] text-[11px] font-mono">
                      <GitPullRequest className="w-3 h-3 text-emerald-400" />
                      <span>github #{activeDecision.githubIssue.id}</span>
                    </span>
                    <span className="truncate max-w-[280px] text-zinc-400 text-[11px] font-mono">{activeDecision.githubIssue.title}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-zinc-500 text-[11px]">
                    <GitCommit className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{activeDecision.hash}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Action Lineage Feature Showcase */}
          <div className="mt-8 rounded-2xl border border-white/[0.08] bg-[#121314] p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-[6px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300">
                    <GitBranch className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                    Action Lineage &amp; Handoff Audit
                  </h3>
                  <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded-[4px]">
                    Lifecycle Sync
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 max-w-2xl">
                  Deliverables don't reset when meetings end. Track commitments across sprints, verify assignee handoffs, and audit status changes with verbatim speaker evidence.
                </p>
              </div>

              <button
                onClick={handleTryApp}
                className="px-3.5 py-1.5 rounded-[6px] text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.08] transition flex items-center space-x-1.5 shrink-0"
              >
                <span>Launch Lineage in App</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>

            {/* Lineage Thread Mockup */}
            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Deliverable 1 */}
              <div className="p-4 rounded-[8px] bg-[#0a0a0c] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium lowercase text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>closed</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">Origin: meeting_1_baseline</span>
                </div>
                <div className="text-xs font-sans text-zinc-200 font-medium">
                  Standardize PostgreSQL connection pooling &amp; Prisma migrations
                </div>
                <div className="border-l-2 border-white/[0.08] pl-3 ml-1 space-y-1 text-[11px] text-zinc-400">
                  <div className="text-zinc-300">Alex Rivera · meeting_3_ratification</div>
                  <div className="text-zinc-500 text-[10px] font-sans">Closed deliverable after database stress tests and pooled connections verified.</div>
                </div>
              </div>

              {/* Deliverable 2 */}
              <div className="p-4 rounded-[8px] bg-[#0a0a0c] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium lowercase text-indigo-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>handoff</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">Origin: meeting_1_baseline</span>
                </div>
                <div className="text-xs font-sans text-zinc-200 font-medium">
                  JWT Session Migration &amp; Microservice Handoff
                </div>
                <div className="border-l-2 border-white/[0.08] pl-3 ml-1 space-y-1 text-[11px] text-zinc-400">
                  <div className="text-zinc-300">Rahul Sharma → David Kim · meeting_2_progress</div>
                  <div className="text-zinc-500 text-[10px] font-sans">Handoff protocol executed: David assumed ownership to accelerate enterprise SSO.</div>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* ------------------------------------------------------------------ */}
        {/* BENTO GRID: FOUR ARCHITECTURAL PILLARS */}
        {/* ------------------------------------------------------------------ */}
        <section id="collision-engine" className="py-24 px-6 lg:px-14 max-w-[1360px] mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16 relative z-20">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Four pillars engineered for zero drift.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">

            {/* Bento Card 1: Deep Collision Engine */}
            <div className="lg:col-span-2 p-8 sm:p-9 rounded-[16px] bg-[#121314] hover:bg-[#15161a] border border-white/[0.08] hover:border-amber-500/30 hover:shadow-[0_0_35px_-8px_rgba(245,158,11,0.14)] transition-all duration-300 relative overflow-hidden group shadow-lg">
              <div className="w-10 h-10 rounded-[10px] bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2.5">Deep Architectural Collision Engine</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Understands domain semantics rather than naive text matching. Detects tech stack reversals, interface contract inversions (e.g. gRPC vs REST), dependency deadlocks (load testing scheduled before webhook delivery), and feature ownership disputes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-mono">
                <div className="p-3.5 rounded-[8px] bg-rose-500/[0.04] border border-rose-500/20 text-zinc-400 hover:border-rose-500/40 hover:bg-rose-500/[0.07] transition-all">
                  <span className="text-rose-400 block font-medium mb-1 text-xs">Contract Inversion</span>
                  Prevents breaking protocol shifts without team review.
                </div>
                <div className="p-3.5 rounded-[8px] bg-amber-500/[0.04] border border-amber-500/20 text-zinc-400 hover:border-amber-500/40 hover:bg-amber-500/[0.07] transition-all">
                  <span className="text-amber-400 block font-medium mb-1 text-xs">Dependency Deadlock</span>
                  Blocks testing tasks that precede deliverable dates.
                </div>
                <div className="p-3.5 rounded-[8px] bg-sky-500/[0.04] border border-sky-500/20 text-zinc-400 hover:border-sky-500/40 hover:bg-sky-500/[0.07] transition-all">
                  <span className="text-sky-400 block font-medium mb-1 text-xs">Owner Dispute</span>
                  Catches overlapping feature assignments across sprints.
                </div>
              </div>
            </div>

            {/* Bento Card 2: Institutional Memory Ledger Summary */}
            <div className="p-8 sm:p-9 rounded-[16px] bg-[#121314] hover:bg-[#15161a] border border-white/[0.08] hover:border-indigo-500/30 hover:shadow-[0_0_35px_-8px_rgba(99,102,241,0.14)] transition-all duration-300 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-[10px] bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-105 transition-transform">
                  <Database className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-100 mb-2.5">Institutional Memory Ledger</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                  Persistent SQLite memory that indexes agreements from day one. Every consensus stance is locked with speaker attribution, verbatim quotes, and chronological lineage.
                </p>
                <a
                  href="#institutional-memory"
                  className="inline-flex items-center space-x-1.5 text-xs font-mono text-indigo-400 hover:text-indigo-300 transition"
                >
                  <span>Explore Interactive Ledger Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Multi-Workspace Isolation</span>
                <span className="inline-flex items-center gap-1.5 text-zinc-300 lowercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>active</span>
                </span>
              </div>
            </div>

            {/* Bento Card 3: Dual-Engine Live Voice Listener with Active Soundwave */}
            <div
              id="live-listener"
              className="p-8 sm:p-9 rounded-[16px] bg-[#121314] hover:bg-[#15161a] border border-white/[0.08] hover:border-rose-500/30 hover:shadow-[0_0_35px_-8px_rgba(244,63,94,0.14)] transition-all duration-300 flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-[10px] bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                    <Radio className="w-5 h-5 text-rose-400" />
                  </div>
                  {/* Miniature Equalizer Waveform */}
                  <div className="flex items-end space-x-1 h-4">
                    <div className="w-0.5 bg-rose-400 rounded-full animate-eq-1" />
                    <div className="w-0.5 bg-rose-300 rounded-full animate-eq-3" />
                    <div className="w-0.5 bg-rose-400 rounded-full animate-eq-2" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-zinc-100 mb-2.5">Live Voice Listener</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Runs directly in your browser. Captures 16-bit PCM microphone audio, automatically attributes tasks to named teammates, and filters out noise and small talk.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Native Browser Audio</span>
                <span className="inline-flex items-center gap-1.5 text-zinc-300 lowercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>active</span>
                </span>
              </div>
            </div>

            {/* Bento Card 4: Bi-Directional Issue Dispatch */}
            <div
              id="integrations"
              className="lg:col-span-2 p-8 sm:p-9 rounded-[16px] bg-[#121314] hover:bg-[#15161a] border border-white/[0.08] hover:border-emerald-500/30 hover:shadow-[0_0_35px_-8px_rgba(16,185,129,0.14)] transition-all duration-300 group shadow-lg"
            >
              <div className="w-10 h-10 rounded-[10px] bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                <GitPullRequest className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2.5">Automated GitHub Issue Dispatch</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Action items don't stay trapped in meeting transcripts. Staged tasks are cleaned of conversational chatter and posted directly to GitHub repositories with audit receipts and assignee links.
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1.5 rounded-[6px] bg-[#0a0a0c] border border-white/[0.06] text-xs font-mono text-zinc-300 flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-Formatted Issue Markdown</span>
                </span>
                <span className="px-3 py-1.5 rounded-[6px] bg-[#0a0a0c] border border-white/[0.06] text-xs font-mono text-zinc-300 flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>GitHub Milestones &amp; Issue Labels</span>
                </span>
                <span className="px-3 py-1.5 rounded-[6px] bg-[#0a0a0c] border border-white/[0.06] text-xs font-mono text-zinc-300 flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cryptographic Governance Sign-off</span>
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* BOTTOM HERO SECTION (Call To Action) - Sentinel Guardian & Resend Obsidian Style */}
        {/* ------------------------------------------------------------------ */}
        <section className="pt-20 pb-28 px-6 lg:px-14 max-w-6xl mx-auto text-center relative">
          
          {/* Cobalt Sprite: Single-Shader Raytraced Glass Capsule Sentinel */}
          <div className="relative z-20 flex flex-col items-center justify-center -mb-8 sm:-mb-12 pointer-events-auto">
            <CobaltSprite
              size={290}
              spriteColor="#FF4D22"
              face="eyes"
              scale={92}
              frost={5}
              follow="page"
              reach={10}
              lean={8}
              blink={4}
              float={6}
              advanced={{ seamAngle: 85, seamTilt: 70, seamOffset: -5 }}
            />
          </div>

          <div className="p-14 md:p-20 pt-16 md:pt-20 rounded-3xl bg-gradient-to-b from-[#0c0d12] via-black to-black border border-white/[0.1] relative overflow-hidden shadow-2xl shadow-orange-950/20">

            {/* Ambient Radial Gradient Halo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-orange-500/15 via-rose-500/10 to-transparent blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-7">
              <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-[-0.03em] leading-tight">
                Stop meeting drift before <br />
                it breaks production.
              </h2>

              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal max-w-2xl mx-auto">
                Ingest your first meeting transcript or start the live voice listener now. Eliminate forgotten agreements, overlapping tasks, and silent architectural reversals.
              </p>

              {/* Action Button: Resend-style pill */}
              <div className="pt-5 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleTryApp}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-8 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-base shadow-xl shadow-white/10 transition-all active:scale-95 group"
                >
                  <span>{currentUser ? 'Open SyncState Workspace' : 'Get started'}</span>
                  <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-black py-10 px-6 lg:px-14 text-sm text-zinc-400">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center space-x-2.5">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-zinc-200">SyncState</span>
            <span>— Autonomous Meeting Governance & Execution Engine</span>
          </div>

          <div className="flex items-center space-x-7 text-zinc-400 font-mono text-xs">
            <span className="flex items-center space-x-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Governance Systems Operational</span>
            </span>
            <button onClick={() => onNavigate('/login')} className="hover:text-zinc-200 transition">
              Log in / Sign Up
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
