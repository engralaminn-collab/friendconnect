# Server specification — alo-server-lap

The box this build is specified for, the slot it occupies, and the checks that
prove it is alive. Everything here is copy-pasteable.

## Host

| Item | Value |
| --- | --- |
| Host | `103.231.239.79` — Ubuntu 22.04 LTS |
| Node | v24.22.1 via NVM |
| npm | 11.19.1 |
| Process manager | PM2 7.1.1 |
| Reverse proxy | Nginx 1.18.0 |
| Data | SQLite 3.37 (single box) · MySQL 8 / PostgreSQL 14 (shared) |
| Cache | Redis 6 (optional) |
| DNS / CDN | Cloudflare, proxied |
| TLS | Cloudflare origin certificate (Full/Strict) · Let’s Encrypt optional |
| Framework | Next.js 16, App Router, standalone output |

## This app's slot

| Domain | PM2 app | Port | Repo |
| --- | --- | --- | --- |
| `panel.alolabs.net` | `friendconnect` | `3012` | `~/projects/friendconnect` |

```bash
pm2 describe friendconnect
curl -sS http://127.0.0.1:3012/api/health | jq
```

## Deploy

```bash
cd ~/projects/friendconnect
./scripts/deploy-alo-server.sh              # pull-free: deploys the checkout
```

The script — also shown in the workspace at **Bill Agent → Deployment** — does
dependencies, migrations, build, PM2 restart-or-start, the Nginx vhost, a reload
and two health checks. It is idempotent: running it twice changes nothing.
`--skip-build` restarts without rebuilding.

### First run on a new box

```bash
# 1. Repo and environment
git clone https://github.com/engralaminn-collab/friendconnect.git ~/projects/friendconnect
cd ~/projects/friendconnect
cp .env.example .env && $EDITOR .env        # DATABASE_URL, AUTH_SECRET, APP_URL, AGENT_TOKEN

# 2. Dependencies and schema
npm ci
npm run db:push                              # first time only
npm run build

# 3. Process
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup                      # survive a reboot

# 4. Proxy
sudo ln -sf /etc/nginx/sites-available/panel.alolabs.net /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Environment

```env
NODE_ENV=production
PORT=3012
APP_URL=https://panel.alolabs.net
ALLOWED_ORIGINS=https://panel.alolabs.net

# SQLite on one box
DATABASE_URL=file:./data/friendconnect.db
# or shared MySQL 8
# DATABASE_URL=mysql://friendconnect:***@127.0.0.1:3306/friendconnect
# or shared PostgreSQL 14
# DATABASE_URL=postgresql://friendconnect:***@127.0.0.1:5432/friendconnect

AUTH_SECRET=<openssl rand -base64 48>
COOKIE_SECURE=auto
MEDIA_DRIVER=local
MEDIA_LOCAL_DIR=/home/alamin/data/friendconnect-media

# Bill Agent control API — set before the domain is public
AGENT_TOKEN=<openssl rand -hex 32>

# Optional
REDIS_URL=redis://127.0.0.1:6379
TURN_SERVERS=turn:103.231.239.79:3478
TURN_SECRET=<shared with coturn>
TURN_REALM=alolabs.net

# Only if /app must sit behind the session cookie
WORKSPACE_REQUIRES_AUTH=0
```

## Health and logs

| Check | Command | Healthy answer |
| --- | --- | --- |
| App | `curl -s http://127.0.0.1:3012/api/health` | `"status":"healthy"` |
| Calls | `curl -s http://127.0.0.1:3012/api/webrtc/health` | `stun: true`, `turn: true` when TURN is configured |
| Agent | `curl -s http://127.0.0.1:3012/api/agent/manifest` | JSON with `counts.tools` |
| Process | `pm2 status` | `online`, restarts not climbing |
| Logs | `pm2 logs friendconnect --lines 100` | `/home/alamin/.pm2/logs/friendconnect-*.log` |

`degraded` is not a failure: it means an optional subsystem (Redis, SMTP, push)
is unconfigured. `unhealthy` means the database is unreachable — fix that first.

## Cloudflare

1. A record `panel` → `103.231.239.79`, **Proxied**.
2. SSL/TLS mode **Full (strict)** with an origin certificate on the box.
   Flexible rewrites the origin scheme to http: Secure cookies get dropped and
   browser calls fail intermittently. Do not ship on Flexible.
3. Caching: bypass `/api/*` (the vhost above sets `no-store` on health).
4. WebSockets are on by default; nothing to enable.

## Backups and rollback

```bash
./scripts/backup.sh                 # database + media; schedule daily at 03:15
./scripts/restore.sh <archive>      # rehearse this once before you need it
./scripts/rollback.sh               # previous release
```

## AI-ready hosting, in concrete terms

An "AI-ready" panel means an agent can answer these questions itself. Here they
are, with real endpoints:

| Question | Where the answer lives |
| --- | --- |
| What can this deployment do? | `GET /api/agent/manifest` → 39 tools + schemas |
| Is it healthy? | `GET /api/health` → database, Redis, email, push, uptime |
| What is the current load? | `pm2 status`, `pm2 monit` |
| Can I trigger work from outside? | `POST /api/agent/commands` (bearer `AGENT_TOKEN`) |
| What changed? | Bill Agent → Runs & audit (export JSON/CSV) |
| How do I deploy? | `./scripts/deploy-alo-server.sh` |

That is the whole difference between a dashboard with a chatbot bolted on and a
panel an agent can operate: a stable tool contract, a machine-readable manifest,
an authenticated command path and an audit trail.

## Limits worth stating

- The remote command queue is **server memory**, five-minute TTL. A restart drops
  pending commands. Unattended automation needs a headless worker sharing the
  registry, not a longer TTL.
- Cross-network calls need TURN. Same-network calls work with STUN alone.
- SQLite is right for one box and wrong for two. Switching to MySQL/PostgreSQL
  is a schema + `DATABASE_URL` change (`scripts/migrate-mysql.sh`).
