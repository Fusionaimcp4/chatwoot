#!/bin/sh

rm -rf /app/tmp/pids/server.pid
rm -rf /app/tmp/cache/*

pnpm store prune || true
pnpm install

echo "Ready to run Vite development server."

exec "$@"
