# Server Deployment Fix - Entrypoint Script Error

## Problem
The Rails container is failing with:
```
/app/docker/entrypoints/rails.sh: set: line 3: illegal option -
```

This is caused by Windows line endings (CRLF) in the entrypoint script.

## Solution Options

### Option 1: Use Direct Command (Recommended - No Rebuild Needed)

Update your server's `docker-compose.production.yaml` to use a direct command instead of the entrypoint:

```yaml
rails:
  <<: *base
  depends_on:
    - postgres
    - redis
  ports:
    - "8083:3000"
  environment:
    - NODE_ENV=production
    - RAILS_ENV=production
    - INSTALLATION_ENV=docker
  command: ["sh", "-c", "rm -rf /app/tmp/pids/server.pid && bundle exec rails s -p 3000 -b 0.0.0.0"]
  restart: always
```

**Remove or comment out any `entrypoint:` line in the rails service.**

Then restart:
```bash
docker compose -f docker-compose.production.yaml down
docker compose -f docker-compose.production.yaml up -d
```

### Option 2: Fix Entrypoint Script on Server

If you need to use the entrypoint script, fix the line endings:

```bash
# Enter the container
docker exec -it voxedesk_rails_1 sh

# Fix the script
sed -i 's/\r$//' /app/docker/entrypoints/rails.sh
chmod +x /app/docker/entrypoints/rails.sh
exit

# Restart the container
docker restart voxedesk_rails_1
```

### Option 3: Pull Updated Image (After Rebuild)

The image will be rebuilt with fixed line endings. Pull the latest:

```bash
docker pull mcp4ai/voxedesk-selfhost:latest
docker compose -f docker-compose.production.yaml up -d --force-recreate rails
```

## Quick Fix Command

Run this on your server to fix immediately:

```bash
docker exec voxedesk_rails_1 sed -i 's/\r$//' /app/docker/entrypoints/rails.sh
docker exec voxedesk_rails_1 chmod +x /app/docker/entrypoints/rails.sh
docker restart voxedesk_rails_1
```

Or update docker-compose to use direct command (no entrypoint needed).

