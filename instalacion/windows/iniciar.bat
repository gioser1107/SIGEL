@echo off
setlocal EnableExtensions
title SIGEL - Travel BQTO
cd /d "%~dp0..\.."

if not exist "frontend\dist\index.html" (
  echo [ERROR] Falta frontend\dist. En tu PC de desarrollo ejecuta: cd frontend ^&^& npm run build
  pause
  exit /b 1
)

if not exist "backend\.env" (
  if exist "instalacion\env.ejemplo.txt" (
    copy /Y "instalacion\env.ejemplo.txt" "backend\.env" >nul
    echo [AVISO] Se creo backend\.env. Si MySQL tiene clave, edite DB_CONTRASENA.
  ) else (
    echo [ERROR] Falta backend\.env
    echo Cree el archivo con Bloc de notas:
    echo   notepad C:\SIGEL\backend\.env
    echo Contenido: vea instalacion\GUIA_PC_VIRGEN.md seccion 3.6
    pause
    exit /b 1
  )
)

if exist "backend\.venv\Scripts\python.exe" (
  set "PYTHON_SIGEL=backend\.venv\Scripts\python.exe"
) else (
  set "PYTHON_SIGEL=python"
)

echo Iniciando SIGEL en http://127.0.0.1:8000
echo No cierre esta ventana mientras use el sistema.
echo.

start "" "http://127.0.0.1:8000"
cd backend
"%PYTHON_SIGEL%" -m uvicorn main:app --host 127.0.0.1 --port 8000
if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo iniciar. Revise Python, MySQL y backend\.env
  pause
)
