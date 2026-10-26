#!/usr/bin/env bash
# FriendConnect — Coturn Firewall Configuration
# Opens the ports required for TURN.
# Usage: sudo ./coturn/firewall.sh
set -euo pipefail

echo "=== FriendConnect Coturn Firewall Configuration ==="

if ! command -v ufw >/dev/null 2>&1; then
  echo "ERROR: ufw not found. Install with: apt install ufw"
  exit 1
fi

# TURN listening ports
ufw allow 3478/tcp comment "Coturn TURN TCP"
ufw allow 3478/udp comment "Coturn TURN UDP"
ufw allow 5349/tcp comment "Coturn TURNS TLS"

# TURN relay port range (UDP — used for media relay)
ufw allow 49152:65535/udp comment "Coturn relay UDP"

echo "✓ Firewall rules added for Coturn"
echo ""
echo "Verify: ufw status"
