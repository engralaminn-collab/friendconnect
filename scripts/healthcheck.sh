#!/usr/bin/env bash
# FriendConnect — Health Check Script (for cron/monitoring)
set -euo pipefail
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ]; then
  echo "OK: $HEALTH_URL -> 200"
  exit 0
else
  echo "FAIL: $HEALTH_URL -> $STATUS"
  pm2 restart friendconnect-app friendconnect-realtime 2>/dev/null || true
  exit 1
fi
