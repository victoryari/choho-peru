@echo off
title CHOHO PERU - Servidor Publico Cloudflare Tunnel
color 0A
cls
echo ======================================================================
echo          CHOHO PERU - INICIANDO SISTEMA ERP EN LINEA
echo ======================================================================
echo  1. Base de Datos: TiDB Cloud Serverless (gateway01.us-east-1.prod.aws.tidbcloud.com)
echo  2. Servidor Local: http://localhost:3000
echo  3. Tunel Publico: Cloudflare (HTTPS Seguro con SSL Oficial)
echo ======================================================================
echo.

if not exist dist\server.cjs (
    echo [1/3] Compilando bundle de produccion...
    call npm run build
) else (
    echo [1/3] Bundle de produccion listo.
)

echo [2/3] Levantando Servidor Node.js...
start "CHOHO PERU - Backend Node.js" cmd /k "title CHOHO Backend && npm start"

timeout /t 3 /nobreak >nul

echo [3/3] Conectando Tunel Publico Seguro Cloudflare...
echo.
echo ======================================================================
echo  COPIA EL ENLACE QUE TERMINA EN .trycloudflare.com QUE APARECERA ABAJO
echo  Y COMPARTELO CON TUS USUARIOS PARA LAS PRUEBAS EN VIVO.
echo ======================================================================
echo.

cloudflared.exe tunnel --url http://localhost:3000
pause
