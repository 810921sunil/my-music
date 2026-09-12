@echo off
title My Music - Live Server & Public Link
echo ========================================================
echo        Starting My Music Server & Live Public Link...
echo ========================================================
cd /d "%~dp0"

echo [1/2] Starting Backend Server on port 8000...
start "My Music Server" cmd /k "python backend/main.py"

echo [2/2] Waiting for server to initialize...
timeout /t 3 >nul

echo.
echo ========================================================
echo Connecting to Public Live Tunnel...
echo Look for the https://... URL below and share it with anyone!
echo ========================================================
echo.

ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:8000 nokey@localhost.run
pause
