# ⚡ SyncState: Autonomous Meeting Governance & Execution Agent

> **Hackathon Track: Problem 03 — Meeting-to-Execution Agent**  
> *"Decisions made in meetings get lost. The cross-meeting memory and the conflict detection are what make this a real system rather than a transcript summarizer."*

---

## 🎯 Executive Summary

Most hackathon projects become shallow wrappers around `summarize_meeting()`. **SyncState** turns messy conversational turns into concrete, verified work while acting as the team's long-term institutional memory.

It operates as an **event-driven state machine** that:
1. **Ingests diarized transcripts** with speaker attribution and timestamps.
2. **Extracts decisions and action items** with strict Pydantic schemas, owners, deadlines, and verbatim evidence quotes.
3. **Audits historical memory for contradictions** using hybrid retrieval (dense vectors + topic tags) to catch timeline slips, stack reversals, or policy clashes.
4. **Enforces Human-in-the-Loop (HITL) confirmation** with a Git-style staging diff and locked dispatch gate.
5. **Dispatches approved tasks** to **Linear** or **GitHub Issues** (with deep links & idempotency keys).
6. **Compiles 48-hour deadline reminders** and **per-person weekly digests**.

---

## 🏆 Hackathon Evaluation Rubric Mapping

| Hackathon Requirement | SyncState Implementation | Verification Point |
| :--- | :--- | :--- |
| **1. Transcript ingestion with speaker attribution** | Turn-indexed parser (`DiarizedTurn`) capturing speaker aliases, timestamps, and quotes. | Clicking any extracted item highlights the exact quote in the transcript viewer. |
| **2. Extraction of decisions, action items, owners & deadlines** | Deterministic Pydantic schemas via structured JSON mode. | No runtime parse errors; distinct arrays for decisions vs. action items. |
| **3. Detection of conflicts with earlier decisions stored in memory** | Hybrid vector search + NLI Contradiction Auditor (`audit_service.py`). | **The Demo Climax:** Feeding Meeting 2 flags Meeting 1's decisions with side-by-side quote diffs. |
| **4. Creation of tasks in a tracker through an integration** | Linear GraphQL & GitHub Issues REST clients with dual live/mock mode. | One-click dispatch generates real trackable URLs (`SYN-101`) with zero duplicate risk. |
| **5. Reminders before deadlines** | Time-window evaluator tagging deadlines within 24h/48h. | Visual badges (`🔴 DUE <24h`) inside the weekly digest. |
| **6. A weekly digest per person** | Aggregator grouping tasks and decisions by team member (`digest_service.py`). | One-click modal formatted in Markdown, ready to copy into Slack or email. |
| **7. A confirmation step before anything gets posted** | Non-negotiable staging diff gate (`CommitBar.tsx`). | Dispatch button is disabled until contradictory decisions are resolved. |

---

## ⚡ The 3-Minute Live Demo Script (For Judges)

1. **Step 1: The First Meeting (30s)**
   * Open the app at `http://localhost:3000`.
   * Click **"⚡ Seed Demo"**. The app seeds **Meeting 1 (Architecture Sync - Oct 12)**.
   * Point out:
     - Alex standardized on **PostgreSQL**.
     - Alex locked the release freeze date to **November 15th**.
     - Rahul was assigned the **Auth & JWT session migration** due by Thursday.
     - Show the database and memory ledger updated.

2. **Step 2: The Contradiction Climax (60s)**
   * Click **"+ Ingest Transcript"** and click **"Load Meeting 2 Sample"** (Sprint Sync - Oct 24, two weeks later).
   * Click **"Ingest & Run Agent"**.
   * **The "Aha!" Moment:** The UI immediately lights up with **2 Contradiction Alerts**:
     - ⚠️ **Tech Stack Reversal**: Sam suggests *"Let's stick with MongoDB for 6 months"*, contradicting Meeting 1's PostgreSQL decision.
     - ⚠️ **Timeline Slip**: Priya suggests *"Target release freeze is now November 5th"*, contradicting Meeting 1's Nov 15th freeze.
   * Show the side-by-side Git diff cards with confidence scores and reasoning!

3. **Step 3: Human-in-the-Loop Governance (45s)**
   * Show that the **[Approve & Dispatch]** button is **LOCKED** (safety gate blocks unverified writes to issue trackers).
   * Click **"Override Past Decision"** on the database conflict, and click **"Edit Stance"** on the timeline conflict.
   * The status flips to green (`RESOLVED`), and the commit bar unlocks!

4. **Step 4: Live Execution & Weekly Digest (45s)**
   * Click **"Approve & Dispatch Tasks to Linear"**.
   * Show instant creation of tickets (`SYN-101`, `SYN-102`) with deep links.
   * Click **"Weekly Digest"** to show per-person workload (Rahul, Sarah, Priya) with **48h deadline reminders**.

---

## 🛠️ Repository Architecture

```text
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI server, CORS, seed route
│   │   ├── config.py            # Pydantic BaseSettings & env configs
│   │   ├── database.py          # SQLite schema & typed repositories
│   │   ├── schemas/payloads.py  # Pydantic data contracts (Turns, Decisions, Tasks, Conflicts)
│   │   ├── services/
│   │   │   ├── extractor_service.py # Diarization & entity extraction
│   │   │   ├── memory_service.py    # Dense vector embeddings & hybrid retrieval
│   │   │   ├── audit_service.py     # NLI Contradiction & Stance Auditor
│   │   │   ├── tracker_service.py   # Linear GraphQL & GitHub Issues client
│   │   │   └── digest_service.py    # 48h deadline reminders & weekly digest compiler
│   │   └── api/routes/
│   │       ├── meetings.py          # Ingest & transcript endpoints
│   │       ├── staging.py           # HITL conflict resolve & commit dispatch
│   │       └── digests.py           # Weekly digest & reminders API
│   ├── sample_data/                 # Pre-loaded meeting transcripts
│   ├── test_pipeline.py             # Automated end-to-end regression test
│   ├── requirements.txt
│   └── run_backend.bat
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # 3-Pane High-Density Linear/Raycast UI
│   │   ├── components/
│   │   │   ├── TranscriptViewer.tsx # Interactive diarized transcript with quote highlighting
│   │   │   ├── ConflictDiffCard.tsx # Side-by-side Git-style contradiction resolver
│   │   │   ├── ActionItemRow.tsx    # Inline editable task row with deadline tags
│   │   │   ├── CommitBar.tsx        # Sticky approval bar with live API status
│   │   │   ├── WeeklyDigestModal.tsx# Per-person workload & reminder modal
│   │   │   ├── DecisionLedgerModal.tsx # Institutional decision timeline
│   │   │   └── IngestModal.tsx      # Transcript uploader with sample loader
│   │   ├── types.ts                 # TypeScript data contracts
│   │   └── api.ts                   # Backend API client
│   ├── package.json
│   ├── vite.config.ts
│   └── run_frontend.bat
└── run_test.bat
```

---

## 🚀 Running the Project

### 1. Run the Backend (FastAPI)
```powershell
cd backend
pip install -r requirements.txt
python -m app.main
```
*Backend runs at `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).*

### 2. Run the Frontend (Vite + React)
```powershell
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:3000`.*

### 3. Run Automated Pipeline Test
```powershell
cd backend
python test_pipeline.py
```
*(Or double-click `run_test.bat` on Windows).*

