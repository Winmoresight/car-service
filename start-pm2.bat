@echo off
REM Start PM2 processes on Windows startup
cd /d "%~dp0"
pm2 resurrect
pm2 save
