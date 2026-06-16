# Kreativa Platform — Development Setup Script
# Run this from the project root: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "[*] Kreativa Platform Setup" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# --- Copy .env ---
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] Created .env from .env.example" -ForegroundColor Green
    Write-Host "[!] Edit .env with your database credentials!" -ForegroundColor Yellow
}
else {
    Write-Host "[OK] .env already exists" -ForegroundColor Green
}

# --- Python Service Setup ---
Write-Host "`n[*] Setting up Python service..." -ForegroundColor Cyan

Push-Location python-service

if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "  [OK] Created Python virtual environment" -ForegroundColor Green
}

# Activate venv and install deps
& .\venv\Scripts\Activate.ps1
pip install -r requirements.txt --quiet
Write-Host "  [OK] Installed Python dependencies" -ForegroundColor Green

# Copy .env to python-service
if (-not (Test-Path ".env")) {
    Copy-Item "..\.env" ".env"
}

# Run Django migrations
python manage.py migrate --settings=config.settings.development
Write-Host "  [OK] Django migrations applied" -ForegroundColor Green

Pop-Location

# --- Go Services Setup ---
Write-Host "`n[*] Setting up Go services..." -ForegroundColor Cyan

Push-Location go-services

# Tidy all Go modules
$services = @("shared", "booking-service", "chat-service", "stream-service")
foreach ($svc in $services) {
    Push-Location $svc
    go mod tidy 2>$null
    Write-Host "  [OK] Go mod tidy: $svc" -ForegroundColor Green
    Pop-Location
}

Pop-Location

# --- Run Go SQL Migrations ---
Write-Host ''
Write-Host '[*] Running Go service SQL migrations...' -ForegroundColor Cyan
Write-Host '  [!] Run this manually after Django migrations:' -ForegroundColor Yellow
Write-Host '  psql -d kreativa_db -f go-services/booking-service/migrations/001_create_tables.sql' -ForegroundColor White

Write-Host ''
Write-Host '[*] Setup complete!' -ForegroundColor Green
Write-Host ''
Write-Host 'To start the services:' -ForegroundColor Cyan
Write-Host '  1. Python:  cd python-service; .\venv\Scripts\Activate.ps1; python manage.py runserver' -ForegroundColor White
Write-Host '  2. Booking: cd go-services\booking-service; go run main.go' -ForegroundColor White
Write-Host '  3. Chat:    cd go-services\chat-service; go run main.go' -ForegroundColor White
Write-Host '  4. Stream:  cd go-services\stream-service; go run main.go' -ForegroundColor White
