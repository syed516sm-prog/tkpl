@echo off
rem TKPL GitHub Push Helper
cd /d "%~dp0.."
echo Pushing TKPL to GitHub (neworigin main)...
git push neworigin main
if %errorlevel% neq 0 (
    echo.
    echo Trying origin main...
    git push origin main
)
echo.
echo ========================================================
echo Push complete! Vercel will automatically redeploy now.
echo ========================================================
echo.
pause
