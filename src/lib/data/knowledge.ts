import type { ApiDefinition, Note, Plugin, WikiPage } from "@/lib/types";
import { daysAgo } from "./common";

export const seedNotes: Note[] = [
  {
    id: "nt_w1",
    title: "Northwind pricing call — key moments",
    content: `**00:04** — Amara says attribution is "a war we gave up on".  
**00:11** — Procurement joins; wants annual with seat true-up, not per-seat.  
**00:23** — Asked about EU data residency. Hosted in EU region, confirmed.  
**00:31** — Decision: send revised contract Friday, target close within 18 days.

Follow-up questions:
1. Who owns the contract if they spin up a subsidiary?
2. Do we need a DPA on top of the standard MSA?`,
    tags: ["call-notes", "northwind", "pricing"],
    pinned: true,
    updatedAt: daysAgo(1),
    createdAt: daysAgo(3),
    color: "#3b64f6",
  },
  {
    id: "nt_w2",
    title: "UK application timeline — canonical",
    content: `The version we give students. Twelve months out to enrolment day.

- **T-12** — Course list, not university list. 8–12 options.
- **T-9** — Documents: passport, transcripts, book the English test.
- **T-6** — Personal statement. Write it last, write it for one course.
- **T-3** — References requested, allow six weeks.
- **T-0** — Submission.

The two silent killers:
1. Document deadlines are courier deadlines. Add two weeks.
2. Visa refusals usually trace back to an unexplained bank deposit. Keep twelve months of statements and write a note.`,
    tags: ["education", "timeline", "canonical"],
    pinned: true,
    updatedAt: daysAgo(5),
    createdAt: daysAgo(40),
    color: "#14b8a6",
  },
  {
    id: "nt_w3",
    title: "Hook patterns that survive 3 seconds",
    content: `Collected from the retention data on 41 short-form videos.

1. **Contradiction** — "Most X tools are lying to you."
2. **Concrete number** — "£4.2m tracked. Two-thirds invisible."
3. **Artefact** — show the broken thing first, explain second.
4. **Named cost** — "This costs you £180k a year."
5. **Live failure** — screen record an error in real time.
6. **Second person** — "If you run ads, this matters."

Rule that holds across all six: the first frame must contain motion or contrast. A talking head on a flat background loses roughly 40% before second two.`,
    tags: ["video", "hooks", "research"],
    pinned: false,
    updatedAt: daysAgo(3),
    createdAt: daysAgo(12),
    color: "#f59e0b",
  },
  {
    id: "nt_w4",
    title: "Partner referral agreement — clause review",
    content: `Kite Education co-marketing terms.

- Commission: 12% of first-year tuition, paid on CAS issue.
- Minimum guarantee: none for year one, review at 40 enrolments.
- Exclusivity: none, but they want first right of refusal on UK university campaigns.
- Data: students can request deletion; we must cascade to email + CRM + ad audiences within 30 days.

Red line: the deletion cascade clause. Ad platforms rarely honour deletions retroactively — flag it.`,
    tags: ["legal", "partner", "kite"],
    pinned: false,
    updatedAt: daysAgo(8),
    createdAt: daysAgo(14),
    color: "#8b5cf6",
  },
  {
    id: "nt_w5",
    title: "ICP definition v3",
    content: `**Must have all three**
1. EMEA-based, 50–500 employees
2. B2B SaaS or e-commerce with a paid acquisition channel
3. Has a revenue or marketing ops function (job title contains "growth", "ops", "marketing", "demand")

**Disqualifiers**
- Under 10 employees (no budget owner)
- Pure consultancy (no repeatable CAC)
- Agencies (long sales cycles, low seat expansion)

**Why the employee floor moved up:** deals under 50 employees churn 2.4× faster and expand 40% less.`,
    tags: ["icp", "gtm", "canonical"],
    pinned: false,
    updatedAt: daysAgo(20),
    createdAt: daysAgo(60),
    color: "#ef4444",
  },
];

export const seedWikiPages: WikiPage[] = [
  {
    id: "wk_attribution",
    title: "Attribution",
    slug: "attribution",
    summary: "How FriendConnect models channel contribution, decay and incrementality.",
    body: `## Definition

Attribution is the process of assigning credit for revenue across the marketing touches that preceded a conversion.

## Our model

Contribution (stage movement) → time decay (14-day half-life) → geo-lift (above £5k spend).

## Why not last-click

Last-click is trivially simple and systematically mis-prices the channel mix. It over-credits the bottom of the funnel and drives budget into whichever channel is already winning.

## Related

- [Revenue operations](revenue-operations)
- [Experimentation](experimentation)`,
    category: "Marketing",
    links: ["revenue-operations", "experimentation"],
    updatedAt: daysAgo(4),
  },
  {
    id: "wk_revops",
    title: "Revenue operations",
    slug: "revenue-operations",
    summary: "The operating system for pipeline, forecasting and CRM hygiene.",
    body: `## Definition

Revenue operations is the function that owns the systems, process and data behind the revenue engine.

## The five metrics we report

1. Pipeline created per week
2. Win rate by stage
3. Average days in stage
4. Forecast accuracy at ±10%
5. CRM field completeness

## Rules

- Never report more than five metrics at once.
- Every metric needs a named owner.
- A metric without a decision attached to it gets deleted.`,
    category: "Revenue",
    links: ["attribution", "experimentation"],
    updatedAt: daysAgo(9),
  },
  {
    id: "wk_exp",
    title: "Experimentation",
    slug: "experimentation",
    summary: "How we design, size and read experiments so the results survive scrutiny.",
    body: `## Definition

A controlled comparison designed to estimate the causal effect of a change.

## Sizing

Before running anything, compute the minimum detectable effect at 80% power. If the sample needed is larger than the traffic you have, do not run it — fix the test or drop it.

## Reading results

- Pre-register the metric and the stopping rule.
- Do not peek and stop early.
- Segment only if the effect is real in the aggregate.`,
    category: "Research",
    links: ["attribution"],
    updatedAt: daysAgo(14),
  },
  {
    id: "wk_agents",
    title: "Agent loops",
    slug: "agent-loops",
    summary: "Bounded tool-calling loops: goal predicate, step budget, repetition guard, wall clock.",
    body: `## Definition

An agent loop is a bounded cycle of model calls and tool executions that terminates on a verified condition.

## Four stop conditions

1. Goal predicate — verified completion
2. Step budget — hard ceiling
3. Repetition guard — same tool, same arguments
4. Wall-clock budget — per-tool timeouts

## Anti-patterns

- Catching tool errors as exceptions instead of returning them to the model.
- Letting the agent verify its own success.
- Skipping the replay harness.`,
    category: "Engineering",
    links: ["experimentation"],
    updatedAt: daysAgo(2),
  },
  {
    id: "wk_study",
    title: "Student journey",
    slug: "student-journey",
    summary: "The nine-stage path an international student takes from enquiry to CAS.",
    body: `## Stages

Enquiry → Counselling → Shortlist → Documents → Submission → Interview → Offer → Visa → CAS & enrol

## Where students drop

Documents is the biggest leak: 41% of applications stall there, almost always on reference letters.

## Interventions

- Chase references at T-3 months with a 6-week runway.
- Offer a document checklist the same day as shortlisting.
- Book the English test in week one, not week four.`,
    category: "Education",
    links: [],
    updatedAt: daysAgo(11),
  },
  {
    id: "wk_voice",
    title: "Voice production",
    slug: "voice-production",
    summary: "Script, narration, timing and captions — the standards we ship to.",
    body: `## Standards

- Narration under 165 words per minute.
- One idea per sentence, under 18 words.
- Burn captions in, never rely on a platform toggle.

## Loudness

Target −16 LUFS for social, −14 LUFS for podcast. True peak below −1 dBTP.`,
    category: "Studio",
    links: ["agent-loops"],
    updatedAt: daysAgo(7),
  },
];

export const seedPlugins: Plugin[] = [
  {
    id: "pl_attribution",
    name: "Attribution Lens",
    slug: "attribution-lens",
    description: "Adds contribution, decay and geo-lift views to any contact timeline.",
    category: "Analytics",
    author: "friendconnect",
    downloads: 12_480,
    rating: 4.9,
    version: "2.4.1",
    installed: true,
    featured: true,
    tags: ["attribution", "revenue", "dashboards"],
  },
  {
    id: "pl_humanizer",
    name: "Humanizer",
    slug: "humanizer",
    description: "Six-pass editor that strips machine rhythm, hedging and summary paragraphs.",
    category: "Content",
    author: "blader",
    downloads: 31_902,
    rating: 4.8,
    version: "1.8.0",
    installed: true,
    featured: true,
    tags: ["writing", "editing", "ai"],
  },
  {
    id: "pl_enrich",
    name: "Open Enrich",
    slug: "open-enrich",
    description: "Firmographic enrichment from open sources — headcount, revenue and tech stack.",
    category: "Data",
    author: "brightdata",
    downloads: 24_140,
    rating: 4.6,
    version: "3.1.2",
    installed: true,
    featured: true,
    tags: ["leads", "enrichment", "data"],
  },
  {
    id: "pl_seo",
    name: "Open SEO",
    slug: "open-seo",
    description: "On-page, technical and structured-data audits with prioritised fixes.",
    category: "Marketing",
    author: "every-app",
    downloads: 18_733,
    rating: 4.7,
    version: "2.0.5",
    installed: true,
    featured: true,
    tags: ["seo", "audit", "schema"],
  },
  {
    id: "pl_rss",
    name: "Feed Reader",
    slug: "feed-reader",
    description: "Pull RSS and Atom feeds into your workspace with full-text extraction.",
    category: "Productivity",
    author: "diygod",
    downloads: 9_204,
    rating: 4.5,
    version: "1.4.0",
    installed: false,
    featured: true,
    tags: ["rss", "news", "reading"],
  },
  {
    id: "pl_voice",
    name: "Voice Studio",
    slug: "voice-studio",
    description: "Script-to-narration with timing estimates, captions and loudness normalisation.",
    category: "Studio",
    author: "friendconnect",
    downloads: 6_882,
    rating: 4.4,
    version: "0.9.3",
    installed: true,
    featured: false,
    tags: ["audio", "tts", "captions"],
  },
  {
    id: "pl_diagram",
    name: "Diagram Kit",
    slug: "diagram-kit",
    description: "Twelve process, flowchart and system-diagram templates with editable nodes.",
    category: "Design",
    author: "cathrynlavery",
    downloads: 15_310,
    rating: 4.9,
    version: "3.2.0",
    installed: false,
    featured: false,
    tags: ["diagram", "design", "templates"],
  },
  {
    id: "pl_mem",
    name: "Memory Layer",
    slug: "memory-layer",
    description: "A durable memory store for agents: facts, preferences, decisions and evidence.",
    category: "Engineering",
    author: "akitaonrails",
    downloads: 7_455,
    rating: 4.3,
    version: "1.1.0",
    installed: false,
    featured: false,
    tags: ["agents", "memory", "context"],
  },
  {
    id: "pl_lead",
    name: "Prospector",
    slug: "prospector",
    description: "Find companies matching an ICP and qualify them against your scoring rubric.",
    category: "Data",
    author: "clawnify",
    downloads: 11_002,
    rating: 4.2,
    version: "2.2.7",
    installed: false,
    featured: false,
    tags: ["prospecting", "outbound", "icp"],
  },
  {
    id: "pl_scrape",
    name: "Crawler",
    slug: "crawler",
    description: "Headless crawl with markdown extraction, screenshot capture and crawl maps.",
    category: "Data",
    author: "firecrawl",
    downloads: 28_770,
    rating: 4.7,
    version: "4.0.1",
    installed: false,
    featured: false,
    tags: ["scraping", "web", "research"],
  },
  {
    id: "pl_apitest",
    name: "API Bench",
    slug: "api-bench",
    description: "Fire, time and diff API requests against saved collections.",
    category: "Developer",
    author: "friendconnect",
    downloads: 4_215,
    rating: 4.1,
    version: "0.7.2",
    installed: false,
    featured: false,
    tags: ["api", "testing", "http"],
  },
  {
    id: "pl_sms",
    name: "SMS Console",
    slug: "sms-console",
    description: "Two-way SMS and WhatsApp threads with delivery receipts and templates.",
    category: "Messaging",
    author: "ndolestudio",
    downloads: 5_930,
    rating: 4.0,
    version: "1.5.0",
    installed: false,
    featured: false,
    tags: ["sms", "whatsapp", "outreach"],
  },
];

export const seedApis: ApiDefinition[] = [
  {
    id: "api_openai",
    name: "OpenAI",
    slug: "openai",
    category: "AI & LLM",
    description: "Text, image, audio and embedding models with function calling.",
    auth: "api-key",
    https: true,
    cors: true,
    rating: 4.7,
    reviews: 4_210,
    url: "https://api.openai.com/v1",
    tags: ["llm", "images", "audio"],
  },
  {
    id: "api_anthropic",
    name: "Anthropic",
    slug: "anthropic",
    category: "AI & LLM",
    description: "Claude models with tool use, extended thinking and prompt caching.",
    auth: "api-key",
    https: true,
    cors: true,
    rating: 4.8,
    reviews: 3_640,
    url: "https://api.anthropic.com/v1",
    tags: ["llm", "agents", "tools"],
  },
  {
    id: "api_stripe",
    name: "Stripe",
    slug: "stripe",
    category: "Payments",
    description: "Payments, billing, invoicing and Connect payouts.",
    auth: "api-key",
    https: true,
    cors: true,
    rating: 4.6,
    reviews: 3_120,
    url: "https://api.stripe.com/v1",
    tags: ["payments", "billing", "saas"],
  },
  {
    id: "api_shippo",
    name: "Shippo",
    slug: "shippo",
    category: "Logistics",
    description: "Multi-carrier shipping rates, labels and tracking.",
    auth: "api-key",
    https: true,
    cors: false,
    rating: 4.3,
    reviews: 1_140,
    url: "https://api.goshippo.com",
    tags: ["shipping", "tracking"],
  },
  {
    id: "api_hubspot",
    name: "HubSpot",
    slug: "hubspot",
    category: "CRM",
    description: "Contacts, deals, companies and marketing automation.",
    auth: "oauth2",
    https: true,
    cors: true,
    rating: 4.4,
    reviews: 2_780,
    url: "https://api.hubapi.com",
    tags: ["crm", "deals", "automation"],
  },
  {
    id: "api_twilio",
    name: "Twilio",
    slug: "twilio",
    category: "Messaging",
    description: "Programmable SMS, WhatsApp and voice with delivery receipts.",
    auth: "basic",
    https: true,
    cors: false,
    rating: 4.3,
    reviews: 2_410,
    url: "https://api.twilio.com/2010-04-01",
    tags: ["sms", "whatsapp", "voip"],
  },
  {
    id: "api_openweathermap",
    name: "OpenWeatherMap",
    slug: "openweathermap",
    category: "Data",
    description: "Current weather, forecast and historical conditions worldwide.",
    auth: "api-key",
    https: true,
    cors: true,
    rating: 4.1,
    reviews: 980,
    url: "https://api.openweathermap.org/data/2.5",
    tags: ["weather", "data"],
  },
  {
    id: "api_exchangerate",
    name: "ExchangeRate",
    slug: "exchangerate",
    category: "Finance",
    description: "Free foreign exchange reference and daily conversion rates.",
    auth: "none",
    https: true,
    cors: true,
    rating: 4.0,
    reviews: 720,
    url: "https://api.exchangerate.host",
    tags: ["currency", "finance", "free"],
  },
  {
    id: "api_npoint",
    name: "npoint",
    slug: "npoint",
    category: "Developer",
    description: "Spin up JSON storage endpoints from a document — instant mock APIs.",
    auth: "none",
    https: true,
    cors: true,
    rating: 4.2,
    reviews: 460,
    url: "https://api.npoint.io",
    tags: ["mock", "json", "free"],
  },
  {
    id: "api_openlibrary",
    name: "OpenLibrary",
    slug: "openlibrary",
    category: "Education",
    description: "Book metadata, authors, editions and subject search.",
    auth: "none",
    https: true,
    cors: true,
    rating: 4.5,
    reviews: 1_320,
    url: "https://openlibrary.org/api",
    tags: ["books", "education", "free"],
  },
  {
    id: "api_weather_gov",
    name: "Open-Meteo",
    slug: "open-meteo",
    category: "Data",
    description: "Free weather forecast API with no key required.",
    auth: "none",
    https: true,
    cors: true,
    rating: 4.4,
    reviews: 1_640,
    url: "https://api.open-meteo.com/v1",
    tags: ["weather", "free", "forecast"],
  },
  {
    id: "api_reddit",
    name: "Reddit",
    slug: "reddit",
    category: "Social",
    description: "Posts, comments and subreddit listings for social listening.",
    auth: "oauth2",
    https: true,
    cors: false,
    rating: 3.9,
    reviews: 1_890,
    url: "https://oauth.reddit.com",
    tags: ["social", "listening", "community"],
  },
  {
    id: "api_sendgrid",
    name: "SendGrid",
    slug: "sendgrid",
    category: "Messaging",
    description: "Transactional and marketing email with dynamic templates.",
    auth: "api-key",
    https: true,
    cors: false,
    rating: 4.4,
    reviews: 2_050,
    url: "https://api.sendgrid.com/v3",
    tags: ["email", "templates"],
  },
  {
    id: "api_jitsi",
    name: "Jitsi Meet",
    slug: "jitsi-meet",
    category: "Communication",
    description: "Self-hosted video conferencing rooms via the JaaS API.",
    auth: "api-key",
    https: true,
    cors: true,
    rating: 4.2,
    reviews: 840,
    url: "https://api.jitsi.example/v1",
    tags: ["video", "meetings", "voip"],
  },
  {
    id: "api_giphy",
    name: "Giphy",
    slug: "giphy",
    category: "Media",
    description: "GIF and sticker search for lightweight motion.",
    auth: "api-key",
    https: true,
    cors: true,
    rating: 4.0,
    reviews: 610,
    url: "https://api.giphy.com/v1",
    tags: ["media", "gifs", "fun"],
  },
];
