# start_debug.ps1
# Script to run all Javahade services in Debug Mode with separate windows

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Starting Javahade Platform (DEBUG)    " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "Memulai Backend Django..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd e:\java\venv\Scripts\Activate.ps1;" 


$scriptPath = $MyInvocation.MyCommand.Path
$rootDir = Split-Path $scriptPath




# 2. Start Django Backend
Write-Host "[*] Starting Python Django Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='Django Backend'; cd '$rootDir\python-service'; ..\venv\Scripts\Activate.ps1; python manage.py runserver" -WindowStyle Normal

# 3. Start Celery Worker
Write-Host "[*] Starting Celery Worker (Debug)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='Celery Worker'; cd '$rootDir\python-service'; ..\venv\Scripts\Activate.ps1; celery -A config worker -l debug --pool=solo" -WindowStyle Normal

# 4. Start Go Booking Service
Write-Host "[*] Starting Go Booking Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='Booking Service'; cd '$rootDir\go-services\booking-service'; go run main.go" -WindowStyle Normal

# 5. Start Go Chat Service
Write-Host "[*] Starting Go Chat Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='Chat Service'; cd '$rootDir\go-services\chat-service'; go run main.go" -WindowStyle Normal

# 6. Start Go Stream Service
Write-Host "[*] Starting Go Stream Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='Stream Service'; cd '$rootDir\go-services\stream-service'; go run main.go" -WindowStyle Normal

Write-Host "`n[+] All services have been launched in separate windows!" -ForegroundColor Green
Write-Host "[+] Press Ctrl+C in each window to stop them individually." -ForegroundColor Gray
