# Voxe Production Server Deployment Guide

This guide covers deploying your rebranded Voxe (Chatwoot) application to a production server.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Docker Production Deployment](#docker-production-deployment)
4. [Linux VM Deployment](#linux-vm-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [SSL/HTTPS Setup](#sslhttps-setup)
7. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04/22.04/24.04 LTS (recommended) or any Linux with Docker
- **RAM**: Minimum 2GB (4GB+ recommended)
- **CPU**: 2+ cores recommended
- **Storage**: 20GB+ free space
- **Network**: Public IP address, ports 80/443 open

### Required Software
- Docker & Docker Compose (for Docker deployment)
- OR Ruby 3.4.4, Node.js 23.x, PostgreSQL 16, Redis (for VM deployment)
- Nginx (as reverse proxy)
- Domain name pointing to your server IP

---

## Deployment Options

### Option 1: Docker Production Deployment (Recommended)
✅ **Easiest and most portable**
- Uses Docker containers
- Easy to maintain and update
- Isolated environment

### Option 2: Linux VM Deployment
✅ **Traditional server setup**
- Direct installation on Ubuntu
- More control over the environment
- Uses systemd for service management

---

## Docker Production Deployment

### Step 1: Prepare Your Server

```bash
# SSH into your server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone/Upload Your Code

```bash
# Option A: If using Git
git clone <your-repo-url> voxe
cd voxe

# Option B: Upload files via SCP/SFTP
# Upload your entire project directory to /opt/voxe or similar
```

### Step 3: Create Production .env File

Create a `.env` file in the project root:

```bash
# Production Environment
RAILS_ENV=production
NODE_ENV=production
INSTALLATION_ENV=docker

# Generate a secure secret key
# Run: docker compose run --rm rails bundle exec rails secret
SECRET_KEY_BASE=<your-generated-secret-key>

# Frontend URL (your domain)
FRONTEND_URL=https://voxe.mcp4.ai

# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=chatwoot_production
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=<strong-password-here>

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=<strong-redis-password>

# Action Cable
ACTION_CABLE_URL=wss://voxe.mcp4.ai/cable

# Email Configuration (SMTP)
SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_DOMAIN=voxe.mcp4.ai
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
MAILER_SENDER_EMAIL=noreply@voxe.mcp4.ai

# Storage (use S3 for production)
# ACTIVE_STORAGE_SERVICE=s3
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=
# AWS_BUCKET=

# Optional: Error Tracking
# SENTRY_DSN=your-sentry-dsn

# Optional: Analytics
# POSTHOG_API_KEY=

# Force SSL
FORCE_SSL=true

# Disable account signup (if needed)
ENABLE_ACCOUNT_SIGNUP=false
```

### Step 4: Update docker-compose.production.yaml

Update the production docker-compose file:

```yaml
# Update postgres password
environment:
  - POSTGRES_PASSWORD=<your-strong-password>

# Update entrypoint paths (if needed)
entrypoint: ["/app/docker/entrypoints/rails.sh"]
```

### Step 5: Build and Start Services

```bash
# Build production images
docker compose -f docker-compose.production.yaml build

# Start services
docker compose -f docker-compose.production.yaml up -d

# Check status
docker compose -f docker-compose.production.yaml ps

# View logs
docker compose -f docker-compose.production.yaml logs -f
```

### Step 6: Setup Database

```bash
# Run migrations and seed data
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:chatwoot_prepare

# Create super admin (if needed)
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console
# In console:
# user = User.create!(email: 'admin@voxe.mcp4.ai', password: 'secure-password', name: 'Admin')
# account = Account.create!(name: 'Voxe')
# AccountUser.create!(account: account, user: user, role: :administrator)
```

### Step 7: Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/voxe`:

```nginx
upstream voxe {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name voxe.mcp4.ai www.voxe.mcp4.ai;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name voxe.mcp4.ai www.voxe.mcp4.ai;

    ssl_certificate /etc/letsencrypt/live/voxe.mcp4.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voxe.mcp4.ai/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 20M;

    location / {
        proxy_pass http://voxe;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /cable {
        proxy_pass http://voxe;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/voxe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Linux VM Deployment

### Step 1: Run Installation Script

```bash
# Download and run the setup script
curl -o setup.sh https://raw.githubusercontent.com/chatwoot/chatwoot/develop/deployment/setup_20.04.sh
chmod +x setup.sh
sudo ./setup.sh --install
```

### Step 2: Configure Environment

```bash
# Edit environment file
sudo nano /home/chatwoot/chatwoot/.env

# Set required variables:
# - SECRET_KEY_BASE
# - FRONTEND_URL
# - Database credentials
# - SMTP settings
# - etc.
```

### Step 3: Setup Database

```bash
sudo -i -u chatwoot
cd chatwoot
RAILS_ENV=production bundle exec rails db:chatwoot_prepare
exit
```

### Step 4: Start Services

```bash
sudo systemctl start chatwoot.target
sudo systemctl enable chatwoot.target

# Check status
sudo systemctl status chatwoot.target
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d voxe.mcp4.ai -d www.voxe.mcp4.ai

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

### Using Custom SSL Certificate

1. Upload your certificate files to `/etc/ssl/certs/`
2. Update Nginx configuration with certificate paths
3. Reload Nginx

---

## Post-Deployment Configuration

### 1. Update Branding Configuration

Access Super Admin panel:
- URL: `https://voxe.mcp4.ai/super_admin`
- Login with your admin credentials
- Navigate to Installation Configs
- Verify all Voxe branding settings are correct

### 2. Configure Email

1. Go to Settings → Email
2. Configure SMTP settings
3. Test email sending

### 3. Setup Inboxes

1. Create your first inbox
2. Configure channels (Website, Email, etc.)
3. Test widget integration

### 4. Configure Storage

For production, use cloud storage (S3, Azure, Google Cloud):

```bash
# Update .env with S3 credentials
ACTIVE_STORAGE_SERVICE=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_BUCKET=voxe-storage
```

### 5. Setup Backups

```bash
# Create backup script
cat > /opt/voxe/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/voxe/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker compose -f docker-compose.production.yaml exec -T postgres pg_dump -U postgres chatwoot_production > $BACKUP_DIR/db_$DATE.sql

# Backup storage (if using local storage)
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz /app/storage

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /opt/voxe/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/voxe/backup.sh") | crontab -
```

---

## Maintenance & Updates

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker compose -f docker-compose.production.yaml build

# Run migrations
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:migrate

# Restart services
docker compose -f docker-compose.production.yaml restart
```

### Monitor Logs

```bash
# View all logs
docker compose -f docker-compose.production.yaml logs -f

# View specific service
docker compose -f docker-compose.production.yaml logs -f rails

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Checks

```bash
# Check container status
docker compose -f docker-compose.production.yaml ps

# Check disk space
df -h

# Check memory usage
free -h

# Check application health
curl https://voxe.mcp4.ai/api/public/health
```

---

## Security Checklist

- [ ] Strong passwords for database and Redis
- [ ] SSL/HTTPS enabled
- [ ] Firewall configured (only 80, 443 open)
- [ ] Regular security updates
- [ ] Backups configured
- [ ] Environment variables secured
- [ ] SMTP authentication configured
- [ ] Account signup disabled (if needed)
- [ ] Super admin access secured

---

## Troubleshooting

### Application Not Starting
```bash
# Check logs
docker compose -f docker-compose.production.yaml logs rails

# Check database connection
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:migrate:status
```

### Database Issues
```bash
# Check PostgreSQL logs
docker compose -f docker-compose.production.yaml logs postgres

# Connect to database
docker compose -f docker-compose.production.yaml exec postgres psql -U postgres -d chatwoot_production
```

### Performance Issues
- Check resource usage: `docker stats`
- Review Sidekiq queue: Access `/sidekiq` endpoint
- Check database indexes
- Review Nginx access logs

---

## Support & Resources

- Chatwoot Documentation: https://www.chatwoot.com/docs
- Community Forum: https://www.chatwoot.com/community
- GitHub Issues: https://github.com/chatwoot/chatwoot/issues

---

## Quick Reference Commands

```bash
# Start services
docker compose -f docker-compose.production.yaml up -d

# Stop services
docker compose -f docker-compose.production.yaml down

# Restart services
docker compose -f docker-compose.production.yaml restart

# View logs
docker compose -f docker-compose.production.yaml logs -f

# Rails console
docker compose -f docker-compose.production.yaml exec rails bundle exec rails console

# Run migrations
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:migrate

# Backup database
docker compose -f docker-compose.production.yaml exec postgres pg_dump -U postgres chatwoot_production > backup.sql
```

