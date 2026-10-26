import type { Article, Campaign, Notification, SeoAudit, SocialPost } from "@/lib/types";
import { daysAgo, daysAhead, hoursAhead } from "./common";

export const seedArticles: Article[] = [
  {
    id: "ar_attribution",
    title: "Attribution without guesswork: a practical model for growth teams",
    slug: "attribution-without-guesswork",
    excerpt:
      "Most teams guess at attribution. We break down a three-layer model that survives contact with messy data, with the maths to back it.",
    body: `Attribution is the most confidently wrong discipline in growth. Every dashboard implies certainty that the underlying data cannot support.

## The problem with the last-click rule

Last-click attribution is popular because it is simple and it always produces a number. It also systematically over-credits the bottom of the funnel and discards everything upstream that created demand in the first place.

The failure mode compounds: if paid search takes the credit, paid search budget grows. Paid search takes the credit, paid search budget grows. The loop is self-reinforcing and it is why 70% of teams end up with a channel mix that would not survive contact with unit economics.

## A three-layer model

Layer one is contribution, not attribution. Instead of asking which touch got the credit, ask which touches moved the deal forward. You can measure movement: stage transitions, quote requests, demo bookings, proposal requests.

Layer two is time decay. A touch 30 days before a close is worth more than a touch the day before, but it is not worth the same as a touch in the middle of a real evaluation cycle. A half-life of 14 to 21 days tends to survive scrutiny in B2B.

Layer three is geo-lift for anything above a certain spend threshold. Holdout geographies are the only honest way to measure incrementality, and they are more available than most people assume.

## What to do on Monday

- Pick one channel. Measure contribution against movement, not against last-click.
- Set a 14-day half-life and recompute the last 90 days.
- Split the report into contribution and incrementality. Label them clearly.

The result will not be a single number, and that is the point. It will be a defensible set of numbers, which is strictly better than one indefensible number.`,
    status: "published",
    keywords: ["attribution", "growth", "marketing analytics", "media mix"],
    readTime: 5,
    views: 12_480,
    conversions: 318,
    seoScore: 92,
    tone: "analytical",
    createdAt: daysAgo(28),
    publishedAt: daysAgo(18),
  },
  {
    id: "ar_llm",
    title: "Building an agent loop that actually terminates",
    slug: "building-an-agent-loop-that-terminates",
    excerpt:
      "Tool-calling agents fail in predictable ways. Here is the loop design, the stop conditions and the guardrails that keep a run bounded.",
    body: `Every agent demo looks effortless. Every production agent needs a termination proof.

## The naive loop

The naive loop is: call the model, parse a tool call, run the tool, append the result, call the model again. This loop has no defined exit, so it runs until the context window fills or the API rejects the request.

## Four stop conditions

A bounded loop needs all four of these, and it needs them to be independent.

1. **A goal predicate.** The model emits a final answer, and a separate verifier confirms it satisfies the task. Without the verifier the model can claim success.
2. **A step budget.** A hard ceiling, usually between 6 and 20 steps depending on task depth.
3. **A repetition guard.** If the same tool receives the same arguments twice, the run halts. Loops are almost always repetition loops.
4. **A wall-clock budget.** Most API calls are fast, but a slow tool can stall a run for minutes.

## Guardrails worth building early

Give every tool a schema, validate the arguments, and log the call. When a tool fails, return the error to the model as a tool result rather than raising an exception, so the model gets a chance to recover. Give tools a timeout, and make the timeout shorter than the run budget.

The single highest-value thing you can do is write a replay harness. Log every step, and replay a failing run deterministically. Agents are debuggable once they are reproducible.`,
    status: "published",
    keywords: ["ai agents", "tool calling", "llm", "orchestration"],
    readTime: 6,
    views: 9_830,
    conversions: 241,
    seoScore: 88,
    tone: "technical",
    createdAt: daysAgo(20),
    publishedAt: daysAgo(11),
  },
  {
    id: "ar_study",
    title: "The international student application timeline nobody explains properly",
    slug: "international-student-application-timeline",
    excerpt:
      "Twelve months, nine stages, and the two deadlines that quietly kill most applications. A consultant-grade walkthrough.",
    body: `Most applicants treat an application like a form. It is closer to a supply chain with a fixed launch date and very little slack.

## Twelve months out

Choose the course list, not the university list. Eight to twelve options is right. Fewer wastes negotiating power, more wastes your own time.

## Nine months out

Documents. Passport validity, transcripts in the required format, English test booked but not yet taken. This is the stage where delays compound, because every document depends on somebody else's calendar.

## Six months out

The personal statement. Write it last, write it alone, and write it for a specific course. A statement that could be sent to any of your twelve options is a statement that will not get you in anywhere.

## Three months out

References requested, with a six-week runway built in. Referees are academics and professionals, and both categories are extremely bad at deadlines.

## The two deadlines that kill applications

Document deadlines in January and September are not really deadlines for the applicant, they are deadlines for the courier. Allow two weeks.

## Visas are their own project

A student visa refusal is disproportionately caused by a bank statement that shows a large unexplained deposit. Keep twelve months of statements and write a short explanatory note.`,
    status: "published",
    keywords: ["study abroad", "student visa", "applications", "consultancy"],
    readTime: 7,
    views: 22_140,
    conversions: 704,
    seoScore: 95,
    tone: "friendly",
    createdAt: daysAgo(64),
    publishedAt: daysAgo(52),
  },
  {
    id: "ar_humanizer",
    title: "How to write so it does not sound like a machine",
    slug: "how-to-write-so-it-does-not-sound-like-a-machine",
    excerpt:
      "Six editing passes that reliably strip the tell-tale rhythm of generated prose, with before-and-after examples.",
    body: `Generated prose has a rhythm. Learn to hear it and you can edit it out in two minutes.

## The tell: sentence-length uniformity

Human writing alternates. A long sentence, then a short one, then a medium one. Machine writing tends toward a comfortable middle length, over and over. Read any paragraph aloud and count. If every sentence is 14 to 22 words, that is the problem.

## The fix: deliberate variety

Shorten one sentence in three. Not all of them — that reads like a stutter. One in three is enough to break the pattern.

## The tell: the summary paragraph

Machine prose ends with a paragraph that restates what was just said. Human prose often ends on a concrete detail instead.

## The fix: end on an image

> Instead of "the team shipped more in a quarter, demonstrating improved velocity."
> Try "the team shipped eleven releases in a quarter, more than in the previous two quarters combined."

## The tell: "It is not just X, it is Y"

This construction appears constantly in generated prose. Search for it. Cut it. Say the thing once.

## The workflow

Write the rough version fast. Then make three passes: rhythm, hedging, and deletions. Never polish sentence by sentence as you write — the voice disappears.`,
    status: "review",
    keywords: ["writing", "editing", "ai content", "humanizer"],
    readTime: 4,
    views: 0,
    conversions: 0,
    seoScore: 78,
    tone: "friendly",
    createdAt: daysAgo(6),
  },
  {
    id: "ar_pipeline",
    title: "The 2026 benchmark report: revenue operations in the mid-market",
    slug: "revenue-operations-benchmark-2026",
    excerpt: "Benchmark data from 340 mid-market revenue teams, plus the four operating patterns that separated the top quartile.",
    body: `We surveyed 340 mid-market revenue teams. Here is what separates the top quartile from the rest.

## The top quartile run lean

Median revenue operations headcount at the top quartile was 3.2, against 6.8 at the bottom quartile. The top quartile did not win on headcount; they won on tooling consolidation and on killing work that never touched a number.

## Automation concentrated in three places

Lead enrichment, lead routing and CRM hygiene accounted for 71% of all automation deployed. Everything else was pilots that never reached production.

## Reporting discipline

Top-quartile teams reported on five metrics. Bottom-quartile teams reported on thirty-one and re-cut the dashboard weekly.

## The uncomfortable finding

Tooling spend per rep showed almost no correlation with revenue per rep. Process consistency did.`,
    status: "draft",
    keywords: ["benchmark", "revops", "report", "data"],
    readTime: 8,
    views: 0,
    conversions: 0,
    seoScore: 64,
    tone: "analytical",
    createdAt: daysAgo(3),
  },
  {
    id: "ar_shortform",
    title: "Short-form video scripts that hold attention past second three",
    slug: "short-form-video-scripts",
    excerpt: "A frame-by-frame breakdown of the opening three seconds, using six real hooks and the retention curves behind them.",
    body: `The first three seconds decide everything. Six hooks that worked, with the reasoning.

## Hook 1: the contradiction

> "Most attribution tools are lying to you."
Open on the presenter, cut to a dashboard, cut back. Retention held at 94%.

## Hook 2: the concrete number

> "We tracked £4.2 million in one quarter. Two-thirds of it was invisible."
Numbers on screen immediately. No logo animation.

## Hook 3: the artefact

Show the broken thing first, then explain it. The screen is doing the work while you talk over it.

## The structural rule

Your first frame must contain motion or contrast. A talking head on a flat background loses roughly 40% of viewers before the second second.

## Captions are not optional

Eight in ten viewers watch with sound off at some point. Burn captions in. Not add them — burn them.`,
    status: "idea",
    keywords: ["video", "short form", "hooks", "retention"],
    readTime: 3,
    views: 0,
    conversions: 0,
    seoScore: 42,
    tone: "punchy",
    createdAt: daysAgo(2),
  },
];

export const seedCampaigns: Campaign[] = [
  {
    id: "cp_bench",
    name: "Benchmark report launch",
    channel: "email",
    status: "running",
    audience: "Ops leaders (RevOps + Marketing Ops)",
    sent: 12_480,
    opened: 5_992,
    clicked: 1_842,
    converted: 318,
    budget: 8_500,
    startDate: daysAgo(12),
    endDate: daysAhead(18),
    subject: "The 2026 revenue operations benchmark (free download)",
    body: "We surveyed 340 mid-market revenue teams. The top quartile run 3 people. We unpacked what they do differently — plus the tooling spend correlation that turned out to be zero.",
  },
  {
    id: "cp_webinar",
    name: "Agent loop deep dive webinar",
    channel: "webinar",
    status: "scheduled",
    audience: "Engineering + AI leads",
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    budget: 4_200,
    startDate: daysAhead(9),
    endDate: daysAhead(9),
    subject: "Building an agent loop that actually terminates",
    body: "45 minutes, live. We build a bounded tool-calling agent from scratch and deliberately break it in four ways.",
  },
  {
    id: "cp_retarget",
    name: "LinkedIn retargeting — benchmark viewers",
    channel: "ads",
    status: "running",
    audience: "Site visitors, benchmark report",
    sent: 38_200,
    opened: 0,
    clicked: 1_106,
    converted: 142,
    budget: 12_000,
    startDate: daysAgo(21),
    endDate: daysAhead(7),
  },
  {
    id: "cp_nurture",
    name: "Student consultancy nurture — Sept intake",
    channel: "email",
    status: "scheduled",
    audience: "Enquiries from South Asia",
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    budget: 2_400,
    startDate: daysAhead(4),
    endDate: daysAhead(34),
    subject: "Your UK application timeline starts 12 months out",
    body: "Here is the exact month-by-month plan we use with students — plus the two deadlines that quietly kill most applications.",
  },
  {
    id: "cp_sms",
    name: "Interview reminder — Durham offer holders",
    channel: "sms",
    status: "paused",
    audience: "Offer holders, 24h before interview",
    sent: 138,
    opened: 0,
    clicked: 0,
    converted: 41,
    budget: 320,
    startDate: daysAgo(30),
    endDate: daysAhead(60),
    body: "Reminder: your MSc Finance interview is tomorrow at 10:00. Reply YES to confirm or RESCHEDULE to move it.",
  },
  {
    id: "cp_social",
    name: "Weekly founder insights carousel",
    channel: "social",
    status: "running",
    audience: "LinkedIn followers",
    sent: 14,
    opened: 0,
    clicked: 0,
    converted: 62,
    budget: 900,
    startDate: daysAgo(60),
    endDate: daysAhead(60),
  },
  {
    id: "cp_launch",
    name: "Voice Studio product launch",
    channel: "ads",
    status: "complete",
    audience: "Content creators",
    sent: 62_400,
    opened: 0,
    clicked: 3_140,
    converted: 486,
    budget: 18_000,
    startDate: daysAgo(96),
    endDate: daysAgo(40),
  },
];

export const seedSocialPosts: SocialPost[] = [
  {
    id: "sp_1",
    platform: "LinkedIn",
    caption:
      "Attribution is the most confidently wrong discipline in growth.\n\nEvery dashboard implies certainty the data cannot support. Here is the three-layer model we use instead — contribution, time decay, geo-lift.\n\nThe result is not a single number. That is the point.",
    hashtags: ["growth", "marketinganalytics", "attribution"],
    scheduledFor: hoursAhead(3),
    status: "scheduled",
    media: "carousel",
    engagement: 0,
  },
  {
    id: "sp_2",
    platform: "X",
    caption:
      "Your agent loop needs a repetition guard more than it needs a better model.",
    hashtags: ["ai", "agents", "llm"],
    scheduledFor: hoursAhead(9),
    status: "scheduled",
    media: "image",
    engagement: 0,
  },
  {
    id: "sp_3",
    platform: "LinkedIn",
    caption:
      "We surveyed 340 mid-market revenue teams.\n\nThe top quartile run 3 people. The bottom quartile run 7. Tooling spend per rep correlated with revenue per rep at essentially zero.\n\nProcess consistency did the work.",
    hashtags: ["revops", "benchmark", "data"],
    scheduledFor: hoursAhead(26),
    status: "scheduled",
    media: "carousel",
    engagement: 0,
  },
  {
    id: "sp_4",
    platform: "Instagram",
    caption:
      "12 months. 9 stages. 2 deadlines that quietly kill most applications.\n\nSave this one if you are applying for UK university this cycle.",
    hashtags: ["studyabroad", "studyinginuk", "internationalstudents"],
    scheduledFor: daysAhead(2),
    status: "scheduled",
    media: "carousel",
    engagement: 0,
  },
  {
    id: "sp_5",
    platform: "YouTube",
    caption:
      "Building a bounded tool-calling agent from scratch — then breaking it four ways on purpose.",
    hashtags: ["ai", "engineering", "tutorial"],
    scheduledFor: daysAhead(4),
    status: "draft",
    media: "video",
    engagement: 0,
  },
  {
    id: "sp_6",
    platform: "LinkedIn",
    caption:
      "Most applications are treated like a form. They are closer to a supply chain with a fixed launch date and very little slack.",
    hashtags: ["education", "consultancy"],
    scheduledFor: daysAgo(3),
    status: "published",
    media: "image",
    engagement: 842,
  },
  {
    id: "sp_7",
    platform: "Facebook",
    caption:
      "Thinking about studying in the UK? We built a free month-by-month application planner.",
    hashtags: ["studyabroad", "uk"],
    scheduledFor: daysAgo(8),
    status: "published",
    media: "image",
    engagement: 316,
  },
  {
    id: "sp_8",
    platform: "TikTok",
    caption: "POV: you finally understand what \"contribution vs attribution\" means.",
    hashtags: ["growth", "marketing", "fyp"],
    scheduledFor: daysAhead(6),
    status: "draft",
    media: "video",
    engagement: 0,
  },
];

export const seedSeoAudits: SeoAudit[] = [
  {
    id: "seo_1",
    url: "friendconnect.app/blog/attribution-without-guesswork",
    title: "Attribution without guesswork: a practical model for growth teams",
    description:
      "Most teams guess at attribution. We break down a three-layer model that survives contact with messy data.",
    score: 92,
    keywords: ["attribution", "growth analytics"],
    checks: [
      { label: "Title length (50–60 chars)", pass: true, detail: "58 characters — within range." },
      { label: "Meta description length", pass: true, detail: "142 characters." },
      { label: "Keyword in H1", pass: true, detail: "\"Attribution\" appears in the H1." },
      { label: "Internal links", pass: true, detail: "6 internal links to related articles." },
      { label: "Image alt coverage", pass: false, detail: "2 of 5 images missing alt text." },
      { label: "Reading level", pass: true, detail: "Grade 11 — good for a professional audience." },
      { label: "Structured data", pass: true, detail: "Article + FAQ schema detected." },
      { label: "Canonical URL", pass: true, detail: "Self-referencing canonical present." },
    ],
    scannedAt: daysAgo(1),
  },
  {
    id: "seo_2",
    url: "friendconnect.app/blog/building-an-agent-loop-that-terminates",
    title: "Building an agent loop that actually terminates",
    description: "A short post about AI agents.",
    score: 61,
    keywords: ["ai agents", "tool calling"],
    checks: [
      { label: "Title length (50–60 chars)", pass: false, detail: "47 characters — slightly short." },
      { label: "Meta description length", pass: false, detail: "34 characters — too short to rank." },
      { label: "Keyword in H1", pass: true, detail: "\"agent loop\" appears in the H1." },
      { label: "Internal links", pass: false, detail: "Only 1 internal link — add 3 more." },
      { label: "Image alt coverage", pass: true, detail: "All images have alt text." },
      { label: "Reading level", pass: true, detail: "Grade 12." },
      { label: "Structured data", pass: false, detail: "No Article schema found." },
      { label: "Canonical URL", pass: true, detail: "Self-referencing canonical present." },
    ],
    scannedAt: daysAgo(2),
  },
  {
    id: "seo_3",
    url: "friendconnect.app/consultancy",
    title: "UK Education Consultancy",
    description: "",
    score: 38,
    keywords: ["study abroad consultant", "uk university"],
    checks: [
      { label: "Title length (50–60 chars)", pass: false, detail: "22 characters — add a value proposition." },
      { label: "Meta description length", pass: false, detail: "Missing meta description entirely." },
      { label: "Keyword in H1", pass: false, detail: "No clear keyword phrase in the H1." },
      { label: "Internal links", pass: false, detail: "2 internal links — aim for 5+." },
      { label: "Image alt coverage", pass: false, detail: "4 of 7 images missing alt text." },
      { label: "Reading level", pass: true, detail: "Grade 9." },
      { label: "Structured data", pass: false, detail: "No Organization or FAQ schema." },
      { label: "Canonical URL", pass: true, detail: "Self-referencing canonical present." },
    ],
    scannedAt: daysAgo(4),
  },
];

export const seedNotifications: Notification[] = [
  {
    id: "nt_1",
    title: "Deal moved to Negotiation",
    body: "Northwind Analytics · £42,000 · close date in 18 days",
    kind: "success",
    at: hoursAhead(-2),
    read: false,
  },
  {
    id: "nt_2",
    title: "SEO score dropped",
    body: "/consultancy dropped from 54 to 38 — meta description is missing.",
    kind: "warning",
    at: hoursAhead(-7),
    read: false,
  },
  {
    id: "nt_3",
    title: "New lead qualified",
    body: "Ava Kowalski — Brightloom, score 92.",
    kind: "info",
    at: hoursAhead(-20),
    read: false,
  },
  {
    id: "nt_4",
    title: "Application documents missing",
    body: "Arif Hossain — reference letter outstanding.",
    kind: "warning",
    at: hoursAhead(-30),
    read: false,
  },
  {
    id: "nt_5",
    title: "Voice clip rendered",
    body: "\"Agent loop intro\" — 24.6s, 3 voice variants.",
    kind: "success",
    at: hoursAhead(-44),
    read: true,
  },
  {
    id: "nt_6",
    title: "Agent run failed",
    body: "Lead Enricher — repeat tool call detected, run halted at step 7.",
    kind: "error",
    at: hoursAhead(-50),
    read: true,
  },
];
