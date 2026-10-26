# Server specification and deployment

Everything needed to put this build on **panel.alolabs.net** and keep it there.
The short version is one command; the rest exists so nobody has to guess.

---

## 1. Host

| Item | Value |
| --- | --- |
| Public IPv4 | `103.231.239.79` |
| OS | Ubuntu 22.04 LTS |
| Node | v24.22.1 via nvm (`~/.nvm/versions/node/v24.22.1/bin`) |
| npm | 11.19.1 |
| PM2 | 7.1.1 |
| Nginx | 1.18.0 |
| Database (available) | PostgreSQL 14 · MySQL 8 · SQLite 3.37 |
| Cache (available) | Redis 6 |
| App directory | `/home/alamin/projects/friendconnect` |
| PM2 process | `friendconnect` |
| Internal port | `3012` |
| Public hostname | `panel.alolabs.net` |

> This app is local-first: the workspace, the exam room and Bill Agent keep
> their state in the browser. The Node process serves the UI, the API routes and
> the agent control surface. A database is only needed for accounts, media and
> the realtime/messaging APIs — those routes answer honestly when it is absent.

---

## 2. Deploy

```bash
ssh alamin@103.231.239.79
cd /home/alamin/projects/friendconnect
git pull --ff-only
./scripts/deploy-alo-server.sh
```

The script is idempotent and does, in order:

1. `npm ci --omit=dev=false` (falls back to `npm install` if no lockfile match)
2. `npx prisma generate` and `npx prisma migrate deploy` (tolerant: a missing
   database prints a warning and the deploy continues)
3. `npm run build`
4. `pm2 restart friendconnect || pm2 start ecosystem.config.cjs --only friendconnect`
5. `pm2 save`
6. writes `/etc/nginx/sites-available/panel.alolabs.net`, symlinks it into
   `sites-enabled`, removes the default site, `nginx -t`, `systemctl reload nginx`
7. `curl -fsS http://127.0.0.1:3012/api/health` and the manifest, then prints
   the Cloudflare checklist

Flags: `--skip-build` (config-only change), `--dry-run` (print the steps),
`--help`.

Environment overrides: `APP`, `DOMAIN`, `PORT`, `ROOT`.

---

## 3. Environment

`/home/alamin/projects/friendconnect/.env.local`:

```bash
NODE_ENV=production
PORT=3012

# Public origin — used for absolute links and CORS
NEXT_PUBLIC_SITE_URL=https://panel.alolabs.net
NEXT_PUBLIC_APP_URL=https://panel.alolabs.net

# Bill Agent control API. Set this before exposing the domain.
# Leave empty only on localhost.
AGENT_TOKEN=replace-with-a-long-random-string

# Workspace access: 0 = local-first (no login wall), 1 = session required
WORKSPACE_REQUIRES_AUTH=0

# Optional: email, push, media storage, database (see .env.example)
```

Generate a token:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

---

## 4. Nginx (written by the script)

```nginx
server {
    listen 80;
    server_name panel.alolabs.net;

    client_max_body_size 25m;

    location /api/agent/ {
        proxy_pass http://127.0.0.1:3012;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store";
    }

    location / {
        proxy_pass http://127.0.0.1:3012;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

WebSocket upgrade headers are present because Socket.IO is mounted at the same
origin; without them realtime degrades to polling and calls fail.

---

## 5. Cloudflare

| Setting | Value | Why |
| --- | --- | --- |
| SSL/TLS mode | **Full (strict)** | Flexible terminates TLS at the edge and rewrites the origin to `http`, which drops `Secure` cookies and breaks login. |
| Always Use HTTPS | On | — |
| WebSockets | On | realtime + calls |
| Cache rule | Bypass for `/api/*` | stale API responses are worse than slow ones |
| Cache rule | Cache `/ _next/static/*` | immutable assets |
| Bot fight mode | Off for `/api/agent/*` | it would block the bearer-token calls |

Origin certificate: Cloudflare Origin CA on the server, or Let's Encrypt with
`certbot --nginx`. Do not enable "Under Attack" while testing the control API —
it returns 403 to machine callers and looks like an auth bug.

---

## 6. Verification

```bash
# process and port
pm2 status friendconnect
ss -ltnp | grep 3012

# app
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3012/            # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3012/app/exam    # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3012/app/bill-agent  # 200

# health (states the database honestly)
curl -s http://127.0.0.1:3012/api/health | head -c 300

# agent control surface
curl -s http://127.0.0.1:3012/api/agent/manifest | head -c 200
curl -s -X POST http://127.0.0.1:3012/api/agent/commands \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $AGENT_TOKEN" \
  -d '{"tool":"list_exam_papers","args":{}}'

# logs
pm2 logs friendconnect --lines 80
tail -f /var/log/nginx/error.log
```

Through Cloudflare:

```bash
curl -sI https://panel.alolabs.net | head -3
curl -s https://panel.alolabs.net/api/agent/manifest | head -c 160
```

---

## 7. Operations

| Task | Command |
| --- | --- |
| Restart | `pm2 restart friendconnect` |
| Reload nginx | `sudo nginx -t && sudo systemctl reload nginx` |
| Logs | `pm2 logs friendconnect --lines 200` |
| Stop | `pm2 stop friendconnect` |
| Start after reboot | `pm2 startup && pm2 save` (once) |
| Back up media | `tar czf media-$(date +%F).tgz .private-media` |
| Backup database | `pg_dump` / `mysqldump` depending on `DATABASE_URL` |

### Rollback

```bash
cd /home/alamin/projects/friendconnect
git log --oneline -5
git checkout <previous-sha>
./scripts/deploy-alo-server.sh
```

The build is reproducible from the lockfile; no build artefacts are committed.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| 502 from Nginx | app not listening | `pm2 status`, `pm2 logs friendconnect` |
| Login loops back | Cloudflare Flexible | switch to Full (strict) |
| `/api/agent/*` returns 401 | `AGENT_TOKEN` set, header missing | send `Authorization: Bearer …` |
| `/api/agent/*` returns 403 | Cloudflare bot fight / WAF | allow the path for the calling IP |
| Health says `database: error` | no `DATABASE_URL` or DB down | expected on this local-first deploy; set it only if you use accounts |
| Blank page after deploy | stale build | `./scripts/deploy-alo-server.sh` (rebuild) |
| Queue commands expire | no operator tab open | open `/app/bill-agent` in one tab |
| Realtime drops after 60 s | WebSocket headers missing | re-run the script, `nginx -t` |

---

## 9. What is ready for other projects

The pattern used here is portable: one PM2 process per app, one Nginx vhost per
domain, a deploy script per app, a health endpoint that tells the truth, and an
`/api/agent/manifest` + `/api/agent/commands` pair so an agent can operate the
deployment's product surface without screen-scraping.

To reuse it for another project on the same box, copy
`scripts/deploy-alo-server.sh`, change `APP`, `DOMAIN`, `PORT`, and add the
project's own tool registry. Nothing else needs to change.
