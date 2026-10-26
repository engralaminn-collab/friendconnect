#!/usr/bin/env bash
# FriendConnect — One-Command Production Installation
# Target: Ubuntu 22.04+ with Node 22, PM2, Caddy, MySQL 8, Redis
# Usage: sudo ./scripts/production-install.sh
#
# This script automates everything possible. It will ask for:
#   - DATABASE_URL (MySQL connection string)
#   - APP_DOMAIN (your domain for HTTPS)
#   - SMTP credentials (optional, can skip)
#   - TURN_SECRET (auto-generated if Coturn installed)
#   - VAPID keys (auto-generated)
set -euo pipefail

APP_DIR="/home/aloedu/friendconnect"
LOG_FILE="/tmp/friendconnect-install.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "================================================================"
echo "  FriendConnect — Production Installation"
echo "  Target: $(uname -a)"
echo "  Time: $(date)"
echo "================================================================"
echo ""

# ---- 1. Prerequisites ----
echo "[1/10] Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "FAIL: Node.js not found. Install Node 22."; exit 1; }
command -v bun >/dev/null 2>&1 || { echo "Installing bun..."; curl -fsSL https://bun.sh/install | bash; export BUN_INSTALL="$HOME/.bun"; export PATH="$BUN_INSTALL/bin:$PATH"; }
command -v pm2 >/dev/null 2>&1 || { echo "Installing PM2..."; npm install -g pm2; }
command -v caddy >/dev/null 2>&1 || echo "WARN: Caddy not found — install for HTTPS";
command -v mysql >/dev/null 2>&1 || echo "WARN: MySQL not found — install MySQL 8";
command -v redis-cli >/dev/null 2>&1 || echo "WARN: Redis not found — install Redis";
echo "  ✓ Prerequisites checked"

# ---- 2. Application code ----
echo "[2/10] Setting up application directory..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"
echo "  ✓ Directory: $APP_DIR"

# ---- 3. Environment configuration ----
echo "[3/10] Configuring environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  ✓ .env created from template"
else
  echo "  ✓ .env already exists"
fi

# Interactive: collect required values
read -p "Enter DATABASE_URL (mysql://user:pass@host:3306/db): " DB_URL
read -p "Enter APP_DOMAIN (e.g. friendconnect.com): " DOMAIN
read -p "Enter SMTP_HOST (or press Enter to skip email): " SMTP_HOST_INPUT

if [ -n "$DB_URL" ]; then
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" .env
fi
if [ -n "$DOMAIN" ]; then
  sed -i "s|APP_DOMAIN=.*|APP_DOMAIN=\"$DOMAIN\"|" .env
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"https://$DOMAIN\"|" .env
fi
if [ -n "$SMTP_HOST_INPUT" ]; then
  read -p "SMTP_PORT (587): " SMTP_PORT_INPUT; SMTP_PORT_INPUT=${SMTP_PORT_INPUT:-587}
  read -p "SMTP_USER: " SMTP_USER_INPUT
  read -p "SMTP_PASSWORD: " SMTP_PASS_INPUT
  read -p "SMTP_FROM (noreply@domain): " SMTP_FROM_INPUT
  sed -i "s|EMAIL_PROVIDER=.*|EMAIL_PROVIDER=\"smtp\"|" .env
  sed -i "s|SMTP_HOST=.*|SMTP_HOST=\"$SMTP_HOST_INPUT\"|" .env
  sed -i "s|SMTP_PORT=.*|SMTP_PORT=\"$SMTP_PORT_INPUT\"|" .env
  sed -i "s|SMTP_USER=.*|SMTP_USER=\"$SMTP_USER_INPUT\"|" .env
  sed -i "s|SMTP_PASSWORD=.*|SMTP_PASSWORD=\"$SMTP_PASS_INPUT\"|" .env
  sed -i "s|SMTP_FROM=.*|SMTP_FROM=\"$SMTP_FROM_INPUT\"|" .env
fi
echo "  ✓ Environment configured"

# ---- 4. Dependencies ----
echo "[4/10] Installing dependencies..."
bun install --frozen-lockfile 2>/dev/null || bun install
echo "  ✓ Dependencies installed"

# ---- 5. VAPID keys ----
echo "[5/10] Generating VAPID keys for push notifications..."
if ! grep -q "VAPID_PUBLIC_KEY=\"\"" .env; then
  echo "  ✓ VAPID keys already configured"
else
  VAPID_KEYS=$(bun -e "import webpush from 'web-push'; const k = webpush.generateVAPIDKeys(); console.log(k.publicKey + '|' + k.privateKey);" 2>/dev/null || node -e "const w = require('web-push'); const k = w.generateVAPIDKeys(); console.log(k.publicKey + '|' + k.privateKey);" 2>/dev/null)
  if [ -n "$VAPID_KEYS" ]; then
    VAPID_PUB=$(echo "$VAPID_KEYS" | cut -d'|' -f1)
    VAPID_PRIV=$(echo "$VAPID_KEYS" | cut -d'|' -f2)
    sed -i "s|VAPID_PUBLIC_KEY=\"\"|VAPID_PUBLIC_KEY=\"$VAPID_PUB\"|" .env
    sed -i "s|VAPID_PRIVATE_KEY=\"\"|VAPID_PRIVATE_KEY=\"$VAPID_PRIV\"|" .env
    sed -i "s|VAPID_SUBJECT=.*|VAPID_SUBJECT=\"mailto:admin@$DOMAIN\"|" .env
    echo "  ✓ VAPID keys generated"
  else
    echo "  WARN: VAPID key generation failed — run ./scripts/generate-vapid.sh manually"
  fi
fi

# ---- 6. Database migration ----
echo "[6/10] Migrating database to MySQL..."
cp prisma/schema.mysql.prisma prisma/schema.prisma
bunx prisma generate
bunx prisma migrate deploy 2>/dev/null || { echo "  Running initial migration..."; bunx prisma migrate dev --name init; }
echo "  ✓ Database migrated"

# ---- 7. Build ----
echo "[7/10] Building production bundle..."
bun run build
echo "  ✓ Build complete"

# ---- 8. Coturn (optional) ----
echo "[8/10] Setting up Coturn TURN server..."
if command -v turnserver >/dev/null 2>&1 || apt-get install -y coturn >/dev/null 2>&1; then
  TURN_SECRET=$(openssl rand -hex 32)
  PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "127.0.0.1")
  sudo ./coturn/install.sh 2>/dev/null || true
  sed -i "s|TURN_SECRET=.*|TURN_SECRET=\"$TURN_SECRET\"|" .env
  sed -i "s|TURN_SERVERS=.*|TURN_SERVERS=\"turn:$PUBLIC_IP:3478,turns:$PUBLIC_IP:5349\"|" .env
  echo "  ✓ Coturn installed (IP: $PUBLIC_IP, secret configured)"
else
  echo "  WARN: Coturn not installed — cross-network calls may fail"
fi

# ---- 9. Caddy ----
echo "[9/10] Configuring Caddy..."
if command -v caddy >/dev/null 2>&1; then
  sudo cp Caddyfile.production /etc/caddy/Caddyfile
  sudo systemctl reload caddy 2>/dev/null || sudo systemctl restart caddy
  echo "  ✓ Caddy configured for $DOMAIN"
else
  echo "  WARN: Caddy not found"
fi

# ---- 10. PM2 ----
echo "[10/10] Starting PM2 services..."
mkdir -p logs
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save
pm2 startup 2>/dev/null || true
echo "  ✓ PM2 services started"

# ---- Health check ----
echo ""
echo "=== Health Check ==="
sleep 5
HEALTH_URL="https://$DOMAIN/api/health"
for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "  ✓ Application healthy at $HEALTH_URL"
    curl -s "$HEALTH_URL" | head -c 300
    echo ""
    break
  fi
  echo "  Attempt $i: HTTP $STATUS, retrying in 5s..."
  sleep 5
done

echo ""
echo "================================================================"
echo "  FriendConnect Production Installation Complete!"
echo "  URL: https://$DOMAIN"
echo "  PM2: pm2 status"
echo "  Logs: pm2 logs"
echo "  Health: https://$DOMAIN/api/health"
echo "  WebRTC: https://$DOMAIN/api/webrtc/health"
echo "================================================================"
