@echo off
set "BLENDER=F:\ENV\3D\blender\blender.exe"
set "SCRIPT=F:\LayaProject\tools\blender\blender_mcp_start.py"
if not exist "%BLENDER%" ( echo Blender not found: %BLENDER% & pause & exit /b 1 )
if not exist "%SCRIPT%" ( echo startup script not found: %SCRIPT% & pause & exit /b 1 )
if "%~1"=="" (
  start "" "%BLENDER%" --python "%SCRIPT%"
) else (
  start "" "%BLENDER%" "%~1" --python "%SCRIPT%"
)
exit /b 0
