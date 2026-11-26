@echo off
title Push MediBridge to GitHub
echo ========================================================
echo         Pushing MediBridge to GitHub...
echo ========================================================
echo.

cd /d "%~dp0"

git remote set-url origin https://github.com/Divyajyothi19/MediBridge-IoT.git

echo Pushing code to https://github.com/Divyajyothi19/MediBridge-IoT ...
echo (If a browser window opens, please click 'Sign in with your browser' / 'Authorize')
echo.

git push -u origin main

echo.
echo ========================================================
if %ERRORLEVEL% EQU 0 (
    echo  SUCCESS! Your project has been pushed to GitHub:
    echo  https://github.com/Divyajyothi19/MediBridge-IoT
) else (
    echo  Push encountered an issue. See message above.
)
echo ========================================================
echo.
pause
