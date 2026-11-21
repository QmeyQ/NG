@echo off
setlocal EnableExtensions
set "BLENDER=F:\ENV\3D\blender\blender.exe"
set "SCRIPT=F:\LayaProject\tools\blender\blender_mcp_start.py"
set "MCP=C:\Users\mien\.codex\blender-mcp\.venv\Scripts\mcp-for-blender.exe"
powershell -NoProfile -Command "try { $c=New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1',9876); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command "Start-Process -FilePath '%BLENDER%' -ArgumentList '--python','%SCRIPT%' -WorkingDirectory 'F:\ENV\3D\blender' -WindowStyle Minimized" >nul 2>&1
    call :wait_mcp
)
"%MCP%" --host 127.0.0.1 --port 9876
exit /b %errorlevel%
:wait_mcp
set "WAIT=0"
:wait_mcp_loop
if %WAIT% geq 30 exit /b 1
ping -n 2 127.0.0.1 >nul
powershell -NoProfile -Command "try { $c=New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1',9876); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a WAIT+=1
goto :wait_mcp_loop
