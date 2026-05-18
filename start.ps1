# EpiNexus: Starting Development Servers (PowerShell)
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   EpiNexus: Starting Development Servers" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Start Backend in a new window
Write-Host "Starting Backend..." -ForegroundColor Yellow
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd backend; ..\.venv\Scripts\Activate.ps1; python run.py"

# Start Frontend in a new window
Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "Both servers are starting in separate windows." -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Gray
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit this launcher window..."
