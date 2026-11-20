@echo off
title CHOHO PERU - Detener Servicios
color 0C
cls
echo ======================================================================
echo          CHOHO PERU - DETENIENDO SERVICIOS DEL SISTEMA ERP
echo ======================================================================
echo.

echo [1/3] Cerrando Tunel Publico Cloudflare (cloudflared.exe)...
taskkill /F /IM cloudflared.exe /T >nul 2>&1
if %errorlevel%==0 (
    echo       - Tunel Cloudflare detenido correctamente.
) else (
    echo       - No habia ningun tunel Cloudflare activo.
)

echo [2/3] Liberando puerto 3010 (Servidor Backend Node.js)...
set "FOUND_PORT=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3010" ^| findstr "LISTENING"') do (
    set "FOUND_PORT=1"
    echo       - Deteniendo proceso PID %%a en puerto 3010...
    taskkill /F /PID %%a /T >nul 2>&1
)
if "%FOUND_PORT%"=="0" (
    echo       - El puerto 3010 ya estaba libre.
)

echo [3/3] Cerrando todas las ventanas CMD de los servicios CHOHO...
powershell -NoProfile -Command "Get-Process cmd -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*CHOHO*' -and $_.MainWindowTitle -notlike '*Detener*' } | Stop-Process -Force" >nul 2>&1

echo.
echo ======================================================================
echo   TODOS LOS SERVICIOS Y VENTANAS DE CHOHO PERU SE HAN CERRADO.
echo ======================================================================
echo.
timeout /t 2 >nul
