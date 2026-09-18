@echo off
title NexusTalk Launcher
echo ============================================
echo   NexusTalk - starting all services...
echo ============================================

cd /d C:\Users\Admin\.zcode\workspace\default\server
start "NexusTalk Server" cmd /k npm start

cd /d C:\Users\Admin\.zcode\workspace\default\agent
start "NexusTalk Agent" cmd /k python -u agent.py

cd /d C:\Users\Admin\.zcode\workspace\default\nexustalk
start "NexusTalk UI" cmd /k npm run dev

cd /d C:\Users\Admin\.zcode\workspace\default\tools
start "NexusTalk Tunnel" cmd /k cloudflared.exe tunnel --url http://localhost:3000

echo.
echo  4 ta window khulo holo:
echo   1. NexusTalk Server  - backend (port 4000)
echo   2. NexusTalk Agent   - remote control ready (PC controllable)
echo   3. NexusTalk UI      - app (http://localhost:3000)
echo   4. NexusTalk Tunnel  - public link (window e https://...trycloudflare.com link dekhabe)
echo.
echo  NOTE: Tunnel restart korle NOTUN link ashbe.
echo  Apnar PC bondho korle link kaj korbe na.
echo.
pause
