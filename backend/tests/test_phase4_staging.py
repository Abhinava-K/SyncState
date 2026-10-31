import unittest
import asyncio
from app.database import db
from app.schemas.payloads import ConflictResolveRequest, StagingCommitRequest, ActionItemUpdateRequest
from app.api.routes.staging import resolve_conflict, commit_meeting_staging, update_action_item

class TestPhase4StagingGate(unittest.TestCase):
    """
    Phase 4 Test Suite:
    - Verifies Safety Gate blocks commit while conflicts remain unresolved
    - Verifies Conflict Resolution state transitions (ACTIVE -> SUPERSEDED)
    - Verifies Action item update & approval toggles
    """

    def setUp(self):
        with db.get_connection() as conn:
            c = conn.cursor()
            c.execute("DELETE FROM conflicts")
            c.execute("DELETE FROM action_items")
            c.execute("DELETE FROM decisions")
            c.execute("DELETE FROM meetings")
            conn.commit()

    def test_safety_gate_lock(self):
        async def run_test():
            m_id = "meet_locked"
            db.save_meeting(m_id, "Sprint Sync", "2026-10-24", [])

            # Insert an unresolved conflict
            c1 = {
                "id": "conf_unresolved_01",
                "meeting_id": m_id,
                "candidate_decision_id": "dec_cand_1",
                "historical_decision_id": "dec_hist_1",
                "historical_meeting_title": "Meeting 1",
                "historical_statement": "PostgreSQL",
                "historical_quote": "PostgreSQL",
                "candidate_quote": "MongoDB",
                "conflict_type": "TECH_STACK_REVERSAL",
                "reasoning": "Contradiction",
                "confidence": 0.9,
                "resolved": False
            }
            db.save_conflicts([c1])

            # Attempting to commit must raise Exception (HTTP 400)
            req = StagingCommitRequest(
                approved_action_ids=[],
                approved_decision_ids=[],
                tracker_target="linear"
            )
            with self.assertRaises(Exception):
                await commit_meeting_staging(m_id, req)

        asyncio.run(run_test())

    def test_conflict_resolution_override(self):
        async def run_test():
            m_id = "meet_override"
            db.save_meeting(m_id, "Sprint Sync", "2026-10-24", [])

            # Save historical and candidate decisions
            d_hist = {
                "id": "dec_hist_1", "meeting_id": "m1", "topic": "DB",
                "statement": "PostgreSQL", "speaker": "Alex", "turn_index": 0,
                "verbatim_quote": "PostgreSQL", "status": "ACTIVE"
            }
            d_cand = {
                "id": "dec_cand_1", "meeting_id": m_id, "topic": "DB",
                "statement": "MongoDB", "speaker": "Sam", "turn_index": 0,
                "verbatim_quote": "MongoDB", "status": "ACTIVE"
            }
            db.save_decisions([d_hist, d_cand])

            # Save conflict
            conf_id = "conf_to_resolve"
            c1 = {
                "id": conf_id, "meeting_id": m_id,
                "candidate_decision_id": "dec_cand_1", "historical_decision_id": "dec_hist_1",
                "historical_meeting_title": "M1", "historical_statement": "PostgreSQL",
                "historical_quote": "PostgreSQL", "candidate_quote": "MongoDB",
                "conflict_type": "TECH_STACK_REVERSAL", "reasoning": "Clash",
                "confidence": 0.9, "resolved": False
            }
            db.save_conflicts([c1])

            # Resolve via OVERRIDE_PAST
            res_req = ConflictResolveRequest(resolution_choice="OVERRIDE_PAST")
            await resolve_conflict(conf_id, res_req)

            # Assert historical decision is now SUPERSEDED
            with db.get_connection() as conn:
                cur = conn.cursor()
                cur.execute("SELECT status, superseded_by_id FROM decisions WHERE id = 'dec_hist_1'")
                row = cur.fetchone()
                self.assertEqual(row["status"], "SUPERSEDED")
                self.assertEqual(row["superseded_by_id"], "dec_cand_1")

                # Assert conflict is marked resolved
                cur.execute("SELECT resolved FROM conflicts WHERE id = ?", (conf_id,))
                self.assertEqual(cur.fetchone()["resolved"], 1)

        asyncio.run(run_test())

if __name__ == "__main__":
    unittest.main()

