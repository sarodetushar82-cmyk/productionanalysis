@echo off
TITLE Production Monitoring System
cd /d "%~dp0"

echo ---------------------------------------------------
echo      PRODUCTION MONITORING SYSTEM - STARTUP
echo ---------------------------------------------------
echo.

node server.js
pause
