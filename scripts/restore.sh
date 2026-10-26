#!/usr/bin/env bash
# FriendConnect — Restore Script
# Restores from a backup archive.
# Usage: ./scripts/restore.sh <backup-file.tar.gz>
set -euo pipefail

APP_DIR="/home/aloedu/friendconnect"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/restore.sh <backup-file.tar.gz>"
  echo "Available backups:"
  ls -1 "${APP_DIR}/backups/"*.tar.gz 2>/dev/null || echo "  (none)"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "=== FriendConnect Restore ==="
echo "WARNING: This will OVERWRITE current data."
echo "Backup: $BACKUP_FILE"
read -p "Are you sure? (type YES to continue): " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "Aborted."
  exit 0
fi

TEMP_DIR=$(mktemp -d)
tar xzf "$BACKUP_FILE" -C "$TEMP_DIR"
BACKUP_CONTENT=$(ls "$TEMP_DIR")

cd "$APP_DIR"
export $(grep -v '^#' .env | xargs)

# 1. Restore database
echo "[1/3] Restoring database..."
if [ -f "$TEMP_DIR/$BACKUP_CONTENT/database.sql" ]; then
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$TEMP_DIR/$BACKUP_CONTENT/database.sql"
  echo "  ✓ MySQL restored"
elif [ -f "$TEMP_DIR/$BACKUP_CONTENT/database.sqlite" ]; then
  DB_FILE=$(echo "$DATABASE_URL" | sed 's|file:||')
  cp "$TEMP_DIR/$BACKUP_CONTENT/database.sqlite" "$DB_FILE"
  echo "  ✓ SQLite restored"
fi

# 2. Restore uploads
echo "[2/3] Restoring uploads..."
if [ -f "$TEMP_DIR/$BACKUP_CONTENT/uploads.tar.gz" ]; then
  tar xzf "$TEMP_DIR/$BACKUP_CONTENT/uploads.tar.gz" -C "$APP_DIR"
  echo "  ✓ Uploads restored"
fi

# 3. Restore config
echo "[3/3] Restoring config..."
if [ -f "$TEMP_DIR/$BACKUP_CONTENT/.env.backup" ]; then
  cp "$TEMP_DIR/$BACKUP_CONTENT/.env.backup" "$APP_DIR/.env"
  echo "  ✓ Config restored"
fi

rm -rf "$TEMP_DIR"
echo ""
echo "=== Restore complete ==="
echo "Restart the application: pm2 restart friendconnect"
