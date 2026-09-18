@echo off
title NexusTalk Agent (Remote Control)
cd /d "%~dp0agent"
echo Starting NexusTalk agent — this PC can now BE controlled in calls.
python -u agent.py
pause
