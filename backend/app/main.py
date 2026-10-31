from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import meetings, staging, digests, settings as settings_route, auth
from app.services.extractor_service import extractor_service
from app.services.memory_service import memory_service
from app.services.audit_service import audit_service
from app.database import db
import uuid

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="SyncState: Meeting-to-Execution Agent with Cross-Meeting Conflict Detection and Institutional Memory."
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(meetings.router)
app.include_router(staging.router)
app.include_router(digests.router)
app.include_router(settings_route.router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SyncState Agent API",
        "integration_mode": settings.INTEGRATION_MODE,
        "database": settings.DATABASE_PATH
    }

@app.post("/api/reset")
async def reset_database():
    """
    Clears all meetings, decisions, action items, and conflicts for a clean slate.
    """
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM conflicts")
        cursor.execute("DELETE FROM action_items")
        cursor.execute("DELETE FROM decisions")
        cursor.execute("DELETE FROM meetings")
        conn.commit()
    return {"status": "success", "message": "All database records cleared. Clean slate ready!"}

@app.post("/api/seed")
async def seed_demo_data():
    """
    Seeds Meeting 1 (Architecture & Roadmap Sync) and prepares Meeting 2 (Contradictory Sprint Sync).
    Provides instant demonstration of cross-meeting conflict detection for judges.
    """
    # 1. Clear previous database state for clean demo
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM conflicts")
        cursor.execute("DELETE FROM action_items")
        cursor.execute("DELETE FROM decisions")
        cursor.execute("DELETE FROM meetings")
        conn.commit()

    # 2. Seed Meeting 1: Architecture Alignment (Oct 12)
    m1_id = "meet_oct12_arch"
    m1_turns = [
        {"turn_index": 0, "speaker": "Alex (Tech Lead)", "timestamp": "01:10", "text": "We chose PostgreSQL for our database architecture and we are completely standardizing on it."},
        {"turn_index": 1, "speaker": "Alex (Tech Lead)", "timestamp": "02:30", "text": "Our hard release freeze deadline is set for November 15th to allow two weeks of QA."},
        {"turn_index": 2, "speaker": "Rahul (Backend)", "timestamp": "03:15", "text": "I will finish the Auth and JWT session migration by Thursday."}
    ]
    db.save_meeting(m1_id, "Architecture & Roadmap Alignment", "2026-10-12", m1_turns)

    # Decisions for Meeting 1
    d1 = {
        "id": "dec_arch_postgres",
        "meeting_id": m1_id,
        "topic": "Database Architecture",
        "statement": "We chose PostgreSQL for our database architecture and are completely standardizing on it.",
        "speaker": "Alex (Tech Lead)",
        "turn_index": 0,
        "verbatim_quote": "We chose PostgreSQL for our database architecture and we are completely standardizing on it.",
        "status": "ACTIVE",
        "embedding": await memory_service.get_embedding("Topic: Database Architecture. Statement: Standardize on PostgreSQL")
    }
    d2 = {
        "id": "dec_freeze_nov15",
        "meeting_id": m1_id,
        "topic": "Release Timeline",
        "statement": "Our hard release freeze deadline is set for November 15th to allow two weeks of QA.",
        "speaker": "Alex (Tech Lead)",
        "turn_index": 1,
        "verbatim_quote": "Our hard release freeze deadline is set for November 15th to allow two weeks of QA.",
        "status": "ACTIVE",
        "embedding": await memory_service.get_embedding("Topic: Release Timeline. Statement: Release freeze deadline set for November 15th")
    }
    db.save_decisions([d1, d2])

    # Action Item for Meeting 1
    a1 = {
        "id": "act_rahul_auth",
        "meeting_id": m1_id,
        "task": "Finish Auth and JWT session migration",
        "assignee": "Rahul",
        "deadline": "Thursday",
        "priority": "high",
        "turn_index": 2,
        "verbatim_quote": "I will finish the Auth and JWT session migration by Thursday.",
        "is_approved": True,
        "external_issue_url": "https://linear.app/syncstate/issue/SYN-101"
    }
    db.save_action_items([a1])

    # Mark Meeting 1 as COMMITTED
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE meetings SET status = 'COMMITTED' WHERE id = ?", (m1_id,))
        conn.commit()

    return {
        "status": "success",
        "message": "Demo state seeded with Meeting 1 (Oct 12). Ready to ingest Meeting 2 (Oct 24) to trigger live conflict detection!",
        "seeded_meeting_id": m1_id
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

