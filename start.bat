@echo off
echo ==========================================
echo   EpiNexus: Starting Development Servers
echo ==========================================

:: Start Backend
echo Starting Backend...
start "EpiNexus Backend" cmd /k "cd backend && .\venv\Scripts\activate && python run.py"

:: Start Frontend
echo Starting Frontend...
start "EpiNexus Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
