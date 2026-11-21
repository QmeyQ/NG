@echo off
chcp 65001 >nul
title Uninstall CodexChat Service (NSSM)
fltmc >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs -WorkingDirectory '%~dp0'"
    exit /b
)
cd /d "%~dp0"
set "SVC_DIR=%~dp0"
set "SVC_DIR=%SVC_DIR:~0,-1%"
set "NSSM=%SVC_DIR%\nssm.exe"
set "SVC=CodexChat"
echo ============================================================
echo  Uninstall CodexChat service
echo  Only removes %SVC%; chat/ files and config are kept.
echo ============================================================
if not exist "%NSSM%" ( echo [ERROR] nssm.exe not found: %NSSM% & pause & exit /b 1 )
nssm status %SVC% >nul 2>&1
if %errorlevel% neq 0 ( echo Service %SVC% not found, skip. & pause & exit /b 0 )
nssm stop %SVC% >nul 2>&1
nssm remove %SVC% confirm >nul 2>&1
echo.
echo [DONE] %SVC% stopped and removed. chat/ files kept.
echo.
pause
exit /b 0
