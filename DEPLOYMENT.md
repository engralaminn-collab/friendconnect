# FriendConnect — Production Deployment Guide

FriendConnect is a Next.js 15 App Router application served by a small custom
Node.js server so that the authenticated Socket.IO realtime engine and the
HTTP routes share one port. All persistent state lives in MySQL 8; the browser
is never the source of truth.

## 1. Architecture

```
Browser (Next client, Zustand UI stores)
   │  HTTPS  ── HttpOnly session cookie + x-fc-request CSRF header
   ▼
Custom Node server (server/index.ts → dist/server/index.cjs)
   ├── Next.js request handler  → Route Handlers under src/app/api
   └── Socket.IO (/api/realtime) → authenticated handshake, per-user rooms
         │
         ├── MySQL 8 (Drizzle ORM, versioned SQL migrations in ./drizzle)
         ├── Private storage (local driver OR S3-compatible bucket)
         ├── Optional Redis (multi-instance rate limits / realtime state)
         ├── Optional SMTP (email verification / password reset)
         └── Optional STUN/TURN (WebRTC) and LiveKit (group calls only)
```

- **Single instance**: in-memory rate limiting and Socket.IO pub/sub work out
  of the box.
- **Multiple instances**: set `REDIS_URL` and run every instance behind a
  sticky-session load balancer (Socket.IO WebSocket transport).

## 2. Requirements

| Component | Version / notes |
| --- | --- |
| Node.js | 20.x or 22.x LTS |
| MySQL | 8.x (the local disposable test build is 5.7; production targets 8) |
| Object storage | S3-compatible bucket (AWS S3, R2, B2, MinIO) or local disk |
| Process manager | systemd, PM2, Docker, or equivalent |
| TLS | Required in production (secure cookies, WebRTC permissions) |

## 3. Configuration

Copy the documented template and fill every required value:

```bash
cp .env.example .env
chmod 600 .env
```

Mandatory in production:

- `DATABASE_URL` — least-privilege application user, TLS enabled (`MYSQL_TLS=true`).
- `AUTH_SECRET` — generate with `openssl rand -base64 48`.
- `APP_URL` and `ALLOWED_ORIGINS` — exact public origins (CSRF/SameOrigin allowlist).
- `COOKIE_SECURE=true` (the default `auto` also enables it under `NODE_ENV=production`).
- `MEDIA_DRIVER=s3` plus the `S3_*` block for private media.
- `STUN_URLS` / `TURN_URLS` with credentials for calls across restrictive NATs.

Never commit `.env`. It is gitignored; secrets must come from your platform's
secret manager. The application fails fast with an actionable error when
mandatory configuration is missing.

## 4. Database setup

```bash
# 1. Create an empty database and application user (example)
mysql -u root -p
CREATE DATABASE friendconnect CHARACTER SET utf8mb4;
CREATE USER 'friendconnect'@'%' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON friendconnect.* TO 'friendconnect'@'%';

# 2. Apply versioned migrations (creates/updates all tables)
npm run db:migrate

# 3. Optional: idempotent demo seed (do NOT run in real production)
npm run db:seed
```

Migrations are plain SQL files under `drizzle/` tracked in the journal. The
runner is idempotent — already-applied migrations are recorded in
`__drizzle_migrations` and skipped. Schema changes require a new numbered SQL
file plus the matching Drizzle table definition; never edit a released
migration.

## 5. Build and run

```bash
npm ci
npm run build          # Next.js production build (routes, pages, middleware)
npm run build:server   # esbuild bundle → dist/server/index.cjs
NODE_ENV=production node --env-file=.env dist/server/index.cjs
```

### systemd unit (reference)

```ini
[Unit]
Description=FriendConnect
After=network.target mysql.service

[Service]
WorkingDirectory=/opt/friendconnect
Environment=NODE_ENV=production
ExecStart=/usr/bin/node --env-file=/opt/friendconnect/.env dist/server/index.cjs
Restart=on-failure
User=friendconnect
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/friendconnect/.private-media

[Install]
WantedBy=multi-user.target
```

`next dev` alone intentionally returns `503 realtime_unavailable` on
`/api/realtime`; the custom server must be used whenever realtime is required.

## 6. Reverse proxy (nginx reference)

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;        # Socket.IO
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

The app trusts `x-forwarded-for` (first hop) for rate-limit identity, so the
proxy must overwrite/control that header.

## 7. Private media storage

- **Local driver** (`MEDIA_DRIVER=local`): files are written to
  `MEDIA_LOCAL_DIR` (default `./.private-media`, gitignored), never served from
  `public/`. Downloads are streamed through an authorized route handler after
  conversation-membership or ownership checks.
- **S3 driver**: the bucket must stay private. The handler issues short-lived
  presigned URLs (`S3_PRESIGN_TTL_SEC`) after the same authorization checks.
- Uploads are size-capped (`MEDIA_MAX_UPLOAD_MB`), magic-byte sniffed (MIME is
  never trusted from the browser), and only whitelisted families are accepted.

Back up the local directory with your normal volume snapshots; for S3 rely on
bucket versioning and cross-region replication.

## 8. Realtime, WebRTC and multi-instance notes

- Socket.IO authenticates every handshake with the session cookie; anonymous
  handshakes are rejected with `connect_error: unauthorized`.
- Events are persisted before publication, and message sends accept a
  `clientNonce` for idempotent retries.
- 1:1 audio/video calls negotiate peer-to-peer with STUN/TURN; signaling
  (SDP/ICE/state/hang-up) is membership-checked on every socket event.
- Group calls require an SFU. Wire `LIVEKIT_*` before enabling group UI; the
  current build presents an honest "not available" message instead of
  misrouting a group call through the 1:1 engine.
- For >1 Node instance, set `REDIS_URL` and enable sticky sessions.

## 9. Email

With `SMTP_URL` unset, verification and password-reset emails are logged to the
server console (development only). Set a real SMTP URL in production; tokens are
single-use, hashed at rest, and expire (`EMAIL_VERIFY_TTL_HOURS`,
`PASSWORD_RESET_TTL_HOURS`).

## 10. Security checklist

- [ ] TLS everywhere; `COOKIE_SECURE=true`, SameSite=Lax (or Strict).
- [ ] `AUTH_SECRET` rotated and stored in a secret manager.
- [ ] `ALLOWED_ORIGINS` limited to real origins; same-origin/CSRF header enforced.
- [ ] Rate limits tuned for your traffic (`RATE_LIMIT_*`), Redis for multi-instance.
- [ ] Private bucket, no public ACLs; presigned URLs only.
- [ ] MySQL least-privilege user, TLS connections, scheduled verified backups.
- [ ] TURN credentials provisioned; media server firewall restricted.
- [ ] Audit logging (`audit_events`) streamed to your log platform.
- [ ] Dependency and container scanning in CI.

## 11. Health checks and observability

- `GET /api/health` — liveness plus MySQL and storage checks (no auth).
- `GET /api/health/deep` — protected by `HEALTH_CHECK_TOKEN` when set.
- Every error envelope carries a `correlationId`; include it in support requests.
- Optional `SENTRY_DSN` for error monitoring.

## 12. Testing

```bash
npm test                 # Vitest: 157 tests, 29 skipped without a live server/DB
npm run test:types       # Type-check the test suite
node scripts/socket-smoke.mjs         # 10 authenticated realtime checks (server live)
node scripts/media-matrix-smoke.mjs   # 122 media/authz checks with real byte fixtures
```

Integration tests skip honestly (they never fake-pass) when no server is
reachable on `FC_BASE_URL` (default `http://localhost:3000`).

## 13. Backup & restore

1. MySQL: `mysqldump --single-transaction friendconnect` on a schedule; restore
   into an empty schema and re-run `npm run db:migrate` to confirm version.
2. Local media: snapshot `.private-media/`; object keys are content-addressed
   and referenced by the `media` table, so database and storage backups should
   share a recovery point.
3. Users can self-serve a full JSON export from **Settings → Data**; the same
   endpoint backs the workspace restore/import flow.

## 14. Deploying to alo-server-lap (`panel.alolabs.net`)

The box this build is specified for — Ubuntu 22.04, Node 24 via nvm, PM2 7,
Nginx 1.18, Cloudflare — is documented end to end in
[docs/SERVER-SPEC.md](docs/SERVER-SPEC.md). One command does the work:

```bash
cd ~/projects/friendconnect
./scripts/deploy-alo-server.sh            # deps → migrations → build → PM2 → nginx → health
```

The same script, the environment block and a live health check are visible in
the product at **/app/bill-agent → Deployment**, so an operator can deploy from
the UI they are looking at rather than a wiki they have to find.

### Operational notes that bite

- **Set `AGENT_TOKEN`** before `/api/agent/*` is reachable from the internet.
  Without it the queue endpoints are open — fine on localhost, not on a domain.
- **Cloudflare SSL must be Full (strict)**. Flexible rewrites the origin scheme
  to http, Secure cookies are dropped, and browser calls fail intermittently.
- **One operator tab** drains the Bill Agent queue. Two tabs would both drain it.
  The queue is server memory with a five-minute TTL; a restart drops pending
  commands, deliberately.
- **`/app` is not gated by the session cookie** by default, because the workspace
  is local-first and calls no authenticated API. Set `WORKSPACE_REQUIRES_AUTH=1`
  to restore the gate on a shared deployment.
