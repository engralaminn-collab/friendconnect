#!/usr/bin/env bash
# FriendConnect — Production Deployment Script
# Usage: ./scripts/deploy.sh
# Performs: install → build → migrate → restart → healthcheck
set -euo pipefail

APP_DIR="/home/aloedu/friendconnect"
cd "$APP_DIR" || { echo "ERROR: $APP_DIR not found"; exit 1; }

echo "=== FriendConnect Production Deployment ==="
echo "Time: $(date)"
echo "User: $(whoami)"
echo "Node: $(node -v)"
echo ""

# 1. Check prerequisites
echo "[1/7] Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "FAIL: node not found"; exit 1; }
command -v bun >/dev/null 2>&1 || { echo "FAIL: bun not found"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "FAIL: pm2 not found"; exit 1; }
command -v caddy >/dev/null 2>&1 || { echo "FAIL: caddy not found"; exit 1; }
echo "  ✓ All prerequisites present"

# 2. Load environment
echo "[2/7] Loading environment..."
if [ ! -f .env ]; then
  echo "FAIL: .env file not found. Copy .env.example to .env and configure."
  exit 1
fi
export $(grep -v '^#' .env | xargs)
echo "  ✓ Environment loaded"

# 3. Install dependencies
echo "[3/7] Installing dependencies..."
bun install --frozen-lockfile
echo "  ✓ Dependencies installed"

# 4. Build
echo "[4/7] Building production bundle..."
bun run build
echo "  ✓ Build complete"

# 5. Generate Prisma client + run migrations
echo "[5/7] Running database migrations..."
bun run db:generate
bunx prisma migrate deploy
echo "  ✓ Migrations complete"

# 6. Restart services with PM2
echo "[6/7] Restarting PM2 services..."
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
echo "  ✓ PM2 services restarted"

# 7. Health check
echo "[7/7] Running health check..."
sleep 5
HEALTH_URL="${NEXTAUTH_URL:-http://localhost:3000}/api/health"
for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "  ✓ Health check passed (HTTP 200)"
    echo ""
    echo "=== Deployment successful ==="
    exit 0
  fi
  echo "  Attempt $i: HTTP $STATUS, retrying in 5s..."
  sleep 5
done

echo "FAIL: Health check failed after 5 attempts"
echo "Check PM2 logs: pm2 logs"
exit 1
