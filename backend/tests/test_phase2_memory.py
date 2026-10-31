import unittest
import asyncio
from app.database import db
from app.services.memory_service import memory_service

class TestPhase2Memory(unittest.TestCase):
    """
    Phase 2 Test Suite:
    - Verifies persistent decision storage & retrieval in SQLite
    - Verifies vector embedding and cosine similarity math
    - Verifies hybrid search (dense similarity + topic matching)
    """

    def setUp(self):
        with db.get_connection() as conn:
            c = conn.cursor()
            c.execute("DELETE FROM decisions")
            c.execute("DELETE FROM meetings")
            conn.commit()

    def test_database_persistence(self):
        meeting_id = "meet_test_mem"
        db.save_meeting(meeting_id, "Test Meeting", "2026-10-31", [])

        d1 = {
            "id": "dec_01",
            "meeting_id": meeting_id,
            "topic": "Database Architecture",
            "statement": "We chose PostgreSQL for all core services.",
            "speaker": "Alex",
            "turn_index": 0,
            "verbatim_quote": "We chose PostgreSQL for all core services.",
            "status": "ACTIVE",
            "embedding": [0.1, 0.2, 0.3]
        }
        db.save_decisions([d1])

        active_decisions = db.get_all_active_decisions()
        self.assertEqual(len(active_decisions), 1)
        self.assertEqual(active_decisions[0]["statement"], "We chose PostgreSQL for all core services.")
        self.assertEqual(active_decisions[0]["status"], "ACTIVE")

    def test_cosine_similarity(self):
        v1 = [1.0, 0.0, 0.0]
        v2 = [1.0, 0.0, 0.0]
        v3 = [0.0, 1.0, 0.0]

        sim_identical = memory_service._cosine_similarity(v1, v2)
        sim_orthogonal = memory_service._cosine_similarity(v1, v3)

        self.assertAlmostEqual(sim_identical, 1.0, places=4)
        self.assertAlmostEqual(sim_orthogonal, 0.0, places=4)

    def test_hybrid_search(self):
        async def run_hybrid():
            meeting_id = "meet_test_search"
            db.save_meeting(meeting_id, "Arch Sync", "2026-10-12", [])

            emb1 = await memory_service.get_embedding("Topic: Database Architecture. Statement: Standardize on PostgreSQL")
            d1 = {
                "id": "dec_pg",
                "meeting_id": meeting_id,
                "topic": "Database Architecture",
                "statement": "Standardize on PostgreSQL database engine.",
                "speaker": "Alex",
                "turn_index": 0,
                "verbatim_quote": "Standardize on PostgreSQL database engine.",
                "status": "ACTIVE",
                "embedding": emb1
            }
            db.save_decisions([d1])

            # Query with related topic & statement
            results = await memory_service.search_similar_decisions(
                topic="Database Architecture",
                statement="Should we use MongoDB or stick with PostgreSQL?",
                exclude_meeting_id="meet_other",
                top_k=3
            )
            self.assertGreaterEqual(len(results), 1)
            self.assertEqual(results[0]["id"], "dec_pg")
            self.assertGreaterEqual(results[0]["similarity_score"], 0.50)

        asyncio.run(run_hybrid())

if __name__ == "__main__":
    unittest.main()

