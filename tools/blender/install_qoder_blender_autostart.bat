@echo off
setlocal
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\QoderBlenderMCP.lnk"
powershell -NoProfile -Command "$ws=New-Object -ComObject WScript.Shell; $sc=$ws.CreateShortcut('%LNK%'); $sc.TargetPath='F:\LayaProject\tools\blender\start_qoder_blender.bat'; $sc.WorkingDirectory='F:\LayaProject\tools\blender'; $sc.WindowStyle=7; $sc.Description='Start Blender MCP + Qoder'; $sc.Save(); Write-Host ('Created '+$sc.FullName)"
if exist "%LNK%" ( echo [OK] Autostart installed: %LNK% ) else ( echo [ERROR] Failed to create shortcut & pause & exit /b 1 )
echo.
echo Blender MCP + Qoder will start at Windows login (minimized).
pause
exit /b 0
