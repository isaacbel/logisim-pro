@echo off
title Logisim Pro — Web / PWA Server
echo ===================================================
echo   Starting Logisim Pro Web Server (Offline-Ready)...
echo   Open your browser at: http://localhost:4173
echo ===================================================
start http://localhost:4173
npx vite preview --port 4173
