# Quick Deployment Guide

This is a quick reference for deploying your rebranded Chatwoot application.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured (chatvoxe.mcp4.ai)
- SSL certificate (Let's Encrypt recommended)

## Quick Start

### 1. Create .env File

Copy the example and update with your values:

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

**Important:** Update these values in `.env`:
- `SECRET_KEY_BASE` - Generate with: `docker compose run --rm rails bundle exec rails secret`
- `POSTGRES_PASSWORD` - Use a strong password
- `REDIS_PASSWORD` - Optional but recommended for production
- `SMTP_PASSWORD` - Your Gmail app password

### 2. Build and Start

```bash
# Build production images
docker compose -f docker-compose.production.yaml build

# Start all services
docker compose -f docker-compose.production.yaml up -d

# Check status
docker compose -f docker-compose.production.yaml ps
```

### 3. Setup Database

```bash
# Run migrations and seed data
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:chatwoot_prepare
```

### 4. Verify

- Check logs: `docker compose -f docker-compose.production.yaml logs -f`
- Access application: https://chatvoxe.mcp4.ai
- Default login: `john@acme.inc` / `Password1!` (if using seed data)

## Common Commands

```bash
# View logs
docker compose -f docker-compose.production.yaml logs -f

# Restart services
docker compose -f docker-compose.production.yaml restart

# Stop services
docker compose -f docker-compose.production.yaml down

# Update application
git pull
docker compose -f docker-compose.production.yaml build
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:migrate
docker compose -f docker-compose.production.yaml restart

# Rails console
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console

# Backup database
docker compose -f docker-compose.production.yaml exec postgres pg_dump -U chatvoxeuser chatvoxedb > backup_$(date +%Y%m%d).sql
```

## Environment Variables Reference

All configuration is done via the `.env` file. Key variables:

- **Database**: `POSTGRES_*` variables
- **Redis**: `REDIS_URL`, `REDIS_PASSWORD`
- **Email**: `SMTP_*` variables
- **App URLs**: `FRONTEND_URL`, `MAILER_DEFAULT_URL_HOST`
- **Security**: `SECRET_KEY_BASE`, `FORCE_SSL`

See `.env.example` for all available options.

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose -f docker-compose.production.yaml logs

# Check if ports are in use
netstat -tulpn | grep -E ':(3000|5432|6379)'
```

### Database connection errors
```bash
# Verify PostgreSQL is running
docker compose -f docker-compose.production.yaml ps postgres

# Check database logs
docker compose -f docker-compose.production.yaml logs postgres
```

### Application errors
```bash
# Check Rails logs
docker compose -f docker-compose.production.yaml logs rails

# Check Sidekiq logs
docker compose -f docker-compose.production.yaml logs sidekiq
```

## Full Documentation

- **Migration Guide**: See `MIGRATION_GUIDE.md` for migrating from existing deployment
- **Production Deployment**: See `DEPLOYMENT_GUIDE.md` for detailed production setup
- **Docker Deployment**: See `DOCKER_DEPLOYMENT.md` for local development

