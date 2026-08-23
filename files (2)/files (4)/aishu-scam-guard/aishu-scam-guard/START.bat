@echo off
title Ishu AI - Scam Guard Launcher
color 0B

echo.
echo  ╔═══════════════════════════════════════════╗
echo  ║      ISHU AI - SCAM GUARD LAUNCHER        ║
echo  ║         Digital Protection System         ║
echo  ╚═══════════════════════════════════════════╝
echo.

echo  [1] Checking Ollama...
ollama list >nul 2>&1
if %errorlevel% neq 0 (
    echo  Starting Ollama...
    start "Ollama" cmd /k "ollama serve"
    timeout /t 3 /nobreak >nul
) else (
    echo  Ollama already running ^✓
)
echo.

echo  [2] Starting Backend ^(FastAPI^)...
echo.

cd /d "%~dp0backend"
start "Ishu AI Backend" cmd /k "python -m pip install -r requirements.txt && python -m uvicorn main:app --reload --port 8000"

timeout /t 5 /nobreak >nul

echo  [3] Opening Frontend in Browser...
echo.

start "" "%~dp0frontend\index.html"

echo  ╔═══════════════════════════════════════════╗
echo  ║  ✅  Ishu AI is now running!              ║
echo  ║                                           ║
echo  ║  Backend :  http://localhost:8000         ║
echo  ║  Frontend:  Opened in your browser        ║
echo  ║  Ollama  :  http://localhost:11434        ║
echo  ║                                           ║
echo  ║  If chat does not work, wait 10 seconds   ║
echo  ║  for backend to start, then press F5.     ║
echo  ╚═══════════════════════════════════════════╝
echo.
pause
