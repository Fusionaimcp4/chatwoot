# Quick Production Deployment Steps

## Overview
This is a quick reference for deploying your rebranded Voxe application to a production server.

## Prerequisites Checklist
- [ ] Ubuntu 20.04+ server with public IP
- [ ] Domain name (voxe.mcp4.ai) pointing to server IP
- [ ] SSH access to server
- [ ] At least 2GB RAM, 20GB storage

---

## Step-by-Step Deployment

### 1. Server Setup (5 minutes)

```bash
# SSH into your server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### 2. Upload Your Code (10 minutes)

**Option A: Using Git**
```bash
cd /opt
sudo git clone <your-repo-url> voxe
sudo chown -R $USER:$USER voxe
cd voxe
```

**Option B: Using SCP/SFTP**
```bash
# From your local machine
scp -r chatwoot user@server-ip:/opt/voxe

# On server
cd /opt/voxe
```

### 3. Create Production .env File (10 minutes)

```bash
cd /opt/voxe
nano .env
```

**Minimum required .env configuration:**
```env
RAILS_ENV=production
NODE_ENV=production
INSTALLATION_ENV=docker
SECRET_KEY_BASE=<generate-with-rails-secret>
FRONTEND_URL=https://voxe.mcp4.ai

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=chatwoot_production
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=<strong-password>

REDIS_URL=redis://redis:6379
REDIS_PASSWORD=<strong-password>

SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_DOMAIN=voxe.mcp4.ai
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
MAILER_SENDER_EMAIL=noreply@voxe.mcp4.ai

FORCE_SSL=true
ENABLE_ACCOUNT_SIGNUP=false
```

**Generate SECRET_KEY_BASE:**
```bash
docker compose run --rm rails bundle exec rails secret
# Copy the output and paste into .env file
```

### 4. Deploy Application (15-30 minutes)

```bash
cd /opt/voxe

# Make deployment script executable
chmod +x deploy-production.sh

# Run deployment
./deploy-production.sh

# OR manually:
docker compose -f docker-compose.production.yaml build
docker compose -f docker-compose.production.yaml up -d
docker compose -f docker-compose.production.yaml exec rails bundle exec rails db:chatwoot_prepare
```

### 5. Setup Nginx Reverse Proxy (10 minutes)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/voxe
```

**Paste this configuration:**
```nginx
upstream voxe {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name voxe.mcp4.ai www.voxe.mcp4.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name voxe.mcp4.ai www.voxe.mcp4.ai;

    ssl_certificate /etc/letsencrypt/live/voxe.mcp4.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voxe.mcp4.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/voxe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL Certificate (5 minutes)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d voxe.mcp4.ai -d www.voxe.mcp4.ai

# Test auto-renewal
sudo certbot renew --dry-run
```

### 7. Verify Deployment (5 minutes)

```bash
# Check services
docker compose -f docker-compose.production.yaml ps

# Check logs
docker compose -f docker-compose.production.yaml logs --tail=50

# Test application
curl https://voxe.mcp4.ai/api/public/health
```

### 8. Post-Deployment Configuration

1. **Access Super Admin:**
   - URL: `https://voxe.mcp4.ai/super_admin`
   - Create admin account or use default: `john@acme.inc` / `Password1!`

2. **Verify Branding:**
   - Go to Installation Configs
   - Verify all Voxe branding is correct

3. **Configure Inboxes:**
   - Create your first inbox
   - Setup website widget
   - Configure email channels

---

## Important Production Considerations

### Security
- ✅ Use strong passwords for database and Redis
- ✅ Enable SSL/HTTPS
- ✅ Configure firewall (only ports 80, 443 open)
- ✅ Disable account signup if not needed
- ✅ Regular security updates

### Storage
For production, use cloud storage instead of local:
- AWS S3
- Azure Blob Storage
- Google Cloud Storage

Update `.env`:
```env
ACTIVE_STORAGE_SERVICE=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_BUCKET=voxe-storage
```

### Backups
Setup automated backups:
```bash
# Create backup script
cat > /opt/voxe/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/voxe/backups"
mkdir -p $BACKUP_DIR

docker compose -f docker-compose.production.yaml exec -T postgres \
  pg_dump -U postgres chatwoot_production > $BACKUP_DIR/db_$DATE.sql

find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /opt/voxe/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/voxe/backup.sh") | crontab -
```

### Monitoring
- Monitor logs: `docker compose -f docker-compose.production.yaml logs -f`
- Check resource usage: `docker stats`
- Monitor disk space: `df -h`

---

## Troubleshooting

### Application not accessible
```bash
# Check if containers are running
docker compose -f docker-compose.production.yaml ps

# Check Rails logs
docker compose -f docker-compose.production.yaml logs rails

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Database connection issues
```bash
# Check PostgreSQL
docker compose -f docker-compose.production.yaml logs postgres

# Test connection
docker compose -f docker-compose.production.yaml exec postgres \
  psql -U postgres -d chatwoot_production -c "SELECT 1;"
```

### SSL certificate issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate expiry
sudo certbot certificates
```

---

## Quick Commands Reference

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
docker compose -f docker-compose.production.yaml exec postgres \
  pg_dump -U postgres chatwoot_production > backup.sql
```

---

## Estimated Total Time
- **Total deployment time: 60-90 minutes**
- Server setup: 5 min
- Code upload: 10 min
- Configuration: 15 min
- Deployment: 20-30 min
- Nginx & SSL: 15 min
- Post-deployment: 10 min

---

For detailed information, see `DEPLOYMENT_GUIDE.md`

