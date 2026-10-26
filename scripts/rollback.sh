#!/usr/bin/env bash
# Rollback to previous deployment (requires git)
set -euo pipefail
echo "=== Rolling back to previous version ==="
git log --oneline -5
PREV=$(git log --oneline -2 | tail -1 | awk '{print $1}')
echo "Rolling back to: $PREV"
git stash
git checkout "$PREV"
bun install --frozen-lockfile
bun run build
pm2 restart friendconnect-app friendconnect-realtime friendconnect-worker
echo "=== Rollback complete ==="
