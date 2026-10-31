import unittest
import asyncio
from app.database import db
from app.services.tracker_service import tracker_service
from app.services.digest_service import digest_service

class TestPhase5DispatchAndDigest(unittest.TestCase):
    """
    Phase 5 Test Suite:
    - Verifies Task Dispatcher (Linear/GitHub ticket generation)
    - Verifies Idempotency on repeated dispatches
    - Verifies Deadline Urgency evaluation (<24h, <48h)
    - Verifies Per-Person Weekly Digest compilation
    """

    def setUp(self):
        with db.get_connection() as conn:
            c = conn.cursor()
            c.execute("DELETE FROM action_items")
            c.execute("DELETE FROM decisions")
            c.execute("DELETE FROM meetings")
            conn.commit()

    def test_idempotent_dispatch(self):
        async def run_test():
            m_id = "meet_dispatch"
            db.save_meeting(m_id, "Sprint Sync", "2026-10-24", [])

            action = {
                "id": "act_test_101",
                "meeting_id": m_id,
                "task": "Build Stripe Webhook handler",
                "assignee": "Rahul",
                "deadline": "Friday",
                "priority": "high",
                "turn_index": 2,
                "verbatim_quote": "I will build Stripe Webhook handler.",
                "is_approved": True
            }
            db.save_action_items([action])

            # Dispatch 1
            tickets1 = await tracker_service.dispatch_action_items(["act_test_101"], provider="linear")
            self.assertEqual(len(tickets1), 1)
            first_url = tickets1[0].url
            self.assertIn("SYN-", tickets1[0].ticket_id)

            # Dispatch 2 (Must be idempotent and reuse existing URL)
            tickets2 = await tracker_service.dispatch_action_items(["act_test_101"], provider="linear")
            self.assertEqual(len(tickets2), 1)
            self.assertEqual(tickets2[0].url, first_url, "Repeated dispatch must be idempotent")

        asyncio.run(run_test())

    def test_deadline_urgency_and_digest(self):
        m_id = "meet_digest_test"
        db.save_meeting(m_id, "Planning Sync", "2026-10-24", [])

        # Add tasks with varying deadlines
        a1 = {
            "id": "act_urgent", "meeting_id": m_id, "task": "Hotfix Auth",
            "assignee": "Rahul", "deadline": "Today", "priority": "urgent",
            "turn_index": 0, "verbatim_quote": "I will hotfix today.", "is_approved": True
        }
        a2 = {
            "id": "act_soon", "meeting_id": m_id, "task": "Update Readme",
            "assignee": "Rahul", "deadline": "Friday", "priority": "medium",
            "turn_index": 1, "verbatim_quote": "I will update readme by Friday.", "is_approved": True
        }
        a3 = {
            "id": "act_qa", "meeting_id": m_id, "task": "Run Load Tests",
            "assignee": "Sarah", "deadline": "Nov 15", "priority": "low",
            "turn_index": 2, "verbatim_quote": "I will run load tests by Nov 15.", "is_approved": True
        }
        db.save_action_items([a1, a2, a3])

        # Generate weekly digest
        digest = digest_service.generate_weekly_digest()

        # Check members
        self.assertEqual(len(digest.members), 2, "Should group into Rahul and Sarah")
        
        rahul_data = next(m for m in digest.members if m.assignee == "Rahul")
        self.assertEqual(len(rahul_data.active_tasks), 2)
        
        # Check deadline urgency
        urgent_reminders = [r for r in rahul_data.reminders if r.urgency == "critical_24h"]
        self.assertGreaterEqual(len(urgent_reminders), 1)

        # Check Markdown output contains section headers
        self.assertIn("### 👤 Rahul", digest.markdown_summary)
        self.assertIn("### 👤 Sarah", digest.markdown_summary)
        self.assertIn("Hotfix Auth", digest.markdown_summary)

if __name__ == "__main__":
    unittest.main()

