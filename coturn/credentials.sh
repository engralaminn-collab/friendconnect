#!/usr/bin/env bash
# FriendConnect — Generate time-limited TURN credentials
# Uses the TURN_SECRET to generate HMAC credentials for testing.
# Usage: ./coturn/credentials.sh
set -euo pipefail

SECRET="${TURN_SECRET:-}"
if [ -z "$SECRET" ]; then
  echo "ERROR: TURN_SECRET not set in environment"
  echo "Set it in .env or export TURN_SECRET=..."
  exit 1
fi

EXPIRES=$(( $(date +%s) + 3600 )) # 1 hour
USERNAME="${EXPIRES}:friendconnect"
CREDENTIAL=$(echo -n "$USERNAME" | openssl dgst -sha1 -hmac "$SECRET" -binary | base64)

echo "=== FriendConnect TURN Credentials (time-limited) ==="
echo "Expires: $(date -d "@$EXPIRES" 2>/dev/null || date -r "$EXPIRES")"
echo "Username: $USERNAME"
echo "Credential: $CREDENTIAL"
echo ""
echo "Use these in your WebRTC client config:"
echo "  iceServers: [{ urls: 'turn:HOST:3478', username: '$USERNAME', credential: '$CREDENTIAL' }]"
