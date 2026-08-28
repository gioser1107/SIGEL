@echo off
echo Cerrando SIGEL en el puerto 8000...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
)
echo Listo.
timeout /t 2 >nul
