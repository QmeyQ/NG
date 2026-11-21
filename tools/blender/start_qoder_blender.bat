@echo off
setlocal EnableExtensions
set "BLENDER=F:\ENV\3D\blender\blender.exe"
set "SCRIPT=F:\LayaProject\tools\blender\blender_mcp_start.py"
set "QODER=C:\ProgramData\Qoder\Qoder Launcher\Qoder Launcher.exe"
echo ============================================================
echo  Start Blender MCP + Qoder
echo ============================================================
powershell -NoProfile -Command "try { $c=New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1',9876); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Blender MCP 9876 not running, starting Blender...
    start "" /min "%BLENDER%" --python "%SCRIPT%"
    call :wait_mcp
    if errorlevel 1 echo [WARN] Blender MCP did not open 9876 within 25s; see tools\blender\blender_mcp_start.log
) else (
    echo [OK] Blender MCP already listening on 127.0.0.1:9876
)
goto :start_qoder
:wait_mcp
set "WAIT=0"
:wait_mcp_loop
if %WAIT% geq 25 exit /b 1
ping -n 2 127.0.0.1 >nul
powershell -NoProfile -Command "try { $c=New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1',9876); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    echo [OK] Blender MCP listening on 127.0.0.1:9876
    exit /b 0
)
set /a WAIT+=1
goto :wait_mcp_loop

:start_qoder
if "%NOQODER%"=="1" goto :qoder_done
tasklist /fi "IMAGENAME eq Qoder.exe" 2>nul | find /i "Qoder.exe" >nul
if errorlevel 1 goto :qoder_not_running
echo [OK] Qoder already running. If MCP tools are missing, reload/restart Qoder.
goto :qoder_done
:qoder_not_running
echo [INFO] Starting Qoder...
start "" "%QODER%"
:qoder_done
echo.
echo [DONE] Blender MCP is ready; Qoder connects on first blender tool call.
exit /b 0


