import unittest
import sys
import argparse

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def run_tests_for_phase(phase_num: int):
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()

    if phase_num == 1:
        from tests.test_phase1_ingestion import TestPhase1Ingestion
        suite.addTests(loader.loadTestsFromTestCase(TestPhase1Ingestion))
        print("\n[PHASE 1] RUNNING INGESTION & DETERMINISTIC EXTRACTION TESTS\n" + "=" * 65)
    elif phase_num == 2:
        from tests.test_phase2_memory import TestPhase2Memory
        suite.addTests(loader.loadTestsFromTestCase(TestPhase2Memory))
        print("\n[PHASE 2] RUNNING INSTITUTIONAL MEMORY & VECTOR RETRIEVAL TESTS\n" + "=" * 65)
    elif phase_num == 3:
        from tests.test_phase3_conflict import TestPhase3ConflictDetection
        suite.addTests(loader.loadTestsFromTestCase(TestPhase3ConflictDetection))
        print("\n[PHASE 3] RUNNING CONFLICT DETECTION & STANCE REASONING TESTS\n" + "=" * 65)
    elif phase_num == 4:
        from tests.test_phase4_staging import TestPhase4StagingGate
        suite.addTests(loader.loadTestsFromTestCase(TestPhase4StagingGate))
        print("\n[PHASE 4] RUNNING HITL STAGING DIFF & SAFETY GATE TESTS\n" + "=" * 65)
    elif phase_num == 5:
        from tests.test_phase5_dispatch_digest import TestPhase5DispatchAndDigest
        suite.addTests(loader.loadTestsFromTestCase(TestPhase5DispatchAndDigest))
        print("\n[PHASE 5] RUNNING TRACKER DISPATCH & WEEKLY DIGEST TESTS\n" + "=" * 65)
    else:
        print(f"Unknown phase: {phase_num}")
        return False

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    return result.wasSuccessful()

def run_all():
    all_passed = True
    for p in range(1, 6):
        success = run_tests_for_phase(p)
        if not success:
            all_passed = False
            print(f"\n[FAIL] Phase {p} tests failed! Halting.")
            break
        else:
            print(f"\n[PASS] Phase {p} passed all exit criteria!")
    if all_passed:
        print("\n" + "=" * 65)
        print("SUCCESS: ALL 5 BACKEND PHASES VERIFIED & READY FOR UI (PHASE 6)!")
        print("=" * 65)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run phase-specific tests for SyncState")
    parser.add_argument("--phase", type=int, choices=[1, 2, 3, 4, 5], help="Phase number to test")
    parser.add_argument("--all", action="store_true", help="Run all phases sequentially")
    args = parser.parse_args()

    if args.all or not args.phase:
        run_all()
    else:
        run_tests_for_phase(args.phase)
