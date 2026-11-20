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

echo [3/3] Cerrando ventanas de consola del Backend CHOHO...
taskkill /F /FI "WINDOWTITLE eq CHOHO Backend*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq CHOHO PERU - Backend Node.js*" /T >nul 2>&1

echo.
echo ======================================================================
echo   TODOS LOS SERVICIOS DE CHOHO PERU SE HAN DETENIDO CORRECTAMENTE.
echo ======================================================================
echo.
timeout /t 3 >nul
