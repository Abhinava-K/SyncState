import unittest
import asyncio
from app.services.audit_service import audit_service
from app.schemas.payloads import ConflictType

class TestPhase3ConflictDetection(unittest.TestCase):
    """
    Phase 3 Test Suite:
    - Verifies Tech Stack Reversal detection
    - Verifies Timeline Slip detection
    - Verifies False Positive Suppression on non-conflicting items
    """

    def test_tech_stack_reversal(self):
        async def run_test():
            historical = {
                "id": "dec_hist_pg",
                "meeting_title": "Architecture Alignment (Oct 12)",
                "topic": "Database Architecture",
                "statement": "We chose PostgreSQL for our database architecture.",
                "verbatim_quote": "We chose PostgreSQL for our database architecture."
            }
            candidate = {
                "id": "dec_cand_mongo",
                "topic": "Database Architecture",
                "statement": "Let's stick with MongoDB for the next 6 months to avoid schema migration.",
                "verbatim_quote": "Let's stick with MongoDB for the next 6 months to avoid schema migration."
            }

            conflicts = await audit_service.audit_decision_conflicts(candidate, [historical], "meet_curr")
            self.assertEqual(len(conflicts), 1)
            self.assertEqual(conflicts[0].conflict_type, ConflictType.TECH_STACK_REVERSAL)
            self.assertGreaterEqual(conflicts[0].confidence, 0.80)
            self.assertIn("MONGODB", conflicts[0].reasoning.upper())

        asyncio.run(run_test())

    def test_timeline_slip(self):
        async def run_test():
            historical = {
                "id": "dec_hist_freeze",
                "meeting_title": "Planning Sync (Oct 12)",
                "topic": "Release Timeline",
                "statement": "Our hard release freeze deadline is set for November 15th.",
                "verbatim_quote": "Our hard release freeze deadline is set for November 15th."
            }
            candidate = {
                "id": "dec_cand_slip",
                "topic": "Release Timeline",
                "statement": "The marketing campaign has been brought forward, so our target release freeze is now November 5th.",
                "verbatim_quote": "The marketing campaign has been brought forward, so our target release freeze is now November 5th."
            }

            conflicts = await audit_service.audit_decision_conflicts(candidate, [historical], "meet_curr")
            self.assertEqual(len(conflicts), 1)
            self.assertEqual(conflicts[0].conflict_type, ConflictType.TIMELINE_SLIP)
            self.assertGreaterEqual(conflicts[0].confidence, 0.80)

        asyncio.run(run_test())

    def test_false_positive_suppression(self):
        async def run_test():
            historical = {
                "id": "dec_hist_pg",
                "meeting_title": "Architecture Sync",
                "topic": "Database Architecture",
                "statement": "We chose PostgreSQL.",
                "verbatim_quote": "We chose PostgreSQL."
            }
            # Independent candidate in another topic
            candidate = {
                "id": "dec_cand_auth",
                "topic": "Auth & Security",
                "statement": "Rahul will build the JWT auth tokens.",
                "verbatim_quote": "Rahul will build the JWT auth tokens."
            }

            conflicts = await audit_service.audit_decision_conflicts(candidate, [historical], "meet_curr")
            self.assertEqual(len(conflicts), 0, "Independent topics should never produce conflicts")

        asyncio.run(run_test())

if __name__ == "__main__":
    unittest.main()

