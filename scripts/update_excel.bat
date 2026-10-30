@echo off
echo ========================================================
echo Updating TKPL Registered Players Live Excel Sheet
echo ========================================================
cd /d "%~dp0\.."
uv run --with openpyxl --with requests python scripts\export_players_excel.py
echo.
pause
