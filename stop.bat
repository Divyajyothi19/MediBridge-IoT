@echo off
title MediBridge Stopper
echo ========================================================
echo         Stopping MediBridge System...
echo ========================================================
echo.

echo Stopping Python backend processes...
taskkill /F /IM python.exe /T 2>nul

echo Stopping Node frontend processes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo ========================================================
echo  All MediBridge services have been stopped successfully!
echo ========================================================
echo.
pause
