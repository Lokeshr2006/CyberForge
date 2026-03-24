@echo off
REM CyberForge Setup Script for Windows
REM Quick setup for local development

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo CyberForge Setup Script (Windows)
echo ============================================================
echo.

REM Check Docker
echo Checking prerequisites...
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)
echo - Docker installed

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker Compose is not installed. Please install Docker Desktop first.
    exit /b 1
)
echo - Docker Compose installed

echo.
echo Setting up environment...

if not exist .env (
    copy .env.example .env
    echo - Created .env from .env.example
    echo Please edit .env with your configuration
) else (
    echo - .env already exists
)

REM Create SSL certificates directory
if not exist infra\ssl (
    mkdir infra\ssl
    echo - Created infra\ssl directory
)

echo.
echo Starting Docker services...
docker-compose up -d
echo - Services started

echo.
echo Waiting for services to be ready...
timeout /t 5 /nobreak

REM Check if database is ready
echo Waiting for database...
:db_check
docker-compose exec -T db pg_isready -U cyberforge >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak
    goto db_check
)
echo - Database is ready

REM Check if API is ready
echo Waiting for API...
:api_check
docker-compose exec -T api curl -f http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak
    goto api_check
)
echo - API is ready

echo.
echo Running database migrations...
docker-compose exec -T api npx prisma migrate deploy
echo - Migrations completed

echo.
echo Seeding database with demo data...
docker-compose exec -T api npm run seed
echo - Database seeded

echo.
echo ============================================================
echo Setup completed successfully!
echo ============================================================
echo.
echo Access the application:
echo   Web UI: http://localhost:3001
echo   API: http://localhost:3000
echo   API Docs: http://localhost:3000/api
echo.
echo Documentation:
echo   README: .\README.md
echo   Quick Reference: .\QUICK_REFERENCE.md
echo.
echo To view logs:
echo   docker-compose logs -f api
echo   docker-compose logs -f web
echo.
echo To stop services:
echo   docker-compose down
echo.

REM Open browser if possible
timeout /t 2 /nobreak
start http://localhost:3001

endlocal
