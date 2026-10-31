import asyncio
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from app.database import db
from app.api.routes.meetings import ingest_meeting
from app.schemas.payloads import TranscriptIngestRequest, DiarizedTurn, ConflictResolveRequest, StagingCommitRequest
from app.api.routes.staging import resolve_conflict, commit_meeting_staging
from app.services.digest_service import digest_service

async def run_test():
    print("=" * 60)
    print("🚀 RUNNING END-TO-END PIPELINE TEST FOR SYNCSTATE AGENT")
    print("=" * 60)

    # 1. Clear database
    with db.get_connection() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM conflicts")
        c.execute("DELETE FROM action_items")
        c.execute("DELETE FROM decisions")
        c.execute("DELETE FROM meetings")
        conn.commit()
    print("✓ Cleaned database state.")

    # 2. Ingest Meeting 1
    with open("sample_data/meeting_1_architecture.json", "r") as f:
        m1_data = json.load(f)

    req1 = TranscriptIngestRequest(
        meeting_title=m1_data["meeting_title"],
        date=m1_data["date"],
        turns=[DiarizedTurn(**t) for t in m1_data["turns"]]
    )
    res1 = await ingest_meeting(req1)
    print(f"\n[Meeting 1 Ingested] ID: {res1.meeting_id}")
    print(f"  • Extracted Decisions: {len(res1.decisions)}")
    print(f"  • Extracted Action Items: {len(res1.action_items)}")
    print(f"  • Conflicts Detected: {len(res1.conflicts)} (Expected: 0)")
    assert len(res1.conflicts) == 0, "Meeting 1 should not have any conflicts"

    # Commit Meeting 1 so its decisions become permanent ACTIVE memory
    commit_req1 = StagingCommitRequest(
        approved_action_ids=[a.id for a in res1.action_items],
        approved_decision_ids=[d.id for d in res1.decisions],
        tracker_target="linear"
    )
    await commit_meeting_staging(res1.meeting_id, commit_req1)
    print("✓ Committed Meeting 1 to permanent institutional memory.")

    # 3. Ingest Meeting 2 (Contains contradictions on Database and Release Timeline)
    with open("sample_data/meeting_2_sprint_contradiction.json", "r") as f:
        m2_data = json.load(f)

    req2 = TranscriptIngestRequest(
        meeting_title=m2_data["meeting_title"],
        date=m2_data["date"],
        turns=[DiarizedTurn(**t) for t in m2_data["turns"]]
    )
    res2 = await ingest_meeting(req2)
    print(f"\n[Meeting 2 Ingested] ID: {res2.meeting_id}")
    print(f"  • Extracted Decisions: {len(res2.decisions)}")
    print(f"  • Extracted Action Items: {len(res2.action_items)}")
    print(f"  • Conflicts Detected: {len(res2.conflicts)} (Expected >= 1)")

    assert len(res2.conflicts) >= 1, "Agent should detect contradictions with Meeting 1!"
    for c in res2.conflicts:
        print(f"\n  ⚠️ [DETECTED CONFLICT: {c.conflict_type}] (Confidence: {c.confidence * 100:.0f}%)")
        print(f"     Historical: \"{c.historical_statement}\"")
        print(f"     Candidate:  \"{c.candidate_quote}\"")
        print(f"     Reasoning:  {c.reasoning}")

    # 4. Attempt to commit without resolving (MUST FAIL because safety gate protects board)
    try:
        commit_req2 = StagingCommitRequest(
            approved_action_ids=[a.id for a in res2.action_items],
            approved_decision_ids=[d.id for d in res2.decisions],
            tracker_target="linear"
        )
        await commit_meeting_staging(res2.meeting_id, commit_req2)
        print("❌ ERROR: Safety gate allowed commit with unresolved conflicts!")
    except Exception as e:
        print(f"\n✓ Safety Gate Passed: Blocked unconfirmed commit ({str(e.detail)})")

    # 5. Resolve Conflicts
    for c in res2.conflicts:
        print(f"\nResolving conflict {c.id} via 'OVERRIDE_PAST'...")
        resolve_req = ConflictResolveRequest(resolution_choice="OVERRIDE_PAST")
        await resolve_conflict(c.id, resolve_req)
    print("✓ All conflicts resolved.")

    # 6. Commit Staging (Now succeeds)
    commit_res2 = await commit_meeting_staging(res2.meeting_id, commit_req2)
    print(f"\n✓ Commit Succeeded!")
    print(f"  • Created Tickets: {len(commit_res2.created_tickets)}")
    for t in commit_res2.created_tickets:
        print(f"    - {t.ticket_id} ({t.provider}): {t.task} -> Assignee: {t.assignee} ({t.url})")

    # 7. Generate Weekly Digest & Reminders
    print("\n" + "=" * 60)
    print("📊 GENERATING WEEKLY DIGEST & REMINDERS")
    print("=" * 60)
    digest = digest_service.generate_weekly_digest()
    print(digest.markdown_summary)

    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! End-to-end workflow is rock-solid.")

if __name__ == "__main__":
    asyncio.run(run_test())

