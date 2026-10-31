import unittest
import asyncio
from app.services.audit_service import audit_service
from app.schemas.payloads import ConflictType

class TestPhase3ConflictDetection(unittest.TestCase):
    """
    Phase 3 Test Suite:
    - Verifies Tech Stack Reversal detection
    - Verifies Timeline Slip detection
    - Verifies Contract & RPC Inversion detection
    - Verifies Action Item Dependency Deadlock detection
    - Verifies Domain Ownership Dispute detection
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

    def test_contract_inversion(self):
        async def run_test():
            historical = {
                "id": "dec_hist_proto",
                "meeting_title": "API Review",
                "topic": "API Architecture",
                "statement": "All services will communicate via REST JSON endpoints with OpenAPI spec.",
                "verbatim_quote": "All services will communicate via REST JSON endpoints."
            }
            candidate = {
                "id": "dec_cand_grpc",
                "topic": "API Architecture",
                "statement": "We should switch to gRPC for backend inter-service calls.",
                "verbatim_quote": "We should switch to gRPC for backend inter-service calls."
            }

            conflicts = await audit_service.audit_decision_conflicts(candidate, [historical], "meet_curr")
            self.assertEqual(len(conflicts), 1)
            self.assertEqual(conflicts[0].conflict_type, ConflictType.CONTRACT_INVERSION)
            self.assertIn("GRPC", conflicts[0].reasoning.upper())

        asyncio.run(run_test())

    def test_dependency_deadlock(self):
        # Action Item A: Delivery of payment webhook scheduled for Friday
        historical_action = {
            "id": "act_stripe",
            "task": "Deliver the Stripe webhook integration and payment gateway",
            "assignee": "Rahul",
            "deadline": "Friday",
            "verbatim_quote": "I will deliver the Stripe webhook integration by Friday."
        }
        # Action Item B: Testing scheduled for Tuesday (before Friday!)
        candidate_action = {
            "id": "act_load_test",
            "task": "Run performance load testing on the checkout payment flow",
            "assignee": "Sarah",
            "deadline": "Tuesday",
            "verbatim_quote": "I can run performance load testing on the checkout flow before Tuesday."
        }

        conflicts = audit_service.audit_action_conflicts([candidate_action], [historical_action], "meet_curr")
        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0].conflict_type, ConflictType.DEPENDENCY_DEADLOCK)
        self.assertIn("Tuesday", conflicts[0].reasoning)
        self.assertIn("Friday", conflicts[0].reasoning)

    def test_owner_dispute(self):
        # Feature ownership dispute: Rahul was assigned Auth; now David is assigned Auth
        historical_action = {
            "id": "act_rahul_auth",
            "task": "Migrate user auth and session tokens",
            "assignee": "Rahul",
            "deadline": "Thursday",
            "verbatim_quote": "Rahul will migrate user auth and session tokens."
        }
        candidate_action = {
            "id": "act_david_auth",
            "task": "Implement auth session token caching",
            "assignee": "David",
            "deadline": "Next Sprint",
            "verbatim_quote": "David will implement auth session token caching."
        }

        conflicts = audit_service.audit_action_conflicts([candidate_action], [historical_action], "meet_curr")
        self.assertEqual(len(conflicts), 1)
        self.assertEqual(conflicts[0].conflict_type, ConflictType.OWNER_DISPUTE)
        self.assertIn("Rahul", conflicts[0].reasoning)
        self.assertIn("David", conflicts[0].reasoning)

    def test_false_positive_suppression(self):
        async def run_test():
            historical = {
                "id": "dec_hist_pg",
                "meeting_title": "Architecture Sync",
                "topic": "Database Architecture",
                "statement": "We chose PostgreSQL.",
                "verbatim_quote": "We chose PostgreSQL."
            }
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
