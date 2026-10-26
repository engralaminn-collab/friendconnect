#!/usr/bin/env bash
# FriendConnect — Backup Script
# Creates timestamped database + uploads backup.
# Usage: ./scripts/backup.sh
# Schedule via cron: 0 2 * * * /home/aloedu/friendconnect/scripts/backup.sh
set -euo pipefail

APP_DIR="/home/aloedu/friendconnect"
BACKUP_DIR="${APP_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

mkdir -p "$BACKUP_PATH"
cd "$APP_DIR"

echo "=== FriendConnect Backup ==="
echo "Time: $(date)"
echo "Backup path: $BACKUP_PATH"

# Load environment
export $(grep -v '^#' .env | xargs)

# 1. Database backup
echo "[1/3] Backing up database..."
if [[ "$DATABASE_URL" == mysql://* ]]; then
  # MySQL backup
  DB_USER=$(echo "$DATABASE_URL" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" --single-transaction --routines "$DB_NAME" > "$BACKUP_PATH/database.sql"
  echo "  ✓ MySQL dump: database.sql ($(du -h "$BACKUP_PATH/database.sql" | cut -f1))"
elif [[ "$DATABASE_URL" == file:* ]]; then
  # SQLite backup (copy the file)
  DB_FILE=$(echo "$DATABASE_URL" | sed 's|file:||')
  cp "$DB_FILE" "$BACKUP_PATH/database.sqlite"
  echo "  ✓ SQLite copy: database.sqlite"
else
  echo "  WARN: Unknown database type, skipping DB backup"
fi

# 2. Uploads backup
echo "[2/3] Backing up uploads..."
if [ -d "${APP_DIR}/upload" ]; then
  tar czf "$BACKUP_PATH/uploads.tar.gz" -C "$APP_DIR" upload/
  echo "  ✓ Uploads: uploads.tar.gz ($(du -h "$BACKUP_PATH/uploads.tar.gz" | cut -f1))"
fi

# 3. Config backup (env, not secrets in repo)
echo "[3/3] Backing up config..."
cp .env "$BACKUP_PATH/.env.backup" 2>/dev/null || true
echo "  ✓ Config saved"

# Compress everything
tar czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"
rm -rf "$BACKUP_PATH"
echo ""
echo "=== Backup complete: ${BACKUP_PATH}.tar.gz ==="
echo "Size: $(du -h "${BACKUP_PATH}.tar.gz" | cut -f1)"

# Cleanup old backups (keep last 30 days)
echo "Cleaning backups older than 30 days..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true
echo "  ✓ Old backups cleaned"
