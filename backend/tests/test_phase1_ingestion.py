import unittest
from app.services.extractor_service import extractor_service
from app.schemas.payloads import DiarizedTurn, ExtractedDecision, ExtractedActionItem

class TestPhase1Ingestion(unittest.TestCase):
    """
    Phase 1 Test Suite:
    - Verifies speaker turn parser across multiple transcript notations
    - Verifies deterministic decision & action item extraction
    - Verifies ground-truth quote attribution
    """

    def test_parser_formats(self):
        raw_text = """
Alex (Lead) (01:10): We chose PostgreSQL for our database architecture.
[02:30] Alex (Lead): Our hard release freeze deadline is set for November 15th.
Rahul: I will finish the Auth and JWT session migration by Thursday.
Sarah: I can run performance load testing on the checkout flow before Tuesday.
"""
        turns = extractor_service.parse_raw_text(raw_text)
        self.assertEqual(len(turns), 4, "Should parse exactly 4 turns")
        self.assertIn("Alex", turns[0].speaker)
        self.assertEqual(turns[0].timestamp, "01:10")
        self.assertIn("PostgreSQL", turns[0].text)

        self.assertIn("Alex", turns[1].speaker)
        self.assertEqual(turns[1].timestamp, "02:30")

        self.assertIn("Rahul", turns[2].speaker)
        self.assertIn("Sarah", turns[3].speaker)

    def test_vtt_parser(self):
        vtt_content = """WEBVTT

00:01:10.000 --> 00:01:15.000
<v Alex>We chose PostgreSQL for our database architecture.</v>

00:02:30.000 --> 00:02:35.000
Rahul: I will finish the Auth and JWT session migration by Thursday.
"""
        turns = extractor_service.parse_vtt(vtt_content)
        self.assertEqual(len(turns), 2)
        self.assertEqual(turns[0].speaker, "Alex")
        self.assertIn("PostgreSQL", turns[0].text)
        self.assertEqual(turns[1].speaker, "Rahul")
        self.assertIn("Thursday", turns[1].text)

    def test_srt_parser(self):
        srt_content = """1
00:01:10,000 --> 00:01:15,000
Alex: We chose PostgreSQL for our database.

2
00:02:30,000 --> 00:02:35,000
Rahul: I will finish the Auth API by Thursday.
"""
        turns = extractor_service.parse_srt(srt_content)
        self.assertEqual(len(turns), 2)
        self.assertEqual(turns[0].speaker, "Alex")
        self.assertEqual(turns[1].speaker, "Rahul")

    def test_heuristic_extraction(self):
        turns = [
            DiarizedTurn(turn_index=0, speaker="Alex (Tech Lead)", timestamp="01:10", text="We chose PostgreSQL for our database architecture and we are standardizing on it."),
            DiarizedTurn(turn_index=1, speaker="Rahul (Backend)", timestamp="02:00", text="I will finish the Auth API by Thursday.")
        ]
        decisions, actions = extractor_service._heuristic_extractor(turns, "meet_test_01")

        # 1. Assert decisions
        self.assertEqual(len(decisions), 1)
        self.assertEqual(decisions[0].topic, "Database Architecture")
        self.assertEqual(decisions[0].speaker, "Alex (Tech Lead)")
        self.assertIn("PostgreSQL", decisions[0].statement)
        self.assertEqual(decisions[0].turn_index, 0)
        self.assertEqual(decisions[0].verbatim_quote, turns[0].text)

        # 2. Assert action items
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0].assignee, "Rahul")
        self.assertIn("Thursday", actions[0].deadline)
        self.assertEqual(actions[0].turn_index, 1)
        self.assertEqual(actions[0].verbatim_quote, turns[1].text)

if __name__ == "__main__":
    unittest.main()

