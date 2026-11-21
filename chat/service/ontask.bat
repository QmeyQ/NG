@echo off
chcp 65001 >nul
title Install CodexChat Service (NSSM)
fltmc >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs -WorkingDirectory '%~dp0'"
    exit /b
)
cd /d "%~dp0"
set "SVC_DIR=%~dp0"
set "SVC_DIR=%SVC_DIR:~0,-1%"
for %%I in ("%SVC_DIR%\..") do set "CHAT_DIR=%%~fI"
for %%I in ("%CHAT_DIR%\..") do set "ROOT_DIR=%%~fI"
set "NSSM=%SVC_DIR%\nssm.exe"
set "NODE=%ROOT_DIR%\server\re\bin\node.exe"
set "BRIDGE=%CHAT_DIR%\bridge.cjs"
set "LOGFILE=%SVC_DIR%\chat_service.log"
set "SVC=CodexChat"
echo ============================================================
echo  CodexChat autostart install (NSSM)
echo  ROOT: %ROOT_DIR%
echo  NODE: %NODE%
echo  BRIDGE: %BRIDGE%
echo  PORT: 127.0.0.1:21121
echo ============================================================
if not exist "%NSSM%" ( echo [ERROR] nssm.exe not found: %NSSM% & pause & exit /b 1 )
if not exist "%NODE%" ( echo [ERROR] node.exe not found: %NODE% & pause & exit /b 1 )
if not exist "%BRIDGE%" ( echo [ERROR] bridge.cjs not found: %BRIDGE% & pause & exit /b 1 )
echo Stopping manual chat bridge on port 21121...
powershell -ExecutionPolicy Bypass -File "%SVC_DIR%\kill_manual.ps1"
timeout /t 2 /nobreak >nul
nssm status %SVC% >nul 2>&1
if %errorlevel% equ 0 (
    echo Existing service found, stopping and removing...
    nssm stop %SVC% >nul 2>&1
    nssm remove %SVC% confirm >nul 2>&1
)
nssm install %SVC% "%NODE%" "%BRIDGE%"
if %errorlevel% neq 0 ( echo [ERROR] failed to install %SVC% & pause & exit /b 1 )
nssm set %SVC% AppDirectory "%ROOT_DIR%"
nssm set %SVC% Start SERVICE_AUTO_START
nssm set %SVC% AppExit Default Restart
nssm set %SVC% AppThrottle 5000
nssm set %SVC% AppRestartDelay 5000
nssm set %SVC% AppKillProcessTree 1
nssm set %SVC% DisplayName "Codex Chat Bridge"
nssm set %SVC% Description "Codex remote sync chat bridge: iLink WeChat + Web chat + relay"
nssm set %SVC% AppStdout "%LOGFILE%"
nssm set %SVC% AppStderr "%LOGFILE%"
nssm set %SVC% AppRotateFiles 1
nssm set %SVC% AppRotateBytes 10485760
nssm start %SVC%
echo.
echo [DONE] %SVC% installed and started (auto start + restart on crash).
echo   Status: nssm status %SVC%
echo   Log: %LOGFILE%
echo   URL: http://127.0.0.1:21121/codex.html
echo.
pause
exit /b 0
