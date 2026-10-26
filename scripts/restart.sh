#!/usr/bin/env bash
set -euo pipefail
pm2 restart friendconnect-app friendconnect-realtime friendconnect-worker
echo "All services restarted"
