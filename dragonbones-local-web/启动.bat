@echo off
setlocal
set "WEB=%~dp0web"
set "PORT=8123"

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python not found in PATH.
  echo You can serve this folder with any local web server, for example:
  echo     npx http-server "%WEB%" -p %PORT%
  pause
  exit /b 1
)

echo Starting DragonBones local viewer at http://127.0.0.1:%PORT%/
start "" /min cmd /c "python -m http.server %PORT% --bind 127.0.0.1 --directory ""%WEB%"" "
timeout /t 2 >nul
start "" "http://127.0.0.1:%PORT%/"

echo.
echo Viewer opened. Keep this window or the minimized server window open.
echo Close the minimized "python -m http.server" window to stop the server.
timeout /t 4 >nul
