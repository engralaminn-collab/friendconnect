#!/usr/bin/env bash
# FriendConnect — Coturn Health Check
# Verifies TURN server is reachable on UDP/TCP/TLS.
# Usage: ./coturn/healthcheck.sh [turn-server-ip]
set -euo pipefail

TURN_HOST="${1:-${TURN_HOST:-localhost}}"
TURN_PORT="${TURN_PORT:-3478}"
TURN_TLS_PORT="${TURN_TLS_PORT:-5349}"

echo "=== FriendConnect Coturn Health Check ==="
echo "Host: $TURN_HOST"
echo ""

# 1. DNS resolution
echo -n "[1/5] DNS resolution... "
if host "$TURN_HOST" >/dev/null 2>&1; then
  echo "OK"
else
  echo "FAIL (cannot resolve $TURN_HOST)"
fi

# 2. TCP reachability
echo -n "[2/5] TCP port $TURN_PORT... "
if timeout 3 bash -c "echo > /dev/tcp/$TURN_HOST/$TURN_PORT" 2>/dev/null; then
  echo "OK"
else
  echo "FAIL (unreachable)"
fi

# 3. TLS port reachability
echo -n "[3/5] TLS port $TURN_TLS_PORT... "
if timeout 3 bash -c "echo > /dev/tcp/$TURN_HOST/$TURN_TLS_PORT" 2>/dev/null; then
  echo "OK"
else
  echo "FAIL (unreachable — TLS may not be configured)"
fi

# 4. UDP reachability (best-effort — UDP is connectionless)
echo -n "[4/5] UDP port $TURN_PORT... "
if command -v nc >/dev/null 2>&1; then
  if timeout 3 nc -u -z "$TURN_HOST" "$TURN_PORT" 2>/dev/null; then
    echo "OK"
  else
    echo "WARN (UDP test inconclusive — check with a real WebRTC client)"
  fi
else
  echo "SKIP (nc not installed)"
fi

# 5. TURN service status (if localhost)
if [ "$TURN_HOST" = "localhost" ]; then
  echo -n "[5/5] Coturn service... "
  if systemctl is-active --quiet coturn 2>/dev/null; then
    echo "OK (running)"
  else
    echo "FAIL (not running — check: systemctl status coturn)"
  fi
else
  echo "[5/5] Coturn service: SKIP (remote host)"
fi

echo ""
echo "For full ICE/TURN allocation test, use a WebRTC client against /api/webrtc/diagnostics"
