# ⚡ SyncState: Autonomous Meeting Governance & Execution Platform

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#-license--intellectual-property)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/Types-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg)](https://tailwindcss.com/)

SyncState transforms team meetings, audio streams, and transcripts into verifiable institutional memory and concrete engineering deliverables. Rather than producing passive text summaries that get lost in Slack channels, SyncState maintains a persistent, queryable state machine that detects cross-meeting architectural collisions, enforces human governance gates, and synchronizes directly with issue tracking systems.

---

## 🌟 Key Capabilities

### 1. In-Meeting Live Voice Listener ($0.00 API Cost)
* **Zero API Cost Streaming**: Powered by browser-native continuous speech recognition (`webkitSpeechRecognition`) with no token fees, rate limits, or audio duration cutoffs.
* **Real-Time Equalizer Waveform**: Web Audio API visualizer reacts to live microphone audio with dynamic frequency and volume metering.
* **On-the-Fly Diarization**: Facilitators or speakers can attribute turns in real time with interactive speaker chips (`Alex (Lead)`, `Rahul (Backend)`, `Sarah (QA)`, or custom members) or let pause-detection automatically segment turns.

### 2. Multi-Format Transcript Ingestion
* Natively parses Zoom, Google Meet, Microsoft Teams, and Otter WebVTT (`.vtt`), SubRip (`.srt`), JSON schemas, raw conversational dialogue, and binary audio files (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`).
* Verbatim evidence linking: Every extracted decision and action item preserves its exact timestamp and spoken quote. Clicking any entity highlights the speaker turn in the transcript viewer.

### 3. Deep Architectural Collision & Conflict Engine
SyncState continuously audits newly proposed stances against the team's historical memory, surfacing conflicts before contradictory work begins:
* **Tech Stack Reversals**: Flags database, framework, or cloud infrastructure reversals without documented migration approvals (e.g., PostgreSQL vs. MongoDB, React vs. Vue, REST vs. GraphQL).
* **Timeline Slips**: Catches uncoordinated milestone, launch, or release freeze schedule shifts.
* **Interface & Contract Inversions**: Flags API protocol divergences (REST OpenAPI vs. gRPC Protobuf, WebSockets vs. polling, UUID vs. auto-increment keys).
* **Dependency Deadlocks**: Detects when downstream tasks (e.g. *Run load testing on checkout*) are scheduled before prerequisite deliverables (e.g. *Stripe webhook integration*) are completed.
* **Feature Ownership Disputes**: Identifies uncoordinated ownership reassignments across sprints.

### 4. Human-in-the-Loop (HITL) Staging Gate
* Git-style staging diff interface: Review candidate decisions and action items before committing to long-term memory.
* One-click conflict resolutions:
  * **Override Past Decision**: Supersedes earlier policy and logs the historical rationale.
  * **Edit Proposed Stance**: Modifies the current commitment to align with past agreements.
  * **Dismiss Conflict**: Acknowledges non-interfering edge cases.
* **Safety Gate Lock**: Dispatches to issue trackers are locked until all detected contradictions are explicitly resolved.

### 5. Bi-Directional Issue Tracker Dispatch
* Dispatches approved tasks directly into **Linear** or **GitHub Issues**.
* Generates deep links, tracks ticket identifiers (`SYN-101`), and maintains idempotency to prevent duplicate ticket creation.
* Dual operating mode: Switch effortlessly between live external API calls and self-contained zero-dependency mock mode.

### 6. Deadline Reminders & Weekly Digests
* Real-time deadline evaluation highlighting critical deadlines within **24 hours** and **48 hours**.
* Generates individual per-person Markdown digests grouping active deliverables, decisions led, and upcoming milestone warnings.

### 7. Multi-Tenant Workspace Security
* Complete workspace isolation: Meetings, decisions, vector embeddings, and action items are partitioned by `workspace_id`.
* Built-in authentication API supporting enterprise organization registration, session management, and workspace switching.

---

## 🏗️ System Architecture

```text
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI server, CORS, reset & seed endpoints
│   │   ├── config.py                # Pydantic Settings configuration & env parsing
│   │   ├── database.py              # SQLite schema, migrations & tenant repositories
│   │   ├── schemas/payloads.py      # Strict Pydantic models & validation contracts
│   │   ├── services/
│   │   │   ├── extractor_service.py # Multi-format parser & entity extraction
│   │   │   ├── memory_service.py    # Hybrid vector embeddings & dense retrieval
│   │   │   ├── audit_service.py     # Deep architectural collision & NLI stance auditor
│   │   │   ├── tracker_service.py   # Linear GraphQL & GitHub Issues REST client
│   │   │   └── digest_service.py    # Deadline urgency evaluator & Markdown compiler
│   │   └── api/routes/
│   │       ├── auth.py              # User authentication & workspace management
│   │       ├── meetings.py          # Ingest, upload, transcript & memory ledger
│   │       ├── staging.py           # HITL conflict resolution & ticket dispatch
│   │       ├── digests.py           # Weekly digests & reminder generation
│   │       └── settings.py          # Real-time API key & provider configuration
│   ├── sample_data/                 # Sample transcripts (.vtt, .txt)
│   ├── tests/                       # Modular test suites across all 5 engine phases
│   ├── run_phase_tests.py           # Automated test runner across all engine phases
│   ├── test_pipeline.py             # End-to-end regression test script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # 3-Pane Linear/Raycast inspired governance UI
│   │   ├── api.ts                   # Type-safe API client with tenant headers
│   │   ├── types.ts                 # Full TypeScript domain contracts
│   │   └── components/
│   │       ├── TranscriptViewer.tsx # Timestamped diarized viewer with quote highlighting
│   │       ├── ConflictDiffCard.tsx # Side-by-side Git diff contradiction resolver
│   │       ├── ActionItemRow.tsx    # Inline editable task row with assignee & deadline
│   │       ├── CommitBar.tsx        # Sticky approval bar with safety gate lock indicator
│   │       ├── LiveMeetingListenerModal.tsx # Zero-cost live speech listener & visualizer
│   │       ├── AuthModal.tsx        # Sign-in, registration & workspace switcher
│   │       ├── IngestModal.tsx      # Multi-format file uploader & sample loader
│   │       ├── WeeklyDigestModal.tsx# Per-person task breakdown & reminders
│   │       ├── DecisionLedgerModal.tsx # Institutional decision timeline
│   │       └── SettingsModal.tsx    # API credentials and live/mock toggle
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
```

---

## 🚀 Getting Started

### Prerequisites
* **Python**: 3.10 or higher
* **Node.js**: 18.0 or higher
* **npm**: 9.0 or higher

---

### Step 1: Start the Backend Service

```bash
cd backend
pip install -r requirements.txt
python -m app.main
```

The FastAPI backend starts at `http://localhost:8000`.  
Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

---

### Step 2: Start the Frontend Application

```bash
cd frontend
npm install
npm run dev
```

The Vite React application starts at `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied).

---

### Step 3: Verify the Pipeline with Automated Tests

Run the full modular test suite covering all 5 architectural phases:

```bash
cd backend
python run_phase_tests.py --all
```

Run the complete end-to-end regression test:

```bash
cd backend
python test_pipeline.py
```

---

## ⚙️ Configuration & Environment

Configuration can be customized via `.env` in the `backend/` directory or updated live at runtime through the in-app **Settings** modal:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DATABASE_PATH` | `syncstate.db` | SQLite database file location |
| `GEMINI_API_KEY` | *(optional)* | Google Gemini API key for multimodal audio and embeddings |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model used for extraction and audit reasoning |
| `INTEGRATION_MODE` | `mock` | `mock` for local deterministic execution, `live` for real tracker posting |
| `LINEAR_API_KEY` | *(optional)* | Linear personal access token for live ticket creation |
| `LINEAR_TEAM_ID` | `SYN` | Target Linear team key |
| `GITHUB_TOKEN` | *(optional)* | GitHub personal access token for repository issue tracking |
| `GITHUB_REPO` | *(optional)* | Target GitHub repository (`owner/repo`) |

> **Note**: SyncState includes deterministic offline fallbacks for dense vector embeddings, NLI contradiction analysis, and tracker dispatch, allowing full functionality without requiring third-party API keys.

---

## 📄 License & Intellectual Property

Copyright © 2026 SyncState. All rights reserved.

This software and its documentation are proprietary and confidential. Unauthorized copying, distribution, modification, public display, or commercial exploitation of this codebase via any medium is strictly prohibited without prior written authorization.
