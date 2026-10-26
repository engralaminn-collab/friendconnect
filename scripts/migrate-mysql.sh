#!/usr/bin/env bash
# FriendConnect — Switch to MySQL + Run Migrations (round 14)
# Usage: ./scripts/migrate-mysql.sh
# This script:
#   1. Replaces prisma/schema.prisma with the MySQL version
#   2. Sets DATABASE_URL to the MySQL connection string
#   3. Runs prisma migrate deploy (safe, non-destructive)
set -euo pipefail

echo "=== FriendConnect MySQL Migration ==="

# Check DATABASE_URL is MySQL
if [[ ! "${DATABASE_URL:-}" == mysql://* ]]; then
  echo "ERROR: DATABASE_URL must be a MySQL connection string (mysql://...)"
  echo "Current: ${DATABASE_URL:-not set}"
  exit 1
fi

echo "[1/4] Backing up SQLite schema..."
cp prisma/schema.prisma prisma/schema.sqlite.prisma.bak

echo "[2/4] Switching to MySQL schema..."
cp prisma/schema.mysql.prisma prisma/schema.prisma

echo "[3/4] Generating Prisma client for MySQL..."
bunx prisma generate

echo "[4/4] Running migrations..."
bunx prisma migrate deploy

echo ""
echo "=== MySQL migration complete ==="
echo "To roll back to SQLite: cp prisma/schema.sqlite.prisma.bak prisma/schema.prisma && bun run db:generate"
