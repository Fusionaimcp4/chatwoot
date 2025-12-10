#!/bin/bash
# Test script for lean Docker build
# This script helps you test the lean build locally

set -e

echo "=== Testing Lean Docker Build ==="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Make sure you have a .env file with required variables"
    echo ""
fi

echo "1. Pulling latest image from Docker Hub..."
docker pull mcp4ai/voxedesk-selfhost:latest

echo ""
echo "2. Starting services with docker-compose..."
docker compose -f docker-compose.production.yaml up -d

echo ""
echo "3. Waiting for services to be ready..."
sleep 10

echo ""
echo "4. Checking service status..."
docker compose -f docker-compose.production.yaml ps

echo ""
echo "5. Checking Rails logs..."
echo "   (Press Ctrl+C to stop viewing logs)"
docker compose -f docker-compose.production.yaml logs -f rails

