@echo off
title TFC Films Website
cd /d "%~dp0"

echo.
echo  ========================================
echo   TFC Films - Tales From the Culture
echo  ========================================
echo.
echo  Starting local server on port 8080...
echo  Press Ctrl+C to stop the server.
echo.

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  Python not found. Install Python 3 from https://python.org
    pause
    exit /b 1
)

start "" "http://localhost:8080/"
python serve.py