#!/bin/bash
# Build script for lean Docker image
# This script creates the lean-docker branch and builds the Docker image

set -e

echo "=== Creating lean-docker branch ==="
git checkout -b lean-docker 2>/dev/null || git checkout lean-docker

echo "=== Staging changes ==="
git add .dockerignore
git add config/application.rb
git add Rakefile
git add config/schedule.yml
git add docker/Dockerfile
git add lib/chatwoot_app.rb

echo "=== Committing changes ==="
git commit -m "Create lean Docker build excluding enterprise code and .md files" || echo "No changes to commit"

echo "=== Building Docker image ==="
docker build -f docker/Dockerfile -t mcp4ai/voxedesk-selfhost:latest .

echo "=== Build complete! ==="
echo "To push to Docker Hub, run:"
echo "  docker push mcp4ai/voxedesk-selfhost:latest"

