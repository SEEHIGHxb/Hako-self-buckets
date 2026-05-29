@echo off
REM Launches the Self-Buckets Streamlit prototype via the project's venv.
REM Double-click from Explorer or pin to taskbar.
cd /d "%~dp0"
start "" ".venv\Scripts\streamlit.exe" run "app.py"
