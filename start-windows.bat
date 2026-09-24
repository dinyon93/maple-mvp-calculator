@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
if not exist config.local.json (
  echo Auction refresh setup: copy config.local.example.json to config.local.json and edit it locally.
  echo The calculator will still open, but auction refresh needs that file.
)
if not exist node_modules\playwright (
  echo Installing browser automation library once...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Installation failed. Check the network connection and run this file again.
    pause
    exit /b 1
  )
)
start "MVP calculator server" cmd /k "node server.js"
timeout /t 2 >nul
start "" http://127.0.0.1:8765/
