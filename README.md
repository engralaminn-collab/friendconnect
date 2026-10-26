# FriendConnect

An all-in-one workspace for consultancies, education agencies and community
teams — built with Next.js 15, React 19, TypeScript and Tailwind v4.

At its centre is a **private communication workspace**: a messenger with every
media type, real WebRTC audio and video calls, and the SMS / ComfyUI / SIP /
IPC gateways that carry it.

Every module runs entirely in the browser. No backend, no API keys, no external
assets. The whole product is a static export you can host anywhere.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run typecheck   # tsc --noEmit
npm run build       # next build → 53 static pages
npm start           # production server on 0.0.0.0:3000
```

---

## What is in it

**37 workspace modules across 8 pillars**, plus a 9-page public marketing site.

### Messaging & Calls
| Module | What it does |
| --- | --- |
| `/app/messenger` | WhatsApp-style client: thread list with pin/mute/archive/search, reply quotes, reactions, starred messages, polls with live tallies, voice-note recorder with level meter, emoji picker, attachment menu (image · video · document · audio · location · contact · poll), media lightbox, per-thread search, read receipts, typing indicator, and an AI marketing CRM panel with lead score and next best action |
| `/app/calls` | Twelve-key dialpad, call history with direction/duration/outcome, MOS and latency trend charts, microphone/camera/speaker profiles with a saved default, and a packet-diagnostics modal (RTT, jitter, loss, MOS) |
| `/app/gateways` | Five live gateways — HTTP SMS, Domovina AI, ComfyUI, SIP and a webhook bridge. SMS console with cURL / Node SDK / raw JSON previews of the exact request, inbound-webhook routing with signature checks and retry rules, a ComfyUI prompt queue that shares the render straight into a chat, and a promise-based IPC console with per-channel latency and error stats |

### CRM & Revenue
| Module | What it does |
| --- | --- |
| `/app/contacts` | Searchable, sortable contact table with CSV export, create modal, detail drawer, stage moves and starring |
| `/app/companies` | Accounts with firmographics, industry donut, largest-account ranking |
| `/app/pipeline` | Six-stage drag-and-drop kanban with weighted forecast, stage funnel and closing-soon sidebar |
| `/app/leads` | ICP rules, animated enrichment, rescoring, promote-to-CRM, JSON export |
| `/app/activities` | Unified activity timeline and task list with overdue handling |

### Education Consultancy
| Module | What it does |
| --- | --- |
| `/app/students` | Enquiry-to-enrolment cards, country mix, pipeline value, status moves |
| `/app/applications` | Status chips, per-application document checklist with third-party blockers, deadline risk, "where it stalls" analysis |
| `/app/universities` | University catalogue with rankings, scholarships, per-year tuition, intakes, course requirements, tuition chart |
| `/app/study` | Focus timer that auto-logs sessions, weekly plan, confidence tracking, skill radar |

### AI Marketing
| Module | What it does |
| --- | --- |
| `/app/content` | Library, markdown editor, 8-check SEO inspector, humaniser report, one-click repurpose into every channel |
| `/app/campaigns` | Channel filters, sent/open/click/convert funnel, budget and cost-per-conversion |
| `/app/social` | Six-platform planner (LinkedIn, X, Instagram, Facebook, TikTok, YouTube) with character limits, scheduling and a hook library |
| `/app/seo` | Page audits with remediation detail, radar and failure donut, simulated scan |

### Studios
| Module | What it does |
| --- | --- |
| `/app/diagrams` | Node palette, drag canvas, edge linking with labels, inspector, five templates, SVG and Mermaid export |
| `/app/video` | Scene timeline, hook library, caption generation, SRT export, production checklist |
| `/app/voice` | Six voice profiles, real `SpeechSynthesis` playback with word highlighting, deterministic waveform, clip library |
| `/app/agents` | Bounded tool-calling loops with four independent stop conditions — goal predicate, step budget, repetition guard, wall-clock budget |
| `/app/image` | Prompt builder, six models compared on cost/quality/speed, prompt library, four ComfyUI-style workflow graphs, deterministic offline rendering |
| `/app/models` | Twelve models across six providers, side-by-side answers with per-model cost, and a smart router that picks the cheapest model that can do the job |

### Knowledge
| Module | What it does |
| --- | --- |
| `/app/notes` | Tagged working memory with pinning, markdown editor, full-text search, export |
| `/app/wiki` | Canonical pages with categories, cross-links, summaries and an inline editor |
| `/app/apis` | Curated public APIs with auth/CORS metadata and an in-browser request bench that simulates latency and rate limits |
| `/app/plugins` | Marketplace with install/uninstall, categories, ratings and a security explainer |

### Community
| Module | What it does |
| --- | --- |
| `/app/community` | Feed with topics, tags, reactions, pinned posts and top contributors |
| `/app/inbox` | SMS, WhatsApp, email and VoIP threads with unified read state, CRM context panel and quick replies |
| `/app/events` | Workshops, webinars, deadlines and launches with a seven-day view |
| `/app/settings` | Profile, appearance, integrations (including live gateway state), notifications, API keys, RSS feeds and data export/reset |

### Insights & Operations
| Module | What it does |
| --- | --- |
| `/app/radar` | Live market signals with impact and confidence, five competitor profiles, seasonal forecasts with explicit confidence bands |
| `/app/research` | Crawl a page into clean markdown, then deep research that reads eight pages and cites every fact it keeps |
| `/app/logistics` | Air/sea/road/rail shipments, carriers, customs holds, incoterms, cargo value and a customs checklist |
| `/app/builder` | Low-code dashboard builder — seven widget types, nine datasets, drag from the palette, save and reload |

### Public site
`/` · `/features` · `/templates` · `/showcase` · `/marketing-kit` ·
`/pricing` · `/blog` · `/blog/[slug]` · `/about` · `/contact`

---

## The communication stack

### Call engine (`src/lib/webrtc.ts`)

A genuine `RTCPeerConnection` pair negotiated inside the page:

- Real SDP offer/answer and ICE candidate exchange between two peers.
- `getStats()` polled every second for `currentRoundTripTime`, inbound/outbound
  RTP jitter, packet loss, bitrate, packet counts and bytes.
- `estimateMos()` turns RTT, jitter and loss into an ITU-style MOS score.
- Mute, camera toggle, camera flip, screen share, speaker, hang up.
- When the browser refuses camera or microphone access — the normal case in a
  sandboxed preview — the engine falls back to a generated canvas stream and a
  synthesised audio track, so the call still connects, still negotiates and
  still reports real statistics.

### IPC bridge (`src/lib/ipc.ts`)

The `electron-promise-ipc` pattern: the renderer never touches the host API
directly, it awaits a promise that resolves with the handler's return value.

- Every request carries an id, so replies match, time out and report.
- `invoke` / `emit` / `on` with per-channel call count, error count and average
  latency.
- Nine registered channels: `app:info`, `app:window.minimise|maximise|close`,
  `dialog:openFile`, `clipboard:write`, `notification:show`, `media:enumerate`,
  `storage:usage`, `shell:openExternal`, `payload:encrypt`.
- The in-page transport is the only thing that changes when this moves into
  Electron — the API surface above it does not.

### Gateways

| Gateway | Provider shape | What the console shows |
| --- | --- | --- |
| HTTP SMS | one API key header, three-field JSON body | the exact cURL, the Node SDK call and the raw body |
| Domovina AI | agent-ready SMS gateway | inbound messages routed straight into a thread |
| ComfyUI | `POST /prompt`, poll `GET /history`, fetch the frame | a live queue that renders and shares into a chat |
| SIP | registrar, transport, codec list | signalling transports alongside the WebRTC path |
| Webhook | signed inbound payloads | routing decisions, signature checks and retry rules |

### AI marketing CRM

The messenger reads the same contact records as the CRM. Each conversation
shows a computed lead score (stage, recency and deal value), the last touch
time, the campaign touchpoints and a next-best-action recommendation. The
`Wand2` button in the composer runs the last inbound message through the six
humanising passes and reports the score change before you send it.

---

## Engines

**Humaniser** (`src/lib/humanizer.ts`) — six named passes:
remove clichés, cut hedging, break "not just X", drop filler openers, vary
sentence length, strip the summary paragraph. Returns per-pass hit counts plus
a before/after human score.

**SEO scorer** — eight weighted checks (title length, keyword in title, keyword
in first paragraph, 600+ words, H2 count, meta description length, internal
links, slug, keyword density) scored 0–100.

**Repurpose matrix** — one article into a carousel, an X thread, an email, a
LinkedIn post, a short script and video scenes.

**Generative artwork** (`src/components/studio/GeneratedArt.tsx`) — layered
blobs, grain and geometric overlays drawn deterministically from a prompt hash.
Same prompt, same picture, every time — with no network call.

---

## Architecture

```
src/
  app/
    layout.tsx          root layout, theme script, toaster, ⌘K palette
    page.tsx            marketing home
    features/ marketing-kit/ showcase/ pricing/ templates/ blog/ about/ contact/
    app/                workspace shell + 37 module routes
  components/
    ui/                 Badge, Avatar, Progress, Toggle, Meter, Modal, Toaster, Reveal
    charts/             SVG charts: area, bar, donut, radar, funnel, heatmap, sparkline
    app/                Sidebar, Topbar, CommandPalette, PageHeader
    marketing/          MarketingHeader, MarketingFooter, ProductMock
    studio/             DiagramCanvas, GeneratedArt
    messaging/          ChatBubble, CallOverlay, MediaViewer
  lib/
    types.ts            every domain entity
    nav.ts              8 nav groups, 37 routes
    humanizer.ts        humaniser + SEO scorer + repurpose
    webrtc.ts           call engine, stats polling, MOS estimate
    ipc.ts              promise IPC bridge + desktop handlers
    data/               seed data for every module
  store/
    useStore.ts         one persisted domain store, ~75 CRUD actions
    useUI.ts            persisted UI state + useToast()
```

**State** — a single Zustand store persisted to `localStorage` under
`friendconnect-workspace-v1`. Every module reads and writes the same records, so
moving a deal updates the dashboard, the funnel and the forecast together.

**Styling** — Tailwind v4 with the "Aurora" design system: indigo brand →
teal accent → amber signal on ink neutrals, class-based dark mode, system font
stacks (no webfonts), and shared `fc-card` / `.btn` / `.field` / `.chip`
primitives.

**Offline by design** — no CDN, no webfont, no analytics, no cookies. The
in-app preview renders the complete product with no network access.

---

## Verification

- `./node_modules/.bin/tsc --noEmit` — clean, strict mode
- `npm run build` — 53/53 static pages generated
- All 45 routes return HTTP 200 from the production server
