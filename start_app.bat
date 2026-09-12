@echo off
title InstaSound - Instagram Music Player
echo ========================================================
echo        Starting InstaSound Music App Server...
echo ========================================================
cd /d "%~dp0backend"
python main.py
pause
