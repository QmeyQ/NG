@echo off
setlocal
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\QoderBlenderMCP.lnk"
if exist "%LNK%" ( del /q "%LNK%" & echo [OK] Autostart removed. ) else ( echo [INFO] Autostart not installed. )
pause
exit /b 0
