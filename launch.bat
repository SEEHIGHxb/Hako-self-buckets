@echo off
REM Launches the Self-Buckets Streamlit app via the project's venv.
REM Double-click from Explorer or pin to taskbar.
start "" "%~dp0.venv\Scripts\streamlit.exe" run "%~dp0app.py"
