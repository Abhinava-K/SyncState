# SyncState: Autonomous Meeting Governance & Execution Platform

SyncState turns engineering meetings, live audio streams, and transcripts into verifiable institutional memory and concrete engineering deliverables. Rather than producing passive text summaries that get lost in team chat channels, SyncState maintains a persistent, queryable state machine that detects cross-meeting architectural collisions, enforces human governance gates, and synchronizes deliverables directly with issue tracking systems.

---

## Core Capabilities

### 1. In-Meeting Live Voice Listener
- **Browser-Native Audio Capture**: Captures 16-bit PCM microphone audio directly via browser speech recognition with dynamic volume metering.
- **On-the-Fly Diarization**: Facilitators can attribute speaking turns in real time or allow pause detection to segment speaker contributions automatically.
- **Zero Third-Party Dependency**: Operates client-side without external speech API costs or token billing.

### 2. Multi-Format Transcript Ingest
- **Universal Parser**: Natively parses Zoom, Google Meet, Microsoft Teams, and Otter WebVTT (`.vtt`), SubRip (`.srt`), JSON schemas, raw text paste, and audio files (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`).
- **Verbatim Evidence Linking**: Every extracted decision and action item preserves its exact timestamp, speaker attribution, and spoken sentence. Clicking any entity highlights the corresponding turn in the transcript viewer.

### 3. Deep Architectural Collision Engine
SyncState audits newly proposed stances against historical agreements to surface contradictions before breaking work begins:
- **Tech Stack Reversals**: Flags database, framework, or cloud infrastructure shifts made without documented migration approvals (e.g., PostgreSQL vs. MongoDB, REST vs. GraphQL).
- **Timeline Slips**: Detects uncoordinated milestone changes or release freeze schedule modifications.
- **Contract & Protocol Inversions**: Identifies API divergences (REST OpenAPI vs. gRPC Protobuf, WebSockets vs. polling).
- **Dependency Deadlocks**: Catches downstream tasks scheduled prior to prerequisite deliverables.
- **Feature Ownership Disputes**: Identifies conflicting feature assignments across sprints.

### 4. Human-in-the-Loop (HITL) Staging Gate
- **Git-Style Staging Diff**: Review proposed decisions and action items side-by-side with conflicting historical precedents.
- **Explicit Conflict Resolutions**:
  - *Override Past Decision*: Supersedes earlier policy and documents the new rationale.
  - *Edit Proposed Stance*: Modifies current commitments to align with past consensus.
  - *Dismiss Conflict*: Acknowledges edge cases where divergence is intended.
- **Governance Lock**: Deliverable dispatch is locked until all active contradictions are explicitly resolved.

### 5. Automated GitHub Issue Dispatch
- **Automated Issue Generation**: Cleans conversational chatter from action items and dispatches structured Markdown issues to target GitHub repositories.
- **Audit Receipts**: Issues include speaker attribution, verbatim quotes, meeting source links, and milestone tags.
- **Dual Operating Mode**: Seamlessly toggles between live GitHub API dispatch and deterministic mock mode for offline testing.

### 6. Action Lineage & Cross-Meeting History
- **End-to-End Task Lifecycle**: Tracks action items across consecutive meetings (e.g., created in sprint planning, blocked in standup, completed in retro).
- **Dependency Chains**: Links parent tasks to downstream follow-up assignments.

### 7. Multi-Tenant Workspace Architecture
- Complete data isolation partitioned by workspace IDs.
- Built-in authentication and organization switching.
- Persistent SQLite database (`syncstate.db`) requiring zero external database clusters.

---

## Architecture

```text
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint and middleware
│   │   ├── config.py                # Environment configuration and Pydantic settings
│   │   ├── database.py              # SQLite schema, migrations, and tenant isolation
│   │   ├── schemas/payloads.py      # Strict validation contracts and schemas
│   │   ├── services/
│   │   │   ├── extractor_service.py # Transcript parsing and entity extraction
│   │   │   ├── memory_service.py    # Vector embeddings and similarity search
│   │   │   ├── audit_service.py     # Architectural collision and contradiction reasoning
│   │   │   ├── tracker_service.py   # GitHub Issues API integration client
│   │   │   └── digest_service.py    # Deadline evaluation and digest compiler
│   │   └── api/routes/
│   │       ├── auth.py              # User authentication and workspace routing
│   │       ├── meetings.py          # Meeting ingest, transcripts, and decision ledger
│   │       ├── staging.py           # Conflict resolution and ticket commit gate
│   │       ├── actions.py           # Action lineage and status lifecycle updates
│   │       ├── digests.py           # Weekly digests and notifications
│   │       └── settings.py          # API keys and execution mode configuration
│   ├── sample_data/                 # Pre-recorded meeting transcripts and audio files
│   ├── tests/                       # Automated regression and phase test suites
│   └── requirements.txt             # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Core 3-pane governance workspace layout
│   │   ├── api.ts                   # Centralized typed API client
│   │   ├── types.ts                 # Shared TypeScript interfaces
│   │   └── components/
│   │       ├── LandingPage.tsx      # Product homepage with interactive simulation demo
│   │       ├── CobaltSprite.tsx     # WebGL single-shader raytraced glass sentinel
│   │       ├── TranscriptViewer.tsx # Diarized transcript view with evidence highlighting
│   │       ├── ConflictDiffCard.tsx # Side-by-side contradiction resolution card
│   │       ├── ActionItemRow.tsx    # Inline editable task row with status indicators
│   │       ├── CommitBar.tsx        # Sticky approval bar with safety gate status
│   │       ├── CommandPalette.tsx   # Cmd+K quick navigation and action palette
│   │       ├── DecisionLedgerModal.tsx # Historical decision timeline
│   │       ├── ActionLineageModal.tsx  # Cross-meeting task history and audit trail
│   │       ├── LiveMeetingListenerModal.tsx # Continuous browser audio listener
│   │       ├── IngestModal.tsx      # Transcript file upload and text paste dialog
│   │       ├── WeeklyDigestModal.tsx# Per-assignee deliverable summary
│   │       └── SettingsModal.tsx    # API key configuration and live/mock toggle
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
```

---

## Local Development

### Prerequisites
- Python 3.10+
- Node.js 18.0+
- npm 9.0+

### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend API will run at `http://localhost:8000`.  
OpenAPI documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:3000`.

---

## Deployment (Render.com)

SyncState is architected for clean separation between its backend API and frontend static asset hosting on Render:

### Backend Service (Web Service)
1. In Render, select **New +** > **Web Service** and connect your repository.
2. Configure settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
3. Environment variables:
   - `PYTHON_VERSION`: `3.11.0`
   - `INTEGRATION_MODE`: `mock` (or `live`)
   - `DATABASE_PATH`: `syncstate.db`
   - `GEMINI_API_KEY`: *(Optional) Google AI Studio API key*

### Frontend Service (Static Site)
1. In Render, select **New +** > **Static Site** and connect your repository.
2. Configure settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Environment variables:
   - `VITE_API_URL`: `https://<your-backend-service>.onrender.com/api`
4. In **Redirects / Rewrites**, add an SPA fallback route:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`

---

## Configuration & Environment Variables

| Variable | Scope | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_PATH` | Backend | `syncstate.db` | Path to the SQLite storage file |
| `GEMINI_API_KEY` | Backend | *(optional)* | Google Gemini key for audio transcription and reasoning |
| `GEMINI_MODEL` | Backend | `gemini-3-flash-preview` | Model for extraction and contradiction analysis |
| `INTEGRATION_MODE` | Backend | `mock` | `mock` for deterministic execution, `live` for real GitHub dispatch |
| `GITHUB_TOKEN` | Backend | *(optional)* | GitHub Personal Access Token (`repo` scope) |
| `GITHUB_REPO` | Backend | *(optional)* | Target repository in `owner/repo` format |
| `VITE_API_URL` | Frontend | `/api` | Base URL of the backend API for production builds |

---

## License

Proprietary and Confidential. All rights reserved.
