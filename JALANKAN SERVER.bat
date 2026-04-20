@echo off
title Tani Makmur - Database Server
color 0A

echo.
echo  ================================================================
echo         TANI MAKMUR - LOCAL DATABASE SERVER
echo  ================================================================
echo.

cd /d "%~dp0"

:: Check if node exists
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js tidak ditemukan!
    echo  Unduh di: https://nodejs.org
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo  [INFO] Menginstall dependencies pertama kali...
    npm install
    echo.
)

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set LOCAL_IP=%%a
    goto :found
)
:found
set LOCAL_IP=%LOCAL_IP: =%

echo  ================================================================
echo   AKSES DARI PC INI    : http://localhost:3737/dashboard.html
echo   AKSES DARI PC LAIN   : http://%LOCAL_IP%:3737/dashboard.html
echo   MIGRASI DATA         : http://localhost:3737/migrate.html
echo  ================================================================
echo.
echo  [INFO] Server akan berjalan di background.
echo  [INFO] Jangan tutup jendela ini selama menggunakan aplikasi!
echo.

:: Open browser automatically
timeout /t 2 /nobreak >nul
start "" "http://localhost:3737/dashboard.html"

:: Run server (blocking)
node server.js

echo.
echo  Server berhenti. Tekan sembarang tombol untuk keluar...
pause >nul
