@echo off
rem Run once. Puts two icons on the Desktop: the till, and the TV preview.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $here = (Get-Location).Path; foreach ($x in @(@('City Chicken Till','start.bat','till.ico'), @('City Chicken TV Preview','tv-preview.bat','tv.ico'))) { $s = $w.CreateShortcut((Join-Path $d ($x[0] + '.lnk'))); $s.TargetPath = (Join-Path $here $x[1]); $s.WorkingDirectory = $here; $s.IconLocation = (Join-Path $here ('icons\' + $x[2])); $s.WindowStyle = 7; $s.Save() }"
echo Two shortcuts were added to the Desktop: City Chicken Till and City Chicken TV Preview.
pause
