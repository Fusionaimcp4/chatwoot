@echo off
REM Voxe Local Docker Deployment Script (Batch version)
REM Run this script after Docker Desktop is started

echo ========================================
echo Voxe Local Docker Deployment
echo ========================================
echo.

echo Checking Docker status...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

if not exist .env (
    echo [INFO] Creating .env file...
    (
        echo # Rails Configuration
        echo RAILS_ENV=development
        echo NODE_ENV=development
        echo INSTALLATION_ENV=docker
        echo SECRET_KEY_BASE=temp_secret_key_will_be_generated
        echo FRONTEND_URL=http://localhost:3000
        echo.
        echo # Database Configuration
        echo POSTGRES_HOST=postgres
        echo POSTGRES_PORT=5432
        echo POSTGRES_DATABASE=chatwoot_dev
        echo POSTGRES_USERNAME=postgres
        echo POSTGRES_PASSWORD=
        echo.
        echo # Redis Configuration
        echo REDIS_URL=redis://redis:6379
        echo REDIS_PASSWORD=
        echo.
        echo # Action Cable
        echo ACTION_CABLE_URL=ws://localhost:3000/cable
        echo.
        echo # Vite Dev Server
        echo VITE_DEV_SERVER_HOST=0.0.0.0
        echo VITE_DEV_SERVER_PORT=3036
        echo.
        echo # Mail Configuration ^(MailHog^)
        echo SMTP_ADDRESS=mailhog
        echo SMTP_PORT=1025
        echo SMTP_DOMAIN=localhost
        echo SMTP_ENABLE_STARTTLS_AUTO=false
        echo.
        echo # Force SSL ^(false for local^)
        echo FORCE_SSL=false
    ) > .env
    echo [OK] .env file created
) else (
    echo [OK] .env file exists
)

echo.
echo Step 1: Building and starting Docker containers...
echo This may take 10-15 minutes on first run...
echo.

docker-compose up --build -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start containers
    pause
    exit /b 1
)

echo.
echo [OK] Containers started successfully
echo.
echo Waiting for services to be ready...
timeout /t 30 /nobreak >nul

echo.
echo Step 2: Setting up database...
docker-compose exec -T rails bundle exec rails db:chatwoot_prepare

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Access your application:
echo   Main App:     http://localhost:3000
echo   MailHog:      http://localhost:8025
echo.
echo Default Login Credentials:
echo   Email:    john@acme.inc
echo   Password: Password1!
echo.
echo Useful Commands:
echo   View logs:    docker-compose logs -f
echo   Stop:        docker-compose down
echo   Restart:     docker-compose restart
echo.
pause

