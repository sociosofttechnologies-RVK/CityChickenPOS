@echo off
rem Opens the TV screen full screen on this computer (for a TV plugged in by HDMI, or to check it).
rem For a TV on Wi-Fi, type the address shown in the till under TV Preview into the TV browser.
cd /d "%~dp0"
rem Stop an older copy of the service if one is still running, so the newest version is always the one in use.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4310 " ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
start "City Chicken POS service" /min node server.js
timeout /t 2 /nobreak >nul
start "" chrome --kiosk --autoplay-policy=no-user-gesture-required --user-data-dir="%~dp0.tv-browser" http://localhost:4310/tv
