@echo off
setlocal
echo ========================================
echo    FIRElytics - Launching Dev Orbit
echo ========================================
echo 1. Waking up the server...
start /b cmd /c "npm run dev"

echo 2. Giving the engines 5 seconds to warm up...
timeout /t 5 /nobreak > nul

echo 3. Launching your cockpit...
start http://localhost:3000

echo ========================================
echo SERVER RUNNING. DO NOT CLOSE THIS WINDOW.
echo ========================================
echo If browser didn't open, visit: http://localhost:3000
pause
