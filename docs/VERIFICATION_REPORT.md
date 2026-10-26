# FriendConnect — Verification Report

_Generated: 2026-10-26 · Branch: `arena/dd276a17-friendconnect` · Environment: disposable Linux sandbox, Node 20, MySQL 5.7.29 (production target is MySQL 8.x)._

This report distinguishes **VERIFIED** (exercised by automated tests against the
live HTTP + Socket.IO server with a real database and real byte fixtures),
**UNIT-VERIFIED** (covered by automated tests without a live server), and
**BLOCKED** (cannot be exercised here because an external service/credential is
required). Nothing blocked or skipped is reported as passing.

## 1. How verification was run

```bash
npm run build && npm run build:server     # Next.js production build + custom server bundle
node --env-file=.env dist/server/index.cjs # live server on :3000 with Socket.IO
npm test                                   # Vitest, 20 files / 84 tests, 0 skipped
node scripts/socket-smoke.mjs              # 10 authenticated realtime checks
node scripts/media-matrix-smoke.mjs        # 122 media/authz checks
tsc --noEmit                               # app typecheck
npm run test:types                         # test-project typecheck
```

## 2. Results summary

| Suite | Result |
| --- | --- |
| Vitest (`npm test`) | **20/20 files, 84/84 tests passed, 0 skipped** |
| Realtime smoke (`socket-smoke.mjs`) | **10/10 passed** |
| Media matrix smoke (`media-matrix-smoke.mjs`) | **122/122 passed** |
| App typecheck (`tsc --noEmit`) | clean |
| Test typecheck (`test:types`) | clean |
| Production build (`next build` + esbuild server) | success, 75 pages generated |

## 3. Feature status

### VERIFIED — live server + real MySQL

| Area | Evidence |
| --- | --- |
| Email/password registration, login, logout, session cookie | tests/12 |
| Dev email verification token flow (single-use, hashed) | tests/12 |
| Conversations: create, list, membership authorization | tests/13 |
| Persistent messaging: send, list, threads, idempotent `clientNonce` replay | tests/13, media smoke (replay check) |
| All attachment families persist & reload cross-device — image, video, audio, **voice note**, document, location (with lat/lng range validation), contact card, **poll votes** (`/api/messages/[messageId]/poll`) | tests/14, media matrix 122 checks, DB rows in `media`/`messages` |
| Private storage: magic-byte sniffing, MIME never trusted, size cap, ownership/membership enforcement, no public directory | tests/04, tests/14, media matrix |
| Contact request flow: send, list pending (`{request, from}`), accept, self-exclusion in user search | tests/15 |
| User directory search — SQL-side filtering (email/handle exact, displayName/handle prefix, wildcard-escaped LIKE), LIMIT 10; real 50-row truncation bug found and fixed | tests/15, two-user live probe |
| Authenticated Socket.IO handshake; anonymous handshake rejected | tests/16, socket smoke |
| Realtime message delivery to conversation members; non-members receive nothing | tests/16, socket smoke |
| 1:1 call signaling: offer/answer/ICE, state machine, hang-up, every event membership-checked; relay blocked for non-participants | tests/17, socket smoke |
| Server-persisted workspace data (no localStorage authority for messages/users/contacts/CRM) | tests/18 |
| Notifications: nullable `readAt`, mark-read persistence | tests/19 |
| Legacy/local data export and server-side import (force replace), including legacy message `id` mapping | tests/20, tests/10 |
| Health checks (liveness, MySQL/storage deep checks) | tests/12 |
| Settings → Data tab: server backup download, legacy-file import, local-only reset clearly labelled | live build + typecheck |

### UNIT-VERIFIED — automated, no external service

| Area | Evidence |
| --- | --- |
| Password hashing (scrypt), token sign/verify/expiry | tests/01, tests/02 |
| Zod request schemas and boundary rejection | tests/03 |
| Rate limiter behavior (429, window, identity) | tests/05 |
| Same-origin / CSRF header guard | tests/06 |
| API client error envelope (`ApiError.status`, correlation id) | tests/07 |
| API ↔ UI message mapper contract | tests/08 |
| Realtime event contract typings | tests/09 |
| Local migration mapping logic | tests/10 |
| Voice recorder capability detection | tests/11 |

### BLOCKED — cannot verify in this sandbox (no credential/service)

| Feature | Why blocked | What exists today |
| --- | --- | --- |
| **Group calls (3+ participants)** | Requires an SFU; LiveKit not provisioned (`LIVEKIT_*` unset) | 1:1 engine fully working; group UI surfaces an explicit "unavailable" state instead of misrouting |
| **TURN relay for restrictive NATs** | No TURN server credentials; only STUN configured | 1:1 calls verified on open/STUN-reachable networks; cross-device media under symmetric NAT is UNVERIFIED. Set `TURN_URLS` per DEPLOYMENT.md §8 |
| **Multi-instance deployment (Redis pub/sub + distributed limits)** | No Redis reachable | Single-instance in-memory path verified; Redis adapter code activates via `REDIS_URL` |
| **Real email delivery (verification, password reset)** | No SMTP service | Emails are logged server-side with single-use hashed tokens; set `SMTP_URL` to activate |
| **S3-compatible media driver** | No bucket credentials in sandbox | Local private-storage driver fully verified; S3 driver (`MEDIA_DRIVER=s3`, presigned GET) is implemented but not exercised live |
| **Third-party AI / translation / messaging integrations** | External accounts not connected | Local engines only; connected-provider features remain opt-in behind env config |

### Environment caveat

Tests ran against MySQL **5.7.29** because that is the disposable server
available offline in this sandbox. Schema and migrations are written for and
target **MySQL 8.x** in production (see `DEPLOYMENT.md` §4). MySQL-8-specific
behavior is therefore not yet exercised by an automated run; the first staging
deploy on MySQL 8 should re-run `npm test` and both smoke scripts.

## 4. Defects found and fixed during verification

1. **User search silently truncated beyond 50 rows** — the service fetched 50
   active users then filtered in JavaScript, so any match outside that window
   was unfindable. Rewritten as SQL-side filtering with escaped LIKE wildcards
   and LIMIT 10 (`src/server/services/profile.service.ts`). Reproduced before
   the fix and confirmed after via a two-user live probe.
2. **Location payloads accepted impossible coordinates** — Zod now enforces
   lat ±90 / lng ±180 (`src/server/services/messages.service.ts`).
3. Test-suite defects (wrong response-shape assumptions in tests 15/17/19/20,
   mock typings in 07/10) — corrected to match the actual API contracts; no
   application code was bent to fit a test.

## 5. Reproduce

```bash
npm ci
npm run db:migrate
npm run build && npm run build:server
NODE_ENV=production node --env-file=.env dist/server/index.cjs
# another shell:
npm test
node scripts/socket-smoke.mjs
node scripts/media-matrix-smoke.mjs
```

HTTP integration tests connect to `FC_BASE_URL` (default
`http://localhost:3000`). When no server is reachable they **skip with an
explicit reason** — they never fake a pass.
