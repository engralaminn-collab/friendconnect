#!/usr/bin/env bash
# ============================================================================
# FriendConnect — one-command deploy for panel.alolabs.net
# ----------------------------------------------------------------------------
# Idempotent: safe to run on every push. Does deps → prisma → build → PM2 →
# nginx → verification, and tells you exactly which step failed.
#
#   ./scripts/deploy-alo-server.sh              full deploy
#   ./scripts/deploy-alo-server.sh --skip-build restart only (config change)
#   ./scripts/deploy-alo-server.sh --dry-run    print the plan, change nothing
# ============================================================================
set -Eeuo pipefail

APP="${APP:-friendconnect}"
DOMAIN="${DOMAIN:-panel.alolabs.net}"
PORT="${PORT:-3012}"
ROOT="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SKIP_BUILD=0
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Unknown flag: $arg (try --help)" >&2; exit 2 ;;
  esac
done

STEP=0
step() { STEP=$((STEP + 1)); printf '\n\033[1;36m[%d] %s\033[0m\n' "$STEP" "$1"; }
ok()   { printf '    \033[0;32m✓\033[0m %s\n' "$1"; }
warn() { printf '    \033[0;33m!\033[0m %s\n' "$1"; }
die()  { printf '\n\033[0;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }
run()  {
  if [ "$DRY_RUN" = "1" ]; then printf '    would run: %s\n' "$*"; return 0; fi
  "$@"
}

printf '\033[1mDeploying %s → %s:%s from %s\033[0m\n' "$APP" "$DOMAIN" "$PORT" "$ROOT"
[ -d "$ROOT/.git" ] || die "$ROOT is not a git checkout"
cd "$ROOT"

# ---------------------------------------------------------------------------
step "Preflight"
command -v node >/dev/null || die "node is not installed"
command -v npm  >/dev/null || die "npm is not installed"
command -v pm2  >/dev/null || die "pm2 is not installed (npm i -g pm2)"
ok "node $(node -v), npm $(npm -v), pm2 $(pm2 -v 2>/dev/null | tail -1)"
if [ ! -f .env.local ] && [ ! -f .env ]; then
  warn "no .env.local — the app will boot with defaults (offline operators, no database)"
fi
if ! grep -qs '^AGENT_TOKEN=' .env.local .env; then
  warn "AGENT_TOKEN is not set: /api/agent/* is open to anyone who can reach the domain"
fi

# ---------------------------------------------------------------------------
step "Dependencies"
run npm ci --no-audit --no-fund
ok "dependencies installed"

# ---------------------------------------------------------------------------
step "Database (tolerant)"
if npx prisma -v >/dev/null 2>&1; then
  if run npx prisma generate >/dev/null 2>&1; then ok "prisma client generated"
  else warn "prisma generate failed — continuing (client may be stale)"; fi
  if run npx prisma migrate deploy >/dev/null 2>&1; then ok "migrations applied"
  else warn "migrate deploy failed — no reachable database; API routes that need one will answer honestly"; fi
else
  warn "prisma CLI unavailable — skipped"
fi

# ---------------------------------------------------------------------------
step "Build"
if [ "$SKIP_BUILD" = "1" ]; then
  ok "skipped (--skip-build)"
else
  run npm run build
  ok "build finished"
fi

# ---------------------------------------------------------------------------
step "PM2"
if [ "$DRY_RUN" = "1" ]; then
  run pm2 restart "$APP"
else
  if pm2 describe "$APP" >/dev/null 2>&1; then
    PORT="$PORT" pm2 restart "$APP" --update-env >/dev/null
    ok "restarted existing process"
  else
    PORT="$PORT" pm2 start ecosystem.config.cjs --only "$APP" >/dev/null
    ok "started new process"
  fi
  pm2 save >/dev/null
  ok "process list saved"
fi

# ---------------------------------------------------------------------------
step "Nginx vhost"
NGINX_SITE="/etc/nginx/sites-available/$DOMAIN"
if [ "$DRY_RUN" = "1" ]; then
  echo "    would write $NGINX_SITE and reload nginx"
elif command -v nginx >/dev/null && [ -w /etc/nginx/sites-available ]; then
  cat > "$NGINX_SITE" <<CONF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 25m;

    location /api/agent/ {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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
        proxy_read_timeout 300s;
    }
}
CONF
  ln -sfn "$NGINX_SITE" "/etc/nginx/sites-enabled/$DOMAIN"
  [ -e /etc/nginx/sites-enabled/default ] && rm -f /etc/nginx/sites-enabled/default
  nginx -t >/dev/null && systemctl reload nginx
  ok "vhost written, tested and reloaded"
else
  warn "no nginx or no write access — vhost not installed (run with sudo)"
fi

# ---------------------------------------------------------------------------
step "Verification"
sleep 3
fail=0
check() {
  local path="$1" expect="${2:-200}"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$PORT$path" || echo 000)
  if [ "$code" = "$expect" ]; then ok "$path → $code"
  else warn "$path → $code (expected $expect)"; fail=1; fi
}
check /
check /app/bill-agent
check /app/exam
check /api/agent/manifest

if curl -fsS --max-time 10 "http://127.0.0.1:$PORT/api/health" -o /tmp/fc-health.json; then
  ok "health: $(head -c 160 /tmp/fc-health.json)"
else
  warn "health endpoint did not answer 200 — check \`pm2 logs $APP\`"
  fail=1
fi

step "Next steps"
cat <<NEXT
    Cloudflare: SSL/TLS must be "Full (strict)" — Flexible breaks cookies.
    Cloudflare: WebSockets on; bypass cache for /api/*.
    Operator:   open https://$DOMAIN/app/bill-agent once to drain the queue.
    Logs:       pm2 logs $APP --lines 80
    Health:     curl -s http://127.0.0.1:$PORT/api/health
NEXT

if [ "$fail" = "0" ]; then
  printf '\n\033[0;32mDeploy complete.\033[0m %s is serving on port %s.\n' "$DOMAIN" "$PORT"
else
  printf '\n\033[0;33mDeploy finished with warnings.\033[0m Check the steps above.\n'
  exit 1
fi
