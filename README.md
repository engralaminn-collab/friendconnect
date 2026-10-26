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
npm run build       # next build → 60 static pages
npm start           # production server on 0.0.0.0:3000
```

---

## What is in it

**44 module routes across 10 pillars**, one AI operator that can drive all of them,
plus a public marketing site.

### Operator
| Module | What it does |
| --- | --- |
| `/app/bill-agent` | **Bill Agent**, the one AI that operates the workspace — 55 validated tools across CRM, education, marketing, knowledge, messaging, studios and community. Seven tabs: **Operate** (tool-calling chat with an approval dialog, autonomy policy, step/time budgets and dry run), **Tools** (all 55 tools, their JSON schemas and a form that runs any of them by hand), **Automations** (named tool calls on a manual/on-open/daily/weekly rhythm), **Providers** (15 endpoints, open-source first — Ollama, vLLM, llama.cpp, LocalAI, LM Studio, TGI, OpenRouter, Groq, Together, DeepSeek, Mistral, Fireworks, Cerebras, Novita, or any OpenAI-compatible gateway, each with a real connection probe), **Control API** (manifest, curl, enqueue and queue state), **Runs & audit** (per-run steps with arguments, exportable JSON/CSV) and **Deployment** (server spec, deploy script, `.env`, live health check). Works with no model at all: a deterministic grammar handles 20 classes of task offline. See [docs/BILL-AGENT.md](docs/BILL-AGENT.md) and [docs/OPEN-SOURCE-PROVIDERS.md](docs/OPEN-SOURCE-PROVIDERS.md) |

### Messaging & Calls
| Module | What it does |
| --- | --- |
| `/app/messenger` | WhatsApp-style client: thread list with pin/mute/archive/search, reply quotes, reactions, starred messages, polls with live tallies, voice-note recorder with level meter, emoji picker, sticker keyboard, attachment menu (image · video · document · audio · location · contact · poll), media lightbox, per-thread search, read receipts, typing indicator, threaded replies, smart replies, an offline four-language translator, saved messages with notes, a notification feed, pinned-message view, a thread-scoped AI assistant, flag/report, kid-safe mode with guardian controls, and a Gibber sound-level channel for agent-to-agent traffic. The right rail carries the AI marketing CRM panel with lead score and next best action |
| `/app/calls` | Twelve-key dialpad, call history with direction/duration/outcome, MOS and latency trend charts, microphone/camera/speaker profiles with a saved default, a packet-diagnostics modal (RTT, jitter, loss, MOS), a catalogue of native reference implementations (WebRTC Kotlin, VoIP Call Sample, Android Java Chat, Linphone iPhone, Linphone Core, a SIP↔WebRTC gateway and a recording pipeline), a browser-vs-native coverage matrix and the operational limits |
| `/app/gateways` | Five live gateways — HTTP SMS, Domovina AI, ComfyUI, SIP and a webhook bridge. SMS console with cURL / Node SDK / raw JSON previews of the exact request, inbound-webhook routing with signature checks and retry rules, a ComfyUI prompt queue that shares the render straight into a chat, and a promise-based IPC console with per-channel latency and error stats |
| `/app/callcenter` | A contact centre in six tabs — live desk (diarised transcript, PII redaction, live sentiment, assist cards, coaching nudges, talk-ratio/WPM/monologue metrics, supervisor wallboard), post-call (summary, key points, action items, risk flags, redacted transcript, six-axis QA scorecard, entity/topic/PII extraction), bot flow (scripted phases, tool catalogue, transitions, refusal examples, channels and resumable-conversation rules, one-CDR-per-conversation), outbound (recipes, scheduler, consent gate with requested-vs-permitted fields, batch runner, unreached-vs-voicemail accounting), integrations (workflow plugins, event names, MCP catalogue, inline JSON result) and prep & policy (meeting prep briefs, setup wizard with probing questions and a dynamic checklist, calendar sync, transcript reliability gate, recording history with bookmarks and markdown export, policy limits and MCP auto-trigger) |

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
| `/app/exam` | **Computer-based exam room**: timed IELTS Academic, TOEFL iBT and placement papers with a section countdown, question palette, flags, autosaved drafts, live word counts and writing checks, auto-marked objective sections, 1–9 self-assessment for writing and speaking blended into the final band, CEFR mapping, per-question review with explanations, and a band-scored attempt history. Listening scripts are read aloud by the browser's speech engine |
| `/app/tutor` | A voice-first English tutor that runs entirely on your own machine — seven CEFR levels, a local record→recognise→reason→synthesise speech pipeline, word-level highlighting with 0.8×/1.0×/1.2× playback, an offline dictionary with pronunciation, four exercise types, a 60-point pass mark, a buddy that evolves from an egg to a dragon, multi-learner profiles and certificates. The exam lab adds TOEFL/IELTS/TOEIC tracks, a masked-language cloze with a deterministic offline scorer, reflection reports and issued certificates |

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
| `/app/research` | Crawl a page into clean markdown, then deep research that reads eight pages and cites every fact it keeps. A second tab documents the **molx** self-hosted crawl API — every endpoint, request and response body, the thirteen environment variables, the Brave/DuckDuckGo/Startpage engines, the deployment recipes and the Firecrawl comparison |
| `/app/swarm` | Multi-agent simulation: extract a weighted entity graph from seed text, generate personas with their own archetype, bias, speed and influence, run the conversation round by round, then read the focus-group report — sentiment, topic share, the people who moved the room, the opinion shift and the convergence score. Every run is reproducible from its seed |
| `/app/logistics` | Air/sea/road/rail shipments, carriers, customs holds, incoterms, cargo value and a customs checklist |
| `/app/builder` | Low-code dashboard builder — seven widget types, nine datasets, drag from the palette, save and reload |

### Platform & AI
| Module | What it does |
| --- | --- |
| `/app/chatkit` | The component inventory behind the messenger — 43 components across 7 families with live previews for 24 of them, platform parity for React/Angular/React Native/iOS/Android/Flutter, 17 theme tokens in four spellings, 10 locales (two right-to-left), the 10-point accessibility contract with focus order and screen-reader wording, 18 extensions, and a session tab covering server-minted tokens, the six presence states and the surface contract for the details panel, typing indicator, unread badge and conference call |
| `/app/skills` | The pack that teaches an AI coding agent to build the messenger — 24 skills across 13 families, the four-stage onboarding journey (discover → understand → plan → approve), per-platform contract files, 12 iterative commands, four MCP servers including the read-only documentation server with its tool catalogue and prompt recipes, and the community contribution contract (four contribution areas, three folder templates, six rules of contribution and the resource-entry format) |
| `/app/testing` | Test generation from plain English acceptance criteria — Robot Framework suites, pytest modules and a test-case sheet, with local or cloud providers, a generation log, coverage breakdown, five safe defaults and the project layout |
| `/app/glossary` | The AI coding dictionary — 60+ terms across 8 categories, each with a plain-English explanation, cross links and a see-also line |

### Public site
`/` · `/features` · `/templates` · `/showcase` · `/marketing-kit` ·
`/pricing` · `/blog` · `/blog/[slug]` · `/about` · `/contact`

---

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/BILL-AGENT.md](docs/BILL-AGENT.md) | The operator: tool registry contract, run loop, offline grammar, control API, safety, limits |
| [docs/OPEN-SOURCE-PROVIDERS.md](docs/OPEN-SOURCE-PROVIDERS.md) | 15 providers, exact local setup commands, model advice, probe troubleshooting, how to add one |
| [docs/SERVER-SPEC.md](docs/SERVER-SPEC.md) | The `panel.alolabs.net` host, deploy, environment, nginx, Cloudflare, rollback |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Framework-level deployment reference (database, media, realtime, email, backup) |

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

**Gibberlink** (`src/lib/gibberlink.ts`) — a sound-level protocol for
agent-to-agent traffic. A handshake confirms both sides are agents, the payload
is framed with a length header and a checksum, base64-encoded and mapped onto
64 tone symbols; each symbol resolves to a frequency pair, so the same token can
be rendered as a tone sequence and read back from the waveform. Decoding is
exact, or it reports why it could not.

**Test generator** (`src/lib/robot.ts`) — plain-English acceptance criteria in,
three artefacts out: a Robot Framework suite, a pytest module and a test-case
sheet with steps, expected results and priority. Cases are derived from the
sentences in the criteria, validated for syntax before they are written, and
tagged as smoke, functional, regression, edge or negative.

**Swarm engine** (`src/lib/swarm.ts`) — entity extraction into a weighted
graph, persona generation with archetype, bias, reaction speed and influence, a
round-by-round simulation with sentiment and topic propagation, and a
focus-group report. Seeded end to end: the same seed always produces the same
run, with no model in the loop.

**Tutor engine** (`src/lib/tutor.ts`) — sentence analysis that finds articles,
plural errors, subject-verb agreement problems, preposition slips and informal
contractions, then writes the correction the way a teacher would say it, one
thing at a time, with a CEFR estimate and a confidence score.

**Call-centre engine** (`src/lib/callcenter.ts`) — PII redaction across eleven
pattern families, sentiment and topic extraction, talk-ratio / words-per-minute /
monologue metrics, coaching nudges, a six-axis QA scorecard, post-call
summaries, a phase-based bot flow with tool-driven transitions, outbound recipes
with a consent gate that strips fields the contact never permitted, workflow
plugins and an MCP tool catalogue.

**Offline translator** (`src/lib/translate.ts`) — a curated phrase table and a
word table for Bengali, Spanish, French and Arabic. Longest phrases match
first, and anything it cannot translate is reported rather than silently
dropped.

**Transcript reliability gate** (`auditTranscript` in `src/lib/callcenter.ts`) —
an offline auditor that grades a transcript RELIABLE, SUSPECT or UNUSABLE from
the symptoms visible in the text: a repetition loop, a boilerplate phantom, a
single speaker, an unescalated harm category, a truncated ending and low
lexical diversity. It reports what it saw and stops there — it is not a
certificate of accuracy.

**Masked-language cloze** (`predictMasked` in `src/lib/tutor.ts`) — a
deterministic stand-in for a masked-language model. It scores each candidate
against the surrounding context using topical affinity, morphological
similarity and a stable tiebreak, then returns a ranked list with the
confidence and the margin. Deterministic, offline, and honest about what it is.

---

## Architecture

```
src/
  app/
    layout.tsx          root layout, theme script, toaster, ⌘K palette
    page.tsx            marketing home
    features/ marketing-kit/ showcase/ pricing/ templates/ blog/ about/ contact/
    app/                workspace shell + 44 module routes
    api/agent/          manifest, command queue, settle (Bill Agent control API)
  components/
    ui/                 Badge, Avatar, Progress, Toggle, Meter, Modal, Toaster, Reveal
    charts/             SVG charts: area, bar, donut, radar, funnel, heatmap, sparkline
    app/                Sidebar, Topbar, CommandPalette, PageHeader
    agent/              operator console, tool catalogue, providers, audit,
                        automations, control API, deployment panels
    marketing/          MarketingHeader, MarketingFooter, ProductMock
    studio/             DiagramCanvas, GeneratedArt
    messaging/          ChatBubble, CallOverlay, MediaViewer, ChatKitPreviews,
                        ComposerExtras, Panels, Safety, GibberChannel
    research/           MolxPanel
  lib/
    types.ts            every domain entity
    nav.ts              10 nav groups, 45 routes
    humanizer.ts        humaniser + SEO scorer + repurpose
    webrtc.ts           call engine, stats polling, MOS estimate
    ipc.ts              promise IPC bridge + desktop handlers
    gibberlink.ts       sound-level protocol: frame, checksum, encode, decode
    robot.ts            plain English → Robot Framework / pytest / test sheet
    swarm.ts            persona generation, graph extraction, simulation
    tutor.ts            sentence analysis, correction, tutor reply
    callcenter.ts       redaction, sentiment, QA scoring, flow, consent
    translate.ts        offline phrase + word translator for four languages
    agent/              Bill Agent: registry (50 tools), providers, offline
                        planner, bounded runtime, schema validation, store, queue
    data/               seed data for every module
  store/
    useStore.ts         one persisted domain store, ~75 CRUD actions
    useUI.ts            persisted UI state + useToast()
```

**State** — a single Zustand store persisted to `localStorage` under
`friendconnect-workspace-v1`. Every module reads and writes the same records, so
moving a deal updates the dashboard, the funnel and the forecast together.

**Styling** — Tailwind v4 with one design-token vocabulary: orange brand
(`#F97316`) → blue accent (`#2563EB`) → red signal on slate neutrals, class-based
dark mode, system font stacks (no webfonts), and the shared `fc-surface` /
`fc-line` / `fc-fg` tokens behind `fc-card`, `.btn`, `.field` and `.chip`
primitives. Every dashboard uses those primitives, so light and dark mode are
defined once in `globals.css` rather than per page.

**Offline by design** — no CDN, no webfont, no analytics, no cookies. The
in-app preview renders the complete product with no network access.

---

## Verification

- `npx tsc --noEmit` — clean, strict mode
- `npx eslint .` — 0 errors
- `npm run build` — every route generated, including the seven Bill Agent tabs
- `npm test` — 155 passed, 29 skipped. The 29 skips are the HTTP integration
  suites: their gate is a `/api/health` that returns 200, which needs a database,
  so they skip rather than fake-pass. The 84 Bill Agent and exam tests cover the
  registry contract, argument validation, the run loop's four stop conditions,
  every write tool against both an in-memory workspace and the real store, both
  provider wires, the offline grammar, the exam marking tables and the exam
  tools
- Production server: `/app/bill-agent`, `/app`, `/app/messenger`, `/legal/*`,
  `/api/agent/manifest` and `/api/agent/commands` all answer 200; the queue
  accepts, lists and settles a command end to end
