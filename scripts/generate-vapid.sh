#!/usr/bin/env bash
# FriendConnect — Generate VAPID Key Pair for Web Push
# Usage: ./scripts/generate-vapid.sh
# Output: add the keys to .env as VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT
set -euo pipefail

echo "=== FriendConnect VAPID Key Generation ==="
echo ""

# Use Node to generate via the web-push library
KEYS=$(node -e "
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log(JSON.stringify(keys));
" 2>/dev/null || bun -e "
import webpush from 'web-push';
const keys = webpush.generateVAPIDKeys();
console.log(JSON.stringify(keys));
" 2>/dev/null)

if [ -z "$KEYS" ]; then
  echo "ERROR: Could not generate VAPID keys. Install web-push first: bun add web-push"
  exit 1
fi

PUBLIC=$(echo "$KEYS" | node -pe "JSON.parse(require('fs').readFileSync(0)).publicKey" 2>/dev/null || echo "$KEYS" | bun -e "import {readFileSync} from 'fs'; console.log(JSON.parse(readFileSync(0)).publicKey)")
PRIVATE=$(echo "$KEYS" | node -pe "JSON.parse(require('fs').readFileSync(0)).privateKey" 2>/dev/null || echo "$KEYS" | bun -e "import {readFileSync} from 'fs'; console.log(JSON.parse(readFileSync(0)).privateKey)")

echo "Add these to your .env file:"
echo ""
echo "VAPID_PUBLIC_KEY=\"$PUBLIC\""
echo "VAPID_PRIVATE_KEY=\"$PRIVATE\""
echo "VAPID_SUBJECT=\"mailto:admin@your-domain.com\""
echo ""
echo "✓ VAPID keys generated successfully"
