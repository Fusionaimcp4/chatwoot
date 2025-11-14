#!/bin/bash

# Voxe Production Deployment Script
# This script helps deploy Voxe to a production server

set -e

echo "=========================================="
echo "Voxe Production Deployment Script"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root or with sudo"
    exit 1
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose is not installed. Installing..."
    apt-get update
    apt-get install -y docker-compose-plugin
fi

# Check for .env file
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please create a .env file with production configuration."
    exit 1
fi

# Check for SECRET_KEY_BASE
if ! grep -q "SECRET_KEY_BASE=" .env || grep -q "SECRET_KEY_BASE=$" .env || grep -q "SECRET_KEY_BASE=temp" .env; then
    echo "WARNING: SECRET_KEY_BASE not set or using default value"
    echo "Generating SECRET_KEY_BASE..."
    SECRET_KEY=$(docker compose run --rm rails bundle exec rails secret 2>/dev/null | tr -d '\r\n' || echo "")
    if [ -n "$SECRET_KEY" ]; then
        sed -i "s/SECRET_KEY_BASE=.*/SECRET_KEY_BASE=$SECRET_KEY/" .env
        echo "SECRET_KEY_BASE generated and updated"
    else
        echo "ERROR: Could not generate SECRET_KEY_BASE"
        exit 1
    fi
fi

echo ""
echo "Step 1: Building production images..."
docker compose -f docker-compose.production.yaml build

echo ""
echo "Step 2: Starting services..."
docker compose -f docker-compose.production.yaml up -d

echo ""
echo "Waiting for services to initialize..."
sleep 15

echo ""
echo "Step 3: Setting up database..."
docker compose -f docker-compose.production.yaml exec -T rails bundle exec rails db:chatwoot_prepare || {
    echo "WARNING: Database setup had issues. Check logs with: docker compose -f docker-compose.production.yaml logs rails"
}

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Services Status:"
docker compose -f docker-compose.production.yaml ps
echo ""
echo "Next Steps:"
echo "1. Configure Nginx reverse proxy"
echo "2. Setup SSL certificate (Let's Encrypt)"
echo "3. Access Super Admin: https://your-domain/super_admin"
echo "4. Configure your inboxes and channels"
echo ""
echo "View logs: docker compose -f docker-compose.production.yaml logs -f"
echo ""

