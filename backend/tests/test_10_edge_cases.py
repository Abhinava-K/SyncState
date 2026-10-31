import unittest
import asyncio
from app.database import db
from app.api.routes.meetings import ingest_meeting
from app.schemas.payloads import TranscriptIngestRequest, ConflictType
from app.services.extractor_service import extractor_service

class Test10EdgeCasesCollisionEngine(unittest.TestCase):
    """
    Evaluates 10 Crucial Software Architecture Edge Cases:
    - 5 True Positives (Collisions detected)
    - 5 True Negatives (False Positives suppressed)
    """

    def test_all_10_edge_cases(self):
        async def run_test():
            # 1. Reset test database
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM conflicts WHERE workspace_id = 'ws_edge_cases'")
                cursor.execute("DELETE FROM action_items WHERE workspace_id = 'ws_edge_cases'")
                cursor.execute("DELETE FROM decisions WHERE workspace_id = 'ws_edge_cases'")
                cursor.execute("DELETE FROM meetings WHERE workspace_id = 'ws_edge_cases'")
                conn.commit()

            # 2. Ingest Meeting 1 Baseline
            with open("sample_data/meeting_1_baseline.vtt", "r", encoding="utf-8") as f:
                vtt1_text = f.read()
            
            turns1 = extractor_service.parse_vtt(vtt1_text)
            req1 = TranscriptIngestRequest(
                meeting_title="Baseline Architecture & Roadmap Sync (Oct 12)",
                date="2026-10-12",
                turns=turns1
            )
            res1 = await ingest_meeting(req1, "ws_edge_cases")
            self.assertEqual(len(res1.conflicts), 0, "Baseline meeting should have 0 conflicts")

            # Commit Meeting 1
            with db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE meetings SET status = 'COMMITTED' WHERE id = ?", (res1.meeting_id,))
                conn.commit()

            # 3. Ingest Meeting 2 Edge Cases
            with open("sample_data/meeting_2_edge_cases.vtt", "r", encoding="utf-8") as f:
                vtt2_text = f.read()

            turns2 = extractor_service.parse_vtt(vtt2_text)
            req2 = TranscriptIngestRequest(
                meeting_title="Follow-Up Sprint Sync (Oct 24)",
                date="2026-10-24",
                turns=turns2
            )
            res2 = await ingest_meeting(req2, "ws_edge_cases")

            # Verification of 5 True Positives
            conflict_types = [c.conflict_type for c in res2.conflicts]
            self.assertEqual(len(res2.conflicts), 5, f"Expected exactly 5 conflicts, got {len(res2.conflicts)}")
            self.assertIn(ConflictType.TECH_STACK_REVERSAL, conflict_types)
            self.assertIn(ConflictType.TIMELINE_SLIP, conflict_types)
            self.assertIn(ConflictType.CONTRACT_INVERSION, conflict_types)
            self.assertIn(ConflictType.DEPENDENCY_DEADLOCK, conflict_types)
            self.assertIn(ConflictType.OWNER_DISPUTE, conflict_types)

        asyncio.run(run_test())

if __name__ == "__main__":
    unittest.main()

