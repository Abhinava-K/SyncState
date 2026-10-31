@echo off
cls
echo ===================================================================
echo             SyncState Phase-Wise Modular Test Runner
echo ===================================================================
echo [1] Phase 1: Ingestion, Speaker Diarization & Schema Tests
echo [2] Phase 2: Institutional Memory & Vector Retrieval Tests
echo [3] Phase 3: Conflict Detection & Contradiction Reasoning Tests
echo [4] Phase 4: HITL Staging Diff & Safety Gate Lock Tests
echo [5] Phase 5: Issue Tracker Dispatch & Weekly Digest Tests
echo [A] Run All Phases Sequentially
echo ===================================================================
set /p choice="Select Phase to run (1-5 or A): "

cd backend
if /i "%choice%"=="1" python run_phase_tests.py --phase 1
if /i "%choice%"=="2" python run_phase_tests.py --phase 2
if /i "%choice%"=="3" python run_phase_tests.py --phase 3
if /i "%choice%"=="4" python run_phase_tests.py --phase 4
if /i "%choice%"=="5" python run_phase_tests.py --phase 5
if /i "%choice%"=="A" python run_phase_tests.py --all
pause
