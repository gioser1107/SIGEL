@echo off
setlocal EnableExtensions
cd /d "%~dp0..\..\backend"

if exist ".env" (
  echo Ya existe C:\SIGEL\backend\.env
  echo Para editarlo: notepad "%cd%\.env"
  pause
  exit /b 0
)

if exist "%~dp0..\env.ejemplo.txt" (
  copy /Y "%~dp0..\env.ejemplo.txt" ".env" >nul
) else (
  (
    echo DB_USUARIO=root
    echo DB_CONTRASENA=
    echo DB_HOST=localhost
    echo DB_PUERTO=3306
    echo DB_NOMBRE=travel_bqto
    echo JWT_SECRETO=cambiar-este-secreto-en-la-laptop-de-la-comunidad
    echo JWT_EXPIRACION_MINUTOS=480
  ) > ".env"
)

echo Creado backend\.env
echo Si MySQL/XAMPP no tiene clave, dejalo como esta.
echo Si tiene clave, ponla en DB_CONTRASENA=
echo.
notepad "%cd%\.env"
