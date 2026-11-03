@echo off
rem Starts the City Chicken POS on this PC and opens it in Chrome.
rem --kiosk-printing sends receipts straight to the Windows default printer with no print dialog.
cd /d "%~dp0"
rem Stop an older copy of the service if one is still running, so the newest version is always the one in use.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4310 " ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
start "City Chicken POS service" /min node server.js
timeout /t 2 /nobreak >nul
start "" chrome --kiosk-printing --app=http://localhost:4310
