# Voxe Local Docker Deployment Guide

## Prerequisites
- Docker Desktop installed and running
- Docker Compose v2.29.1+ (already installed ✓)

## Step 1: Create .env File

Create a `.env` file in the project root with the following content:

```env
# Rails Configuration
RAILS_ENV=development
NODE_ENV=development
INSTALLATION_ENV=docker
SECRET_KEY_BASE=CHANGE_ME_GENERATE_WITH_RAILS_SECRET
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

# Action Cable (WebSocket)
ACTION_CABLE_URL=ws://localhost:3000/cable

# Vite Dev Server
VITE_DEV_SERVER_HOST=0.0.0.0
VITE_DEV_SERVER_PORT=3036

# Mail Configuration (MailHog for local development)
SMTP_ADDRESS=mailhog
SMTP_PORT=1025
SMTP_DOMAIN=localhost
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_AUTHENTICATION=
SMTP_ENABLE_STARTTLS_AUTO=false

# Optional: Force SSL (set to false for local development)
FORCE_SSL=false
```

**Important:** Replace `SECRET_KEY_BASE=CHANGE_ME_GENERATE_WITH_RAILS_SECRET` with a generated secret key. You can generate it after starting the containers.

## Step 2: Start Docker Containers

```bash
# Build and start all services
docker-compose up --build
```

Or run in detached mode (background):
```bash
docker-compose up -d --build
```

## Step 3: Generate SECRET_KEY_BASE (if needed)

After containers are running, generate the secret key:

```bash
# Enter the Rails container
docker-compose exec rails bundle exec rails secret

# Copy the generated key and update .env file
# Then restart the containers:
docker-compose restart rails
```

## Step 4: Setup Database

Once containers are running, setup the database:

```bash
# Run database migrations and seed data
docker-compose exec rails bundle exec rails db:chatwoot_prepare
```

## Step 5: Access the Application

- **Main Application**: http://localhost:3000
- **MailHog (Email Testing)**: http://localhost:8025
- **Vite Dev Server**: http://localhost:3036

## Default Login Credentials

- **Email**: `john@acme.inc`
- **Password**: `Password1!`

## Useful Docker Commands

```bash
# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f rails
docker-compose logs -f sidekiq
docker-compose logs -f vite

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Restart a specific service
docker-compose restart rails

# Execute commands in container
docker-compose exec rails bundle exec rails console
docker-compose exec rails bundle exec rails db:migrate

# Rebuild containers after code changes
docker-compose up --build
```

## Troubleshooting

### Port Already in Use
If port 3000, 5432, or 6379 is already in use:
- Stop the conflicting service, or
- Modify ports in `docker-compose.yaml`

### Database Connection Issues
- Ensure PostgreSQL container is running: `docker-compose ps`
- Check database logs: `docker-compose logs postgres`

### Build Errors
- Clear Docker cache: `docker-compose build --no-cache`
- Remove old images: `docker system prune -a`

### Permission Issues (Linux/Mac)
- Ensure Docker has proper permissions
- Check file ownership in volumes

## Services Running

The deployment includes:
- **Rails**: Main application server (port 3000)
- **Sidekiq**: Background job processor
- **Vite**: Frontend development server (port 3036)
- **PostgreSQL**: Database with pgvector (port 5432)
- **Redis**: Cache and job queue (port 6379)
- **MailHog**: Email testing tool (ports 1025, 8025)

## Next Steps

1. Access the application at http://localhost:3000
2. Login with default credentials
3. Customize branding via Super Admin panel
4. Configure your inboxes and channels
5. Test email functionality via MailHog

