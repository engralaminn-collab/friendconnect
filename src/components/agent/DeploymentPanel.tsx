"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  PlayCircle,
  Server,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/store/useUI";
import { CopyButton, SectionTitle } from "./widgets";

const SPEC: Array<[string, string]> = [
  ["Host", "103.231.239.79 — Ubuntu 22.04 LTS"],
  ["Runtime", "Node.js v24.22.1 (NVM) · npm 11.19.1"],
  ["Process manager", "PM2 7.1.1 — app name “friendconnect”"],
  ["Reverse proxy", "Nginx 1.18.0 → 127.0.0.1:3012"],
  ["Domain", "panel.alolabs.net (Cloudflare proxied)"],
  ["TLS", "Cloudflare origin certificate (Full/Strict), Let’s Encrypt optional"],
  ["Framework", "Next.js 16 · App Router · standalone output"],
  ["Data", "SQLite for one box · PostgreSQL 14 / MySQL 8 shared"],
  ["Cache", "Redis 6 optional — realtime fan-out and rate limits"],
  ["Logs", "/home/alamin/.pm2/logs/friendconnect-*.log"],
];

const DEPLOY_SCRIPT = `#!/usr/bin/env bash
# Deploy this repository to panel.alolabs.net on port 3012.
set -euo pipefail

APP=friendconnect
DOMAIN=panel.alolabs.net
PORT=3012
ROOT=/home/alamin/projects/$APP

cd "$ROOT"
git fetch --all --prune
git checkout main
git pull --ff-only

npm ci
npx prisma migrate deploy      # or: npm run db:push on a fresh box
npm run build

pm2 describe "$APP" >/dev/null 2>&1 \\
  && PORT=$PORT pm2 restart "$APP" --update-env \\
  || PORT=$PORT pm2 start npm --name "$APP" -- start
pm2 save

sudo tee /etc/nginx/sites-available/$DOMAIN >/dev/null <<NGINX
server {
  listen 80;
  server_name $DOMAIN;

  client_max_body_size 50m;

  location / {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \\$host;
    proxy_set_header X-Real-IP \\$remote_addr;
    proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \\$scheme;
    proxy_set_header Upgrade \\$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
  }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
sudo nginx -t
sudo systemctl reload nginx

echo "deployed → http://127.0.0.1:$PORT"
curl -fsS "http://127.0.0.1:$PORT/api/health" | head -c 400 || true`;

const ENV_BLOCK = `NODE_ENV=production
APP_URL=https://panel.alolabs.net
# SQLite (single box)
DATABASE_URL=file:./data/friendconnect.db
# or MySQL 8 / PostgreSQL 14 on a shared box
# DATABASE_URL=mysql://friendconnect:***@127.0.0.1:3306/friendconnect

AUTH_SECRET=$(openssl rand -base64 48)
MEDIA_DRIVER=local
MEDIA_LOCAL_DIR=/home/alamin/data/friendconnect-media

# Bill Agent control API — set this before exposing /api/agent/*
AGENT_TOKEN=$(openssl rand -hex 32)

# Optional: realtime fan-out and push
REDIS_URL=redis://127.0.0.1:6379

# Optional: TURN for cross-network calls
TURN_SERVERS=turn:103.231.239.79:3478
TURN_SECRET=***
TURN_REALM=alolabs.net`;

export function DeploymentPanel() {
  const toast = useToast();
  const [health, setHealth] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const payload = await response.json();
      setHealth(JSON.stringify(payload, null, 2));
      if (response.ok) toast.success("Health endpoint answered", payload.status ?? "ok");
      else toast.warning("Health endpoint is degraded", payload.status ?? "see report");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setHealth(message);
      toast.error("Health check failed", message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="fc-card p-4 sm:p-5">
        <SectionTitle
          title="Where this runs"
          description="The deployment this workspace is specified for, plus the two commands that put a change live. Keep this page open during a deploy — the health check below reports what the running box actually answers."
          actions={
            <>
              <button type="button" onClick={() => void check()} disabled={checking} className="btn btn-sm">
                {checking ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
                Check this deployment
              </button>
              <CopyButton value={DEPLOY_SCRIPT} label="Copy deploy script" />
            </>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {SPEC.map(([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--fc-fg-subtle)]">
                {label}
              </span>
              <span className="text-right text-[12px] font-medium">{value}</span>
            </div>
          ))}
        </div>
        {health && (
          <pre className="fc-scroll-thin mt-3 max-h-64 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3 font-mono text-[10.5px]">
{health}
          </pre>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="fc-card p-4 sm:p-5">
          <SectionTitle title="Deploy script" description="Idempotent: restarts the app if it exists, starts it if not." />
          <pre className="fc-scroll-thin max-h-[420px] overflow-auto rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3 font-mono text-[10.5px] leading-relaxed">
{DEPLOY_SCRIPT}
          </pre>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-[var(--fc-fg-muted)]">
            <Server className="mt-0.5 size-3.5 shrink-0" />
            This repository ships the same script at{" "}
            <code className="font-mono text-[10.5px]">scripts/deploy-alo-server.sh</code>. Run it from
            the repository root, not from <code className="font-mono text-[10.5px]">~/</code>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="fc-card p-4 sm:p-5">
            <SectionTitle title="Environment" description="Everything the app reads. No secret is baked into the build." />
            <pre className="fc-scroll-thin max-h-[260px] overflow-auto rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3 font-mono text-[10.5px] leading-relaxed">
{ENV_BLOCK}
            </pre>
            <div className="mt-2">
              <CopyButton value={ENV_BLOCK} label="Copy .env" />
            </div>
          </div>

          <div className="fc-card p-4 sm:p-5">
            <h3 className="flex items-center gap-1.5 font-display text-[13px] font-bold">
              <ShieldCheck className="size-3.5" /> Go-live checklist
            </h3>
            <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed">
              {[
                "AGENT_TOKEN set before /api/agent/* is reachable from the internet.",
                "Cloudflare proxied (orange cloud) with SSL mode Full or Strict.",
                "Nginx client_max_body_size raised above the media upload limit.",
                "Backups: scripts/backup.sh on a daily cron, restore rehearsed once.",
                "PM2 startup + pm2 save so the app survives a reboot.",
                "Health endpoint watched: /api/health, /api/webrtc/health.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <p className={cn("mt-2 flex items-start gap-1.5 rounded-lg bg-[var(--fc-surface-2)] p-2 text-[11px] text-[var(--fc-fg-muted)]")}>
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <span>
                <Globe className="mr-1 inline size-3" />
                Cloudflare Flexible rewrites the origin scheme to http. Set the Cloudflare SSL mode to
                Full (strict) and install an origin certificate, or session cookies marked Secure will
                be dropped and browser calls will fail intermittently.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
