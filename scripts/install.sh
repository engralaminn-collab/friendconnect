#!/usr/bin/env bash
# FriendConnect — First-time Installation Script
# Usage: ./scripts/install.sh
set -euo pipefail
echo "=== FriendConnect Installation ==="
echo "[1/5] Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "FAIL: install Node.js 22+"; exit 1; }
command -v bun >/dev/null 2>&1 || { echo "FAIL: install bun (curl -fsSL https://bun.sh/install | bash)"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "Installing PM2..."; npm install -g pm2; }
command -v caddy >/dev/null 2>&1 || { echo "WARN: Caddy not found (install for production HTTPS)"; }
echo "  ✓ Prerequisites OK"
echo "[2/5] Installing dependencies..."
bun install
echo "  ✓ Dependencies installed"
echo "[3/5] Setting up environment..."
if [ ! -f .env ]; then cp .env.example .env; echo "  ✓ .env created from template (EDIT IT!)"; else echo "  ✓ .env exists"; fi
mkdir -p logs upload db
echo "[4/5] Building..."
bun run build
echo "  ✓ Build complete"
echo "[5/5] Database setup..."
bun run db:generate
bunx prisma migrate deploy 2>/dev/null || { echo "  Running initial migration..."; bunx prisma migrate dev --name init; }
echo "  ✓ Database ready"
echo ""
echo "=== Installation complete ==="
echo "Next steps:"
echo "  1. Edit .env with your production values"
echo "  2. Run: ./scripts/deploy.sh"
echo "  3. Or start dev: bun run dev"
