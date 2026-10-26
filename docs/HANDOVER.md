# Handover

What this is, how to run it, how to deploy it, what was verified, and what is
still not true. Written so the next person does not need to read the code first.

---

## 1. What the product is

FriendConnect is a self-hosted workspace with **44 module routes across 10
pillars** plus a public marketing site, and **one AI operator that can drive all
of them**.

Three things distinguish it:

1. **It works without a model.** The operator has a deterministic grammar, so
   "add contact Jane Okafor at Northwind, jane@northwind.dev" creates a real
   contact with no API key, no GPU and no network.
2. **It works without a database.** The workspace is local-first — contacts,
   deals, students, exams, notes, threads and reports live in the browser. A
   database is only needed for accounts, media and cross-device messaging, and
   those routes say so honestly instead of failing silently.
3. **The AI is not a chat window beside the product.** It is a registry of 55
   typed tools with schemas, risk levels and an approval gate; if a capability is
   not a tool, the AI cannot do it, and if it is a tool, a human can do it too.

---

## 2. Run it locally

```bash
git clone https://github.com/engralaminn-collab/friendconnect
cd friendconnect
npm ci
cp .env.example .env.local       # optional; defaults work
npm run dev                      # http://localhost:3000
```

Then open:

| Route | What to look at |
| --- | --- |
| `/app` | the workspace home with all 44 modules in the sidebar |
| `/app/bill-agent` | the operator — start on **Operate**, type `status` |
| `/app/exam` | the computer-based test — pick a paper and sit it |
| `/app/messenger` | the messaging surface |

No account is needed for the workspace. `/login` and `/register` exist for the
database-backed features (accounts, media, realtime).

---

## 3. Deploy it

```bash
ssh alamin@103.231.239.79
cd /home/alamin/projects/friendconnect
git pull --ff-only
./scripts/deploy-alo-server.sh
```

Host facts, the `.env.local` block, the nginx vhost, the Cloudflare rules that
matter (SSL must be **Full (strict)**) and the rollback procedure are in
[docs/SERVER-SPEC.md](docs/SERVER-SPEC.md). The short version: PM2 app
`friendconnect`, port `3012`, `panel.alolabs.net`.

---

## 4. Operate it as Bill Agent

**In the UI** — `/app/bill-agent → Operate`. Type a task, watch each step, approve
anything that writes, stop whenever you like. The Tools tab runs any single tool
by hand with a schema-driven form.

**From a script or another agent** — the HTTP control surface:

```bash
export TOKEN=<AGENT_TOKEN from .env.local>

# what can it do?
curl -s https://panel.alolabs.net/api/agent/manifest | jq '.tools | length'

# ask it to do something
curl -s -X POST https://panel.alolabs.net/api/agent/commands \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"tool":"create_task","args":{"title":"Follow up with Meridian","priority":"high"}}'

# see what came back
curl -s "https://panel.alolabs.net/api/agent/commands?all=1" \
  -H "Authorization: Bearer $TOKEN"
```

The queue is drained by an open `/app/bill-agent` tab, because only the browser
holds workspace state. Keep one tab open on a machine you control.

**Sit and mark an exam without touching the UI**

```bash
curl -s -X POST .../api/agent/commands -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"tool":"list_exam_papers","args":{}}'
# then: start_exam_attempt → the learner writes → grade_exam_attempt
```

---

## 5. Add an open-source provider

`/app/bill-agent → Providers`. Pick Ollama (or vLLM, llama.cpp, LocalAI, LM Studio,
TGI), paste the base URL, press **Test**, then **Use**.

```bash
ollama serve
export OLLAMA_ORIGINS="http://localhost:3000,https://panel.alolabs.net"
ollama pull qwen2.5:7b-instruct
```

Base URL `http://127.0.0.1:11434`. Exact commands for every runtime, model advice
and the probe-failure table are in
[docs/OPEN-SOURCE-PROVIDERS.md](docs/OPEN-SOURCE-PROVIDERS.md).

> The provider slot is deliberately open: adding a runtime is a data change in
> `src/lib/agent/providers.ts`, never a code path. No model id is hard-coded into
> a tool.

---

## 6. Verified — with the exact commands

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | clean |
| Lint | `npx eslint .` | 0 errors |
| Build | `npm run build` | exit 0, all routes generated |
| Tests | `npm test` | **155 passed, 29 skipped** |
| Routes | curl sweep over every `/app/*` | all 200 |
| Control API | POST → list → settle → 404 on unknown → DELETE | as designed |
| CSS | fetched the compiled stylesheet | `.fc-card`, `.btn-primary`, `bg-brand-50`, `text-violet-700` all present |

The 29 skips are the HTTP integration suites. Their gate is a `/api/health` that
returns 200, which needs a database; they skip rather than fake-pass. Run them
against a live box:

```bash
FC_BASE_URL=https://panel.alolabs.net npx vitest run tests/*.http.test.ts
```

---

## 7. What is **not** verified — read this before promising anything

| Area | Status |
| --- | --- |
| TURN/STUN calls across networks | NOT VERIFIED — no TURN server was available. Same-network WebRTC works. |
| Mobile call path (Lyra/native) | NOT VERIFIED — no device. |
| Push notifications | PENDING — needs VAPID keys. |
| Transactional email | PENDING — needs SMTP. |
| PostgreSQL / MySQL / Redis | UNCONFIGURED here; the health endpoint reports them as `error`/`unconfigured` rather than green. |
| `prisma generate` | Cannot reach its binary host in the build sandbox, so the build ran against a local client stub. It runs normally on a networked machine. |
| Visual/browser pass | Not done — no browser binaries. UI verification is SSR HTML, route status codes and the compiled CSS. |
| Node version | Verified on Node v22.22.3; the server spec targets v24.22.1. |

---

## 8. Deliberate limits (not bugs)

- **The remote queue is server memory** with a five-minute TTL and is drained by
  an open tab. A restart drops pending commands. The alternative — a server
  mutating state behind the operator's back — was rejected on purpose.
- **The audit trail is browser-local**, capped at the last 500 entries, exportable
  as JSON or CSV. Clearing site data clears it.
- **No multi-user sync.** Two browsers are two workspaces.
- **The workspace is not behind auth by default** (`WORKSPACE_REQUIRES_AUTH=0`),
  because it is local-first and calls no authenticated API. Flip it to `1` on a
  shared deployment.
- **The operator cannot exceed its 55 tools.** That is the safety property, not a
  missing feature.

---

## 9. Where things live

```
src/lib/agent/        registry, runtime, providers, offline grammar, store
src/components/agent/ the seven tabs, approval dialog, run hook
src/app/api/agent/    manifest, command queue, settle
src/app/app/exam/     the exam room
src/lib/exam.ts       the marking engine (pure, tested)
src/lib/data/exams.ts the papers
src/store/useStore.ts the workspace (44 modules share it)
src/app/app/          the module routes
src/middleware.ts     auth gate (opt-in for /app)
docs/                 BILL-AGENT · OPEN-SOURCE-PROVIDERS · SERVER-SPEC
scripts/deploy-alo-server.sh
worklog.md            chronological build log, including failures
```

---

## 10. First three things to do on the server

1. Set `AGENT_TOKEN` in `.env.local`, then `./scripts/deploy-alo-server.sh`.
2. Open `https://panel.alolabs.net/app/bill-agent`, type `status`, confirm the
   steps run and the audit fills up.
3. Open `/app/exam`, sit the 15-minute placement paper, and check that the band
   appears in the history. That single path exercises the store, the marking
   engine and the operator's read path at once.
