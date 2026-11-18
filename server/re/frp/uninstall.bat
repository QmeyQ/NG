@echo off
chcp 65001 >nul
title 卸载 re-relay AI 远程中转服务 (NSSM)

:: ================= 检测管理员权限 =================
fltmc >nul 2>&1
if %errorlevel% neq 0 (
    echo 请求管理员权限...
    if "%~1"=="" (
        powershell -Command "Start-Process '%~f0' -Verb RunAs -WorkingDirectory '%~dp0'"
    ) else (
        powershell -Command "Start-Process '%~f0' -Verb RunAs -WorkingDirectory '%~dp0' -ArgumentList '%*'"
    )
    exit /b
)

cd /d "%~dp0"
set "FRP_DIR=%~dp0"
set "FRP_DIR=%FRP_DIR:~0,-1%"
set "NSSM=%FRP_DIR%\nssm.exe"
set "SVC_API=ReAPI"
set "SVC_FRP=ReFrp"

echo ============================================================
echo  卸载 re-relay AI 远程中转服务
echo  仅移除 %SVC_API% 与 %SVC_FRP%; 不动远程控制 FRPC。
echo ============================================================
if not exist "%NSSM%" ( echo [错误] 未找到 nssm.exe: %NSSM% & pause & exit /b 1 )

call :remove_svc %SVC_API%
call :remove_svc %SVC_FRP%

echo.
echo [完成] re-relay 服务已卸载。文件保留在 re/ 目录(如需彻底删除请手动删 re/)。
echo   既有 FRPC 远程控制服务未改动。
echo.
pause
exit /b 0

:remove_svc
set "NAME=%~1"
echo.
echo --- 卸载服务 %NAME% ---
nssm status %NAME% >nul 2>&1
if %errorlevel% neq 0 ( echo 服务 %NAME% 不存在, 跳过。 & exit /b 0 )
nssm stop %NAME% >nul 2>&1
nssm remove %NAME% confirm >nul 2>&1
echo 服务 %NAME% 已停止并移除。
exit /b 0
