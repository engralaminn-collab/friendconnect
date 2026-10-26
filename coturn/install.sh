#!/usr/bin/env bash
# FriendConnect — Coturn Installation Script (Ubuntu)
# Installs Coturn TURN server + configures firewall.
# Usage: sudo ./coturn/install.sh
set -euo pipefail

echo "=== FriendConnect Coturn Installation ==="

# 1. Install coturn
echo "[1/5] Installing Coturn..."
apt-get update -qq
apt-get install -y coturn
echo "  ✓ Coturn installed"

# 2. Enable TURN server (default config disables it)
echo "[2/5] Enabling TURN server..."
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
echo "  ✓ TURN server enabled"

# 3. Copy config
echo "[3/5] Installing configuration..."
PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "YOUR_PUBLIC_IP")
echo "  Detected public IP: $PUBLIC_IP"
cp coturn/turnserver.conf /etc/turnserver.conf
sed -i "s/# external-ip=YOUR_PUBLIC_IP/external-ip=$PUBLIC_IP/" /etc/turnserver.conf
echo "  ✓ Config installed with public IP: $PUBLIC_IP"

# 4. Generate TURN secret if not set
echo "[4/5] Generating TURN secret..."
SECRET=$(openssl rand -hex 32)
sed -i "s/CHANGE_ME_TURN_SECRET/$SECRET/" /etc/turnserver.conf
echo "  ✓ TURN secret generated: $SECRET"
echo "  Add to FriendConnect .env:"
echo "    TURN_SECRET=$SECRET"
echo "    TURN_REALM=friendconnect"
echo "    TURN_SERVERS=turn:$PUBLIC_IP:3478,turns:$PUBLIC_IP:5349"

# 5. Open firewall
echo "[5/5] Configuring firewall..."
if command -v ufw >/dev/null 2>&1; then
  ufw allow 3478/tcp
  ufw allow 3478/udp
  ufw allow 5349/tcp
  ufw allow 49152:65535/udp  # relay ports
  echo "  ✓ Firewall rules added"
else
  echo "  WARN: ufw not found — manually open ports 3478 (TCP/UDP), 5349 (TCP), 49152-65535 (UDP)"
fi

# 6. Restart + enable
systemctl enable coturn
systemctl restart coturn
echo "  ✓ Coturn service started"

echo ""
echo "=== Coturn installation complete ==="
echo "Verify: coturn/healthcheck.sh"
echo "Logs: tail -f /var/log/turnserver.log"
