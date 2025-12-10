# Testing the Lean Docker Build Locally

## Quick Start

### Option 1: Using the Test Script (Linux/Mac)

```bash
chmod +x test-lean-build.sh
./test-lean-build.sh
```

### Option 2: Manual Steps

#### 1. Pull the Image
```bash
docker pull mcp4ai/voxedesk-selfhost:latest
```

#### 2. Start Services
```bash
docker compose -f docker-compose.production.yaml up -d
```

#### 3. Check Status
```bash
docker compose -f docker-compose.production.yaml ps
```

#### 4. View Logs
```bash
# Rails logs
docker compose -f docker-compose.production.yaml logs -f rails

# Sidekiq logs
docker compose -f docker-compose.production.yaml logs -f sidekiq

# All logs
docker compose -f docker-compose.production.yaml logs -f
```

#### 5. Access the Application
- Open browser: http://localhost:8083
- The app should be running on port 8083

## Verification Checklist

### ✅ Service Health
```bash
# Check all services are running
docker compose -f docker-compose.production.yaml ps

# Should show:
# - rails (running)
# - sidekiq (running)
# - postgres (running)
# - redis (running)
```

### ✅ Database Connection
```bash
# Check database connection
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:migrate:status
```

### ✅ Branding Configuration
```bash
# Check branding values
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console

# In console:
InstallationConfig.where(name: ['INSTALLATION_NAME', 'BRAND_NAME']).pluck(:name, :value)
# Should show your VoxeDesk branding values
```

### ✅ Scheduled Jobs
```bash
# Check Sidekiq scheduled jobs
docker compose -f docker-compose.production.yaml exec sidekiq bundle exec rails console

# In console:
Sidekiq::Cron::Job.all.map { |j| [j.name, j.cron] }
# Should show only the 7 required jobs (no version check job)
```

### ✅ No Enterprise Code
```bash
# Verify enterprise folder is not in the image
docker compose -f docker-compose.production.yaml exec rails ls -la /app/enterprise
# Should show: "No such file or directory"
```

### ✅ No .md Files
```bash
# Verify .md files are excluded
docker compose -f docker-compose.production.yaml exec rails find /app -name "*.md" | head -5
# Should return nothing or very few results
```

## Common Issues

### Issue: Database not ready
**Solution**: Wait a bit longer, then check postgres logs:
```bash
docker compose -f docker-compose.production.yaml logs postgres
```

### Issue: Port already in use
**Solution**: Change the port in docker-compose.production.yaml:
```yaml
ports:
  - "8084:3000"  # Change 8083 to another port
```

### Issue: Environment variables missing
**Solution**: Make sure your `.env` file has all required variables:
- `POSTGRES_DATABASE`
- `POSTGRES_USERNAME`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `SECRET_KEY_BASE`
- `FRONTEND_URL`
- etc.

## Stopping Services

```bash
# Stop all services
docker compose -f docker-compose.production.yaml down

# Stop and remove volumes (⚠️ deletes data)
docker compose -f docker-compose.production.yaml down -v
```

## Restarting Services

```bash
# Restart all services
docker compose -f docker-compose.production.yaml restart

# Restart specific service
docker compose -f docker-compose.production.yaml restart rails
```

## Updating to Latest Image

```bash
# Pull latest image
docker pull mcp4ai/voxedesk-selfhost:latest

# Restart services to use new image
docker compose -f docker-compose.production.yaml up -d --force-recreate
```

