@echo off
chcp 65001 >nul
title 安装 re-relay AI 远程中转服务 (NSSM)

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

:: ================= 路径定义 =================
:: 本脚本在 re/frp/ 下; relay 项目根在上一级 re/
set "FRP_DIR=%~dp0"
set "FRP_DIR=%FRP_DIR:~0,-1%"
for %%I in ("%FRP_DIR%\..") do set "RELAY_DIR=%%~fI"

set "NSSM=%FRP_DIR%\nssm.exe"
set "NODE=%RELAY_DIR%\bin\node.exe"
set "FRPC=%FRP_DIR%\frpc.exe"
set "SERVER_JS=%RELAY_DIR%\server.js"
set "FRPC_TOML=%RELAY_DIR%\frpc.toml"
set "SVC_API=ReAPI"
set "SVC_FRP=ReFrp"

echo ============================================================
echo  re-relay AI 远程中转 开机自启安装
echo  relay 根目录: %RELAY_DIR%
echo  注意: 不触碰既有远程控制服务 FRPC (21118-^>5000)
echo ============================================================

:: ================= 检查必要文件 =================
if not exist "%NSSM%" ( echo [错误] 未找到 nssm.exe: %NSSM% & pause & exit /b 1 )
if not exist "%NODE%" ( echo [错误] 未找到 node.exe: %NODE% & pause & exit /b 1 )
if not exist "%FRPC%" ( echo [错误] 未找到 frpc.exe: %FRPC% & pause & exit /b 1 )
if not exist "%SERVER_JS%" ( echo [错误] 未找到 server.js: %SERVER_JS% & pause & exit /b 1 )
if not exist "%FRPC_TOML%" ( echo [错误] 未找到 frpc.toml: %FRPC_TOML% & pause & exit /b 1 )

:: ================= 停止手动运行的 relay/隧道实例(避免端口21119/代理名re-api冲突) =================
echo 停止手动 relay(端口21119) 与 relay frpc 实例...
powershell -ExecutionPolicy Bypass -File "%FRP_DIR%\kill_manual.ps1"
timeout /t 2 /nobreak >nul

:: ================= 安装函数: 先卸旧再装新 =================
call :install_svc %SVC_API% "%NODE%" "%SERVER_JS%" "re-relay AI 远程中转 API (文件/终端/LayaAir MCP)" "%RELAY_DIR%" "%RELAY_DIR%\relay_service.log"
call :install_svc %SVC_FRP% "%FRPC%" "-c "%FRPC_TOML%"" "re-relay frp 内网穿透 (21119-^>5001)" "%RELAY_DIR%" "%RELAY_DIR%\frpc_re_service.log"

echo.
echo [完成] 已安装并启动 %SVC_API% 与 %SVC_FRP% (自动启动, 崩溃自动重启)。
echo   API:    %NODE% %SERVER_JS%
echo   隧道:   %FRPC% -c %FRPC_TOML%
echo   既有 FRPC 远程控制服务未改动。
echo.
pause
exit /b 0

:: ================= 子程序: 安装单个服务 =================
:install_svc
set "NAME=%~1"
set "APP=%~2"
set "ARGS=%~3"
set "DESC=%~4"
set "WORKDIR=%~5"
set "LOGFILE=%~6"
echo.
echo --- 安装服务 %NAME% ---
nssm status %NAME% >nul 2>&1
if %errorlevel% equ 0 (
    echo 发现旧服务, 停止并移除...
    nssm stop %NAME% >nul 2>&1
    nssm remove %NAME% confirm >nul 2>&1
)
nssm install %NAME% "%APP%" %ARGS%
if %errorlevel% neq 0 ( echo [错误] %NAME% 安装失败 & exit /b 1 )
nssm set %NAME% AppDirectory "%WORKDIR%"
nssm set %NAME% Start SERVICE_AUTO_START
nssm set %NAME% AppExit Default Restart
nssm set %NAME% AppThrottle 5000
nssm set %NAME% AppRestartDelay 5000
nssm set %NAME% DisplayName "%DESC%"
nssm set %NAME% Description "%DESC%"
nssm set %NAME% AppStdout "%LOGFILE%"
nssm set %NAME% AppStderr "%LOGFILE%"
nssm set %NAME% AppRotateFiles 1
nssm set %NAME% AppRotateBytes 10485760
nssm start %NAME%
echo 服务 %NAME% 已安装并启动。
exit /b 0
