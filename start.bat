@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules call npm ci --no-bin-links
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1
node dist\server.js
