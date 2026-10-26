#!/usr/bin/env bash
# ============================================================================
# FriendConnect → panel.alolabs.net
# ----------------------------------------------------------------------------
# Deploys this repository to the alo-server-lap box on port 3012 behind Nginx.
# Idempotent: restarts the PM2 app if it exists, starts it if it does not.
#
#   ./scripts/deploy-alo-server.sh                 # deploy what is checked out
#   ./scripts/deploy-alo-server.sh --skip-build    # restart only
#   PORT=3012 DOMAIN=panel.alolabs.net ./scripts/deploy-alo-server.sh
#
# Assumes: Node 24 via nvm (or on PATH), npm, PM2, Nginx, and sudo rights for
# the Nginx step. Nothing here touches the database beyond `prisma migrate deploy`.
# ============================================================================
set -euo pipefail

APP="${APP:-friendconnect}"
DOMAIN="${DOMAIN:-panel.alolabs.net}"
PORT="${PORT:-3012}"
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SKIP_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\n\033[1;38;5;208m▶ %s\033[0m\n' "$*"; }
ok()  { printf '\033[32m✓\033[0m %s\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "node is not on PATH (nvm use 24)"
command -v npm  >/dev/null || die "npm is not on PATH"
command -v pm2  >/dev/null || die "pm2 is not installed (npm i -g pm2)"

say "Deploying $APP → https://$DOMAIN (127.0.0.1:$PORT)"
say "Repository: $ROOT"
node -v
npm -v

cd "$ROOT"

if [ -n "${APP_URL:-}" ]; then
  ok "APP_URL=$APP_URL"
else
  echo "  hint: export APP_URL=https://$DOMAIN so cookies and CORS use the public origin"
fi

say "Dependencies"
if [ -f package-lock.json ]; then npm ci; else npm install; fi
ok "dependencies installed"

if [ -f .env ]; then
  ok ".env present"
else
  echo "  warning: no .env — copy .env.example and fill DATABASE_URL / AUTH_SECRET before going live"
fi

say "Database migrations"
npx prisma migrate deploy 2>/dev/null || echo "  no migrations to apply (or prisma engines unavailable offline)"

if [ "$SKIP_BUILD" -eq 0 ]; then
  say "Build"
  npm run build
  ok "build finished"
fi

say "PM2"
if pm2 describe "$APP" >/dev/null 2>&1; then
  PORT="$PORT" pm2 restart "$APP" --update-env
  ok "restarted $APP"
else
  PORT="$PORT" pm2 start npm --name "$APP" -- start
  ok "started $APP"
fi
pm2 save >/dev/null
ok "process list saved"

say "Nginx"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
if [ -w /etc/nginx/sites-available ]; then
  SUDO=""
else
  SUDO="sudo"
fi

$SUDO tee "$NGINX_CONF" >/dev/null <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 50m;

    # Health checks must not be cached by Cloudflare.
    location = /api/health {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        add_header Cache-Control "no-store";
    }

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGINX

$SUDO ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/$DOMAIN"
$SUDO nginx -t
$SUDO systemctl reload nginx
ok "nginx configured for $DOMAIN"

say "Verification"
sleep 1
if curl -fsS "http://127.0.0.1:$PORT/api/health" >/tmp/fc-health.json 2>/dev/null; then
  ok "health: $(head -c 240 /tmp/fc-health.json)"
else
  echo "  warning: health endpoint did not answer yet — check: pm2 logs $APP --lines 40"
fi

curl -fsS "http://127.0.0.1:$PORT/api/agent/manifest" >/dev/null 2>&1 \
  && ok "Bill Agent manifest reachable" \
  || echo "  warning: /api/agent/manifest did not answer"

cat <<DONE

Next steps
  1. Cloudflare DNS: A record $DOMAIN → this host, proxied (orange cloud).
  2. SSL mode Full (strict) + origin certificate, or run: sudo certbot --nginx -d $DOMAIN
  3. Set AGENT_TOKEN in .env if /api/agent/* is reachable from the internet.
  4. Install TURN for cross-network calls: sudo ./coturn/install.sh
  5. Backups: crontab -e → 15 3 * * * $ROOT/scripts/backup.sh

Logs: pm2 logs $APP --lines 100
DONE
