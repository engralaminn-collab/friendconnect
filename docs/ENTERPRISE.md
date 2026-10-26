# FriendConnect — Enterprise Production Documentation

## Architecture Overview

FriendConnect is a private social platform built on:

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Backend**: Next.js API Routes (serverless-style) + Prisma ORM
- **Database**: SQLite (via Prisma) — swappable for PostgreSQL in production
- **Realtime**: Socket.io mini-service (port 3003) behind Caddy gateway (port 81)
- **WebRTC**: Peer-to-peer audio/video calls with STUN/TURN ICE config
- **File Storage**: Local filesystem (`/upload`) with sharp image optimization
- **Auth**: Scrypt password hashing + httpOnly session cookies + optional TOTP 2FA

## Enterprise Features (Round 11)

### Security
- **Two-Factor Authentication (TOTP)**: RFC 6238 compliant, built-in crypto (no external deps). Setup via `/api/2fa/setup` → QR code → verify `/api/2fa/verify` → backup codes. Disable with password re-auth.
- **Email Verification**: `emailVerified` flag on User. Resend code via `/api/email/resend`, verify via `/api/email/verify`.
- **Active Sessions Management**: Track device name, user-agent, IP, last-active time. View via `/api/sessions`, revoke via `DELETE /api/sessions/[id]`.
- **Audit Log**: All security-relevant actions recorded in `AuditLog` table. Admin-only viewer at `/api/admin/audit`.
- **Upload Virus Scanning**: Heuristic blocking of dangerous MIME types + extensions.
- **File Quota Management**: Per-user storage quota (default 100MB). Enforced on upload.

### Observability
- **Health Checks**: `GET /api/health` — checks database + realtime + uptime. Returns 503 if degraded.
- **Metrics**: `GET /api/metrics` — Prometheus-format gauges.
- **Structured Logging**: JSON logger (`src/lib/logger.ts`) with levels + context.

### Admin
- **Admin Analytics**: `GET /api/admin/analytics` (admin role only).
- **Audit Log Viewer**: `GET /api/admin/audit` (admin role only).
- **Role-Based Access**: `User.role` field (`user` | `admin`).

### Performance
- **Image Optimization**: Uploads processed via `sharp` — resized to max 1920px, MozJPEG quality 85.

## API Endpoints (Enterprise)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | none | Health check |
| `/api/metrics` | GET | none | Prometheus metrics |
| `/api/sessions` | GET | user | List active sessions |
| `/api/sessions/[id]` | DELETE | user | Revoke a session |
| `/api/2fa/setup` | POST | user | Generate TOTP secret + QR |
| `/api/2fa/verify` | POST | user | Verify code + enable 2FA |
| `/api/2fa/disable` | POST | user | Disable 2FA (password required) |
| `/api/email/resend` | POST | user | Resend email verification code |
| `/api/email/verify` | POST | user | Verify email with code |
| `/api/quota` | GET | user | File storage quota status |
| `/api/admin/analytics` | GET | admin | Platform analytics |
| `/api/admin/audit` | GET | admin | Audit log entries |

## Demo Accounts
- `aria@friendconnect.app` / `password123` — **admin** + verified
- `bilal@friendconnect.app` / `password123` — user
- `carla@friendconnect.app` / `password123` — user

## Deployment Notes
- **Database**: Migrate SQLite → PostgreSQL for production (update provider + DATABASE_URL).
- **Realtime**: For multi-server, add `@socket.io/redis-adapter` + Redis.
- **Background Jobs**: Scheduled message delivery runs in-process (BullMQ + Redis recommended for production).
- **File Storage**: Swap local `/upload` for S3-compatible storage in production.
- **Email**: Wire `/api/email/resend` to a real email provider (SES/SendGrid).
- **Turn Server**: Configure `TURN_SERVER` env vars for production WebRTC.

## Environment Variables
```
DATABASE_URL=file:./db/custom.db
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=                # optional
TURN_USERNAME=
TURN_PASSWORD=
LOG_LEVEL=info              # debug|info|warn|error
```

## Disaster Recovery
- **Database backups**: SQLite file at `db/custom.db` — snapshot regularly. For PostgreSQL, use `pg_dump`.
- **File backups**: `/upload` directory — sync to offsite storage.
- **Session invalidation**: Truncate the `Session` table to force-logout all users.
- **Audit trail**: `AuditLog` preserves events even after user deletion (userId set to null on cascade).
