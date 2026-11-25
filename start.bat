@echo off
title MediBridge Launcher
echo ========================================================
echo         Starting MediBridge System...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Launching Backend Server on port 8000...
start "MediBridge Backend" cmd /k "python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Launching Frontend Dashboard on port 5173...
cd frontend
start "MediBridge Frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo ========================================================
echo  All services started!
echo  Dashboard: http://127.0.0.1:5173
echo  Backend:   http://127.0.0.1:8000
echo ========================================================
echo.
pause
