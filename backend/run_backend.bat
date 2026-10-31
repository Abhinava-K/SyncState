@echo off
echo Starting SyncState FastAPI Backend...
cd %~dp0
pip install -r requirements.txt
python -m app.main
pause

