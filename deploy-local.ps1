# Voxe Local Docker Deployment Script
# Run this script after Docker Desktop is started

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Voxe Local Docker Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "[ERROR] .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
# Rails Configuration
RAILS_ENV=development
NODE_ENV=development
INSTALLATION_ENV=docker
SECRET_KEY_BASE=temp_secret_key_will_be_generated
FRONTEND_URL=http://localhost:3000

# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=chatwoot_dev
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=

# Action Cable
ACTION_CABLE_URL=ws://localhost:3000/cable

# Vite Dev Server
VITE_DEV_SERVER_HOST=0.0.0.0
VITE_DEV_SERVER_PORT=3036

# Mail Configuration (MailHog)
SMTP_ADDRESS=mailhog
SMTP_PORT=1025
SMTP_DOMAIN=localhost
SMTP_ENABLE_STARTTLS_AUTO=false

# Force SSL (false for local)
FORCE_SSL=false
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host "[OK] .env file created" -ForegroundColor Green
} else {
    Write-Host "[OK] .env file exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 1: Building and starting Docker containers..." -ForegroundColor Yellow
Write-Host "This may take 10-15 minutes on first run..." -ForegroundColor Yellow
Write-Host ""

# Build and start containers
docker-compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start containers" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Containers started successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "Step 2: Generating SECRET_KEY_BASE..." -ForegroundColor Yellow
$secretKey = docker-compose exec -T rails bundle exec rails secret 2>$null
if ($secretKey) {
    $secretKey = $secretKey.Trim()
    Write-Host "Generated SECRET_KEY_BASE: $($secretKey.Substring(0, [Math]::Min(20, $secretKey.Length)))..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Updating .env file with generated secret..." -ForegroundColor Yellow
    (Get-Content .env) -replace 'SECRET_KEY_BASE=.*', "SECRET_KEY_BASE=$secretKey" | Set-Content .env
    Write-Host "[OK] SECRET_KEY_BASE updated" -ForegroundColor Green
    Write-Host ""
    Write-Host "Restarting Rails container..." -ForegroundColor Yellow
    docker-compose restart rails
} else {
    Write-Host "[WARNING] Could not generate SECRET_KEY_BASE automatically" -ForegroundColor Yellow
    Write-Host "You can generate it manually later with:" -ForegroundColor Yellow
    Write-Host "  docker-compose exec rails bundle exec rails secret" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Step 3: Setting up database..." -ForegroundColor Yellow
docker-compose exec -T rails bundle exec rails db:chatwoot_prepare

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Database setup had issues, but continuing..." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Database setup complete" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your application:" -ForegroundColor Yellow
Write-Host "  Main App:     http://localhost:3000" -ForegroundColor Cyan
Write-Host "  MailHog:      http://localhost:8025" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Login Credentials:" -ForegroundColor Yellow
Write-Host "  Email:    john@acme.inc" -ForegroundColor Cyan
Write-Host "  Password: Password1!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  View logs:    docker-compose logs -f" -ForegroundColor Cyan
Write-Host "  Stop:         docker-compose down" -ForegroundColor Cyan
Write-Host "  Restart:      docker-compose restart" -ForegroundColor Cyan
Write-Host "  Rails console: docker-compose exec rails bundle exec rails console" -ForegroundColor Cyan
Write-Host ""

