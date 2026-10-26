import type { Diagram } from "@/lib/types";

export type TemplateKind =
  | "diagram"
  | "social"
  | "email"
  | "agent"
  | "study"
  | "brief"
  | "playbook"
  | "video"
  | "seo"
  | "api";

export interface WorkspaceTemplate {
  id: string;
  name: string;
  kind: TemplateKind;
  category: string;
  description: string;
  tags: string[];
  href: string;
  cta: string;
  /** Copy-ready body for text templates. */
  body?: string;
  /** Full diagram for live previews. */
  diagram?: Diagram;
  meta?: { label: string; value: string }[];
}

const node = (
  id: string,
  type: Diagram["nodes"][number]["type"],
  label: string,
  x: number,
  y: number,
  color = "#3b64f6",
): Diagram["nodes"][number] => ({
  id,
  type,
  label,
  x,
  y,
  w: 160,
  h: 56,
  color,
});

const mkDiagram = (
  name: string,
  description: string,
  template: string,
  nodes: Diagram["nodes"],
  edges: Diagram["edges"],
): Diagram => ({
  id: `tpl_${template}`,
  name,
  description,
  template,
  nodes,
  edges,
  updatedAt: new Date().toISOString(),
});

/* ------------------------------------------------------------------ */
/* Diagram templates                                                     */
/* ------------------------------------------------------------------ */

const diagramFunnel = mkDiagram(
  "Conversion funnel",
  "Traffic to closed revenue, with the drop-off point called out.",
  "funnel",
  [
    node("n1", "start", "Visitors", 40, 40, "#3b64f6"),
    node("n2", "process", "Leads", 240, 40, "#5b7cfa"),
    node("n3", "process", "Qualified", 440, 40, "#14b8a6"),
    node("n4", "process", "Proposals", 640, 40, "#f59e0b"),
    node("n5", "end", "Won", 640, 160, "#10b981"),
  ],
  [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n3", to: "n4" },
    { id: "e4", from: "n4", to: "n5", label: "close" },
  ],
);

const diagramJourney = mkDiagram(
  "Customer journey",
  "The five stages a student moves through before enrolment.",
  "journey",
  [
    node("n1", "actor", "Enquiry", 40, 60, "#3b64f6"),
    node("n2", "process", "Assessment", 220, 60, "#5b7cfa"),
    node("n3", "decision", "Shortlisted?", 400, 60, "#f59e0b"),
    node("n4", "process", "Applications", 580, 20, "#14b8a6"),
    node("n5", "end", "Enrolled", 580, 120, "#10b981"),
  ],
  [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n3", to: "n4", label: "yes" },
    { id: "e4", from: "n3", to: "n5", label: "no" },
  ],
);

const diagramArchitecture = mkDiagram(
  "System architecture",
  "Services, queues and storage with the trust boundary marked.",
  "architecture",
  [
    node("n1", "actor", "Browser", 30, 40, "#64748b"),
    node("n2", "process", "Edge API", 220, 40, "#3b64f6"),
    node("n3", "data", "Postgres", 410, 20, "#14b8a6"),
    node("n4", "data", "Redis queue", 410, 120, "#14b8a6"),
    node("n5", "process", "Agent worker", 600, 120, "#8b5cf6"),
    node("n6", "note", "Trust boundary", 380, 210, "#f59e0b"),
  ],
  [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n2", to: "n4" },
    { id: "e4", from: "n4", to: "n5" },
  ],
);

const diagramAgentLoop = mkDiagram(
  "Bounded agent loop",
  "The loop every agent runs, with all four stop conditions attached.",
  "agent-loop",
  [
    node("n1", "start", "Goal", 40, 60, "#3b64f6"),
    node("n2", "process", "Reason", 220, 60, "#5b7cfa"),
    node("n3", "decision", "Stop?", 400, 60, "#f59e0b"),
    node("n4", "process", "Call tool", 220, 170, "#8b5cf6"),
    node("n5", "end", "Final answer", 580, 60, "#10b981"),
  ],
  [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n3", to: "n4", label: "no" },
    { id: "e4", from: "n4", to: "n2" },
    { id: "e5", from: "n3", to: "n5", label: "yes" },
  ],
);

const diagramOnboarding = mkDiagram(
  "Onboarding checklist flow",
  "Which document is blocking which application.",
  "onboarding",
  [
    node("n1", "start", "Enquiry", 30, 40, "#3b64f6"),
    node("n2", "decision", "IELTS met?", 220, 40, "#f59e0b"),
    node("n3", "process", "Test prep plan", 420, 0, "#8b5cf6"),
    node("n4", "process", "Collect documents", 420, 100, "#14b8a6"),
    node("n5", "decision", "References?", 620, 100, "#f59e0b"),
    node("n6", "end", "Submit", 800, 100, "#10b981"),
  ],
  [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3", label: "no" },
    { id: "e3", from: "n2", to: "n4", label: "yes" },
    { id: "e4", from: "n4", to: "n5" },
    { id: "e5", from: "n5", to: "n6", label: "yes" },
  ],
);

const diagramCampaign = mkDiagram(
  "Campaign engine",
  "How one idea becomes six channels and a scored follow-up.",
  "campaign",
  [
    node("n1", "note", "One brief", 30, 50, "#f59e0b"),
    node("n2", "process", "Write + humanise", 220, 50, "#3b64f6"),
    node("n3", "decision", "Channel fit?", 410, 50, "#8b5cf6"),
    node("n4", "process", "Schedule", 600, 10, "#14b8a6"),
    node("n5", "process", "Measure", 600, 110, "#64748b"),
    node("n6", "end", "Reuse winners", 780, 60, "#10b981"),
  ],
  [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n3", to: "n4" },
    { id: "e4", from: "n3", to: "n5" },
    { id: "e5", from: "n5", to: "n6" },
  ],
);

const diagramStudy = mkDiagram(
  "Study loop",
  "Diagnose, practise, test, review — the revision cycle.",
  "study",
  [
    node("n1", "start", "Mock test", 40, 60, "#3b64f6"),
    node("n2", "process", "Diagnose weak band", 220, 60, "#5b7cfa"),
    node("n3", "process", "Targeted practice", 400, 60, "#14b8a6"),
    node("n4", "decision", "Confidence ≥ 4?", 580, 60, "#f59e0b"),
    node("n5", "end", "Move up", 760, 60, "#10b981"),
  ],
  [
    { id: "e1", from: "n1", to: "n2" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n3", to: "n4" },
    { id: "e4", from: "n4", to: "n5", label: "yes" },
  ],
);

/* ------------------------------------------------------------------ */
/* Text templates                                                        */
/* ------------------------------------------------------------------ */

export const workspaceTemplates: WorkspaceTemplate[] = [
  /* --- diagrams --- */
  {
    id: "tpl_funnel",
    name: "Conversion funnel",
    kind: "diagram",
    category: "Diagramming",
    description:
      "Traffic through to closed revenue with the drop-off point visible at a glance.",
    tags: ["funnel", "revenue", "gtm"],
    href: "/app/diagrams",
    cta: "Open in designer",
    diagram: diagramFunnel,
    meta: [
      { label: "Nodes", value: "5" },
      { label: "Edges", value: "4" },
    ],
  },
  {
    id: "tpl_journey",
    name: "Customer journey",
    kind: "diagram",
    category: "Diagramming",
    description:
      "Enquiry to enrolment, including the branch most journeys never take.",
    tags: ["journey", "student", "consultancy"],
    href: "/app/diagrams",
    cta: "Open in designer",
    diagram: diagramJourney,
    meta: [
      { label: "Nodes", value: "5" },
      { label: "Branches", value: "2" },
    ],
  },
  {
    id: "tpl_architecture",
    name: "System architecture",
    kind: "diagram",
    category: "Diagramming",
    description:
      "Services, storage and queues with the trust boundary drawn where it belongs.",
    tags: ["architecture", "infra", "security"],
    href: "/app/diagrams",
    cta: "Open in designer",
    diagram: diagramArchitecture,
    meta: [
      { label: "Nodes", value: "6" },
      { label: "Stores", value: "2" },
    ],
  },
  {
    id: "tpl_agent_loop",
    name: "Bounded agent loop",
    kind: "diagram",
    category: "Diagramming",
    description:
      "The exact loop your agents run, with the four stop conditions on the same canvas.",
    tags: ["agent", "llm", "automation"],
    href: "/app/diagrams",
    cta: "Open in designer",
    diagram: diagramAgentLoop,
    meta: [
      { label: "Nodes", value: "5" },
      { label: "Stop points", value: "1" },
    ],
  },
  {
    id: "tpl_onboarding",
    name: "Onboarding checklist flow",
    kind: "diagram",
    category: "Diagramming",
    description:
      "Shows which missing document blocks which application — and where students stall.",
    tags: ["education", "onboarding", "blockers"],
    href: "/app/diagrams",
    cta: "Open in designer",
    diagram: diagramOnboarding,
    meta: [
      { label: "Nodes", value: "6" },
      { label: "Decisions", value: "2" },
    ],
  },
  {
    id: "tpl_campaign",
    name: "Campaign engine",
    kind: "diagram",
    category: "Diagramming",
    description:
      "One brief becomes six channels, a measurement step and a reuse loop.",
    tags: ["campaign", "marketing", "repurpose"],
    href: "/app/diagrams",
    cta: "Open in designer",
    diagram: diagramCampaign,
    meta: [
      { label: "Nodes", value: "6" },
      { label: "Branches", value: "2" },
    ],
  },
  {
    id: "tpl_study",
    name: "Study loop",
    kind: "diagram",
    category: "Diagramming",
    description:
      "Diagnose, practise, test, review — the revision cycle we teach students.",
    tags: ["study", "ielts", "revision"],
    href: "/app/diagrams",
    cta: "Open in designer",
    diagram: diagramStudy,
    meta: [
      { label: "Nodes", value: "5" },
      { label: "Cycle", value: "yes" },
    ],
  },

  /* --- social --- */
  {
    id: "tpl_social_lesson",
    name: "LinkedIn lesson",
    kind: "social",
    category: "Social",
    description:
      "A 900-character teaching post that ends with one question, not a pitch.",
    tags: ["linkedin", "organic", "authority"],
    href: "/app/social",
    cta: "Open in planner",
    body: `Most attribution dashboards are lying to you.

Not because the data is wrong — because the model counts things that never happened.

Here's what actually happened at one consultancy we worked with:
→ 41 "leads" in the CRM
→ 3 actually opened an email
→ 1 took a call
→ 0 closed

The dashboard said 41 leads. The truth was 1.

The fix was not a better tool. It was deciding that a "lead" means someone who took an action you can name.

What does YOUR pipeline count as a lead?`,
    meta: [
      { label: "Characters", value: "742 / 3000" },
      { label: "Hook", value: "Contradiction" },
    ],
  },
  {
    id: "tpl_social_thread",
    name: "X thread (7 posts)",
    kind: "social",
    category: "Social",
    description:
      "A thread that earns the follow before the pitch — each post under 280 characters.",
    tags: ["twitter", "thread", "growth"],
    href: "/app/social",
    cta: "Open in planner",
    body: `1/ We audited 340 landing pages for one education consultancy.

Free audit: what we found and what we changed →

2/ The pattern: pages that converted best had one thing in common.

They explained the process in under 30 seconds.

3/ Most pages open with a hero image and a headline that means nothing to a nervous parent.

"Hero Image + Your Future Starts Here"

4/ We replaced them with a single sentence:

"In 20 minutes you'll know exactly which universities your daughter can get into."

5/ That change alone lifted median form completion by 31%.

6/ Nothing about the design changed. Nothing about the traffic changed.

The promise got specific.

7/ If your hero headline could apply to any competitor, it's costing you leads.

Reply "audit" and I'll send you the checklist we use.`,
    meta: [
      { label: "Posts", value: "7" },
      { label: "Style", value: "Numbered" },
    ],
  },
  {
    id: "tpl_social_launch",
    name: "Product launch carousel",
    kind: "social",
    category: "Social",
    description:
      "Eight cards: problem, cost, proof, offer, objection, risk, guarantee, CTA.",
    tags: ["instagram", "carousel", "launch"],
    href: "/app/social",
    cta: "Open in planner",
    body: `Card 1 — "Your applications are not failing. Your process is."
Card 2 — The average student misses 2.3 document deadlines per application.
Card 3 — That is 9 weeks of delay, and a 43% drop-off rate.
Card 4 — We built a checklist that knows which document blocks which university.
Card 5 — Here's what it looks like.
Card 6 — 340 applications tracked. Zero missed reference letters since March.
Card 7 — "It reminded me the night before a deadline I had already missed once."
Card 8 — Free for your first three students. Link in bio.`,
    meta: [
      { label: "Cards", value: "8" },
      { label: "Platform", value: "Instagram" },
    ],
  },
  {
    id: "tpl_social_short",
    name: "Short-form script",
    kind: "social",
    category: "Social",
    description:
      "A 30-second vertical script with the hook in the first two seconds.",
    tags: ["tiktok", "reels", "shorts"],
    href: "/app/video",
    cta: "Open in video studio",
    body: `[0:00] HOOK — "41 leads. 1 customer. Here's why."
[0:02] "Most teams define a lead as 'filled in a form'."
[0:06] "Form fills don't buy anything."
[0:09] "One of our clients had 41 form fills last quarter."
[0:12] "Three people opened the follow-up email."
[0:15] "One took a call. Zero closed."
[0:18] "We changed one thing: a lead is someone who took an action you can name."
[0:24] "Same month, 19 real conversations."
[0:28] "Your CRM is probably lying to you too."
[0:30] CTA — "Comment AUDIT and I'll send the 5-line checklist."`,
    meta: [
      { label: "Length", value: "30s" },
      { label: "Format", value: "9:16" },
    ],
  },

  /* --- email --- */
  {
    id: "tpl_email_launch",
    name: "Launch announcement",
    kind: "email",
    category: "Email",
    description:
      "The five-part launch email: context, problem, proof, offer, one ask.",
    tags: ["launch", "newsletter", "beta"],
    href: "/app/campaigns",
    cta: "Open in campaigns",
    body: `Subject: The CRM lie we stopped telling (and what replaced it)

Hi {{first_name}},

Last quarter our own pipeline said 41 leads. It had 3.

The cost of that gap wasn't abstract — it was a quarter of payroll spent on
outbound that never touched anyone who'd actually buy.

So we rebuilt the definition. A lead is now someone who took an action you
can name: opened two emails, booked a call, finished a diagnostic.

Same traffic. Same team. 19 real conversations in month one.

Here's the checklist we use to run that audit yourself — it takes 20 minutes
and it's the first thing we show new clients.

[Get the checklist]

— Maya
Head of Growth, Northwind Consulting

P.S. It also works for education pipelines. Most of them have the same gap.`,
    meta: [
      { label: "Sections", value: "5" },
      { label: "Target open rate", value: "42%" },
    ],
  },
  {
    id: "tpl_email_winback",
    name: "Win-back sequence",
    kind: "email",
    category: "Email",
    description:
      "Three emails over ten days: check-in, proof, door-open.",
    tags: ["winback", "lifecycle", "re-engagement"],
    href: "/app/campaigns",
    cta: "Open in campaigns",
    body: `Email 1 (Day 0) — "Still on the list?"
Email 2 (Day 4) — "Three things changed since we spoke"
Email 3 (Day 10) — "Closing the loop"

Email 1 body:
Hi {{first_name}},

We spoke in {{month}} about {{pain_point}}. You said you'd think about it in {{month}}.

No chase here — one quick question: is this still something you want to solve
this quarter?

[Yes, still on it] [Not right now]

Email 2 body:
Since we last spoke:
→ We added {{new_capability}}
→ Average time-to-value dropped from {{old}} to {{new}}
→ {{n}} similar teams have shipped since {{month}}

Here's the two-minute version: [link]

Email 3 body:
I've closed the loop on {{project}} — keeping it simple.

If it isn't a priority right now, that's genuinely fine. Reply with "later"
and I'll stop emailing.

Otherwise, [book 20 minutes].

Either way, thanks for your time.`,
    meta: [
      { label: "Emails", value: "3" },
      { label: "Span", value: "10 days" },
    ],
  },

  /* --- agents --- */
  {
    id: "tpl_agent_enricher",
    name: "Lead enricher",
    kind: "agent",
    category: "Agents",
    description:
      "Reads a CSV, resolves firmographics, scores against your ICP, writes back to the CRM.",
    tags: ["enrichment", "gtm", "icp"],
    href: "/app/agents",
    cta: "Open in agent builder",
    body: `Tools: read_csv → search_web → enrich_company → score_lead → write_crm

Prompt:
Enrich and score the leads in imports/leads-q3.csv against our EMEA SaaS ICP
(50–500 employees, Series A–C, sells to procurement). Write qualified records
to the CRM and flag anything ambiguous for review.

Stop conditions:
  goal      — final answer names the count promoted and the count flagged
  steps     — 8 tool calls maximum
  repeat    — identical tool plus identical arguments halts the run
  clock     — 30 second wall clock, 5 second per tool timeout

Expected output:
  12 qualified (score ≥ 70) · 9 nurture · 3 flagged for review`,
    meta: [
      { label: "Tools", value: "5" },
      { label: "Budget", value: "8 steps" },
    ],
  },
  {
    id: "tpl_agent_repurposer",
    name: "Content repurposer",
    kind: "agent",
    category: "Agents",
    description:
      "One article becomes a thread, a carousel, a newsletter and two short scripts.",
    tags: ["content", "repurpose", "marketing"],
    href: "/app/agents",
    cta: "Open in agent builder",
    body: `Tools: read_doc → rewrite → humanize → generate_captions → schedule_post

Prompt:
Read the latest article in the library. Rewrite it to 400 words in a punchy,
plain-spoken tone, run the six-pass humaniser, generate captions for a
58-second short, then queue a LinkedIn post and an X thread for tomorrow
at 09:00 local time.

Stop conditions:
  goal      — all five scheduled items report a queue id
  steps     — 6 tool calls maximum
  repeat    — halts if the same file is rewritten twice
  clock     — 45 second wall clock

Expected output:
  2 posts queued · 5 caption cues · humaniser score 61 → 88`,
    meta: [
      { label: "Tools", value: "5" },
      { label: "Budget", value: "6 steps" },
    ],
  },
  {
    id: "tpl_agent_advisor",
    name: "Application advisor",
    kind: "agent",
    category: "Agents",
    description:
      "Matches a student profile against university entry requirements and explains the gaps.",
    tags: ["education", "matching", "compliance"],
    href: "/app/agents",
    cta: "Open in agent builder",
    body: `Tools: read_profile → search_courses → check_entry → draft_rationale

Prompt:
For the selected student, find every course whose entry requirements they
currently meet. Ignore courses where any band requirement exceeds their
score. For each match, write two sentences explaining why they fit.

Stop conditions:
  goal      — a ranked shortlist with a rationale per course
  steps     — 8 tool calls maximum
  repeat    — halts if the same course is checked twice
  clock     — 40 second wall clock

Expected output:
  4 eligible courses · 14 rejected with a named failing band`,
    meta: [
      { label: "Tools", value: "4" },
      { label: "Budget", value: "8 steps" },
    ],
  },

  /* --- study --- */
  {
    id: "tpl_study_ielts",
    name: "IELTS 8-week plan",
    kind: "study",
    category: "Study",
    description:
      "A weekly plan that front-loads the weakest band and tapers the mock tests.",
    tags: ["ielts", "plan", "students"],
    href: "/app/study",
    cta: "Open in study planner",
    body: `Week 1 — Listening: section 1–2 drills, 5 × 30 min
Week 2 — Listening: section 3–4, 5 × 30 min
Week 3 — Reading: T/F/NG under time pressure, 4 × 45 min
Week 4 — Reading: matching headings, 4 × 45 min
Week 5 — Writing: task 1 charts, 3 × 40 min
Week 6 — Writing: task 2 essay, 3 × 60 min
Week 7 — Speaking: parts 2–3, 5 × 20 min
Week 8 — Full mock, review every wrong answer, 2 × 3 h

Rule: every session logs a confidence score 1–5. Any skill averaging under 3
gets an extra session the following week.`,
    meta: [
      { label: "Weeks", value: "8" },
      { label: "Sessions", value: "31" },
    ],
  },
  {
    id: "tpl_study_admission",
    name: "Post-offer plan",
    kind: "study",
    category: "Study",
    description:
      "Everything that has to happen between a conditional offer and enrolment.",
    tags: ["visa", "deposit", "enrolment"],
    href: "/app/study",
    cta: "Open in study planner",
    body: `Day 0    — Accept the offer, pay the deposit
Day 1    — Request the CAS letter (2–3 working days)
Day 3    — Book the English test if the condition is unproven
Day 10   — Submit the visa application
Day 14   — Biometrics appointment
Day 21   — Upload documents, verify the visa status
Day 28   — Pre-departure briefing, accommodation contract
Day 35   — Flight, airport transfer, enrolment documents

Blocks on the critical path:
→ CAS letter cannot start without a deposit receipt
→ Visa appointment slots in peak season book out 6 weeks ahead
→ Accommodation contracts are non-refundable after day 14`,
    meta: [
      { label: "Steps", value: "8" },
      { label: "Critical path", value: "3 blocks" },
    ],
  },

  /* --- briefs --- */
  {
    id: "tpl_brief_seo",
    name: "SEO content brief",
    kind: "brief",
    category: "Content",
    description:
      "A brief that names the target query, the pages to beat and the angle to take.",
    tags: ["seo", "brief", "writing"],
    href: "/app/content",
    cta: "Open in content studio",
    body: `Target query: "how much does a UK university cost for international students"
Search intent: commercial investigation — they want a number and a breakdown
Pages to beat: 2 university microsites (both hide the total behind a form)
Our angle: show the full three-year cost, including the thing nobody mentions —
the "visa health surcharge" that adds £776 per year.

Must include:
→ Total cost range by subject and by country of origin
→ A worked example, in GBP, for one realistic course
→ What scholarships actually change (and what they don't)
→ A comparison table for the six most-chosen courses

Word count: 1,400–1,800
Target score: 85+
Internal links: universities catalogue, tuition calculator, scholarship guide`,
    meta: [
      { label: "Words", value: "1,400–1,800" },
      { label: "Target score", value: "85+" },
    ],
  },
  {
    id: "tpl_brief_webinar",
    name: "Webinar run-of-show",
    kind: "brief",
    category: "Content",
    description:
      "A timed run-of-show for a 45-minute education webinar, with the Q&A rules.",
    tags: ["webinar", "event", "education"],
    href: "/app/events",
    cta: "Open in events",
    body: `00:00–00:03  Cold open — the single most expensive mistake students make
00:03–00:08  Who this is for (and who it isn't)
00:08–00:18  The three-bucket system: safety, fit, prestige
00:18–00:26  Live example — re-ranking one real shortlist
00:26–00:31  Live example — checking one IELTS condition against three courses
00:31–00:38  Q&A, first three questions submitted in advance
00:38–00:43  The offer: checklist + free 15-minute review
00:43–00:45  Close and hand to the on-call adviser

Rules:
→ No slides for the first 30 seconds
→ Answer every question once, then move on
→ The offer is mentioned exactly twice`,
    meta: [
      { label: "Runtime", value: "45 min" },
      { label: "Slides", value: "6" },
    ],
  },

  /* --- playbooks --- */
  {
    id: "tpl_playbook_enrichment",
    name: "GTM enrichment playbook",
    kind: "playbook",
    category: "Playbooks",
    description:
      "The exact order to enrich, score, write and follow up — with the failure modes.",
    tags: ["gtm", "enrichment", "process"],
    href: "/app/leads",
    cta: "Open in lead enrichment",
    body: `1. Define the ICP as three hard constraints plus one soft signal.
   Hard constraints are testable. "Good companies" is not.

2. Enrich in this order:
   Domain → headcount → industry → tech stack → funding.
   Enriching tech stack before headcount wastes quota on companies too
   small to buy.

3. Score against the ICP. Anything under 40 goes to nurture, not to a rep.

4. Write the first message referencing something only a person who
   enriched properly would know.

5. Follow up once, on day four, with new information rather than a nudge.

Failure modes we have seen:
→ Enriching before filtering (wastes 60% of quota)
→ Scoring on company size only (rewards small firms that cannot buy)
→ Follow-ups that say "just checking in"`,
    meta: [
      { label: "Steps", value: "5" },
      { label: "Failure modes", value: "3" },
    ],
  },
  {
    id: "tpl_playbook_stalls",
    name: "Application stall playbook",
    kind: "playbook",
    category: "Playbooks",
    description:
      "What to do when 43% of applications stall on the same document.",
    tags: ["education", "blockers", "process"],
    href: "/app/applications",
    cta: "Open in applications",
    body: `Signal: the applications board shows the same blocker on more than a
third of live applications.

Reference letters cause 43% of stalls. Why:
→ The referee does not know what is expected of them
→ The deadline arrives before the referee is asked
→ There is no way to check the referee actually wrote one

Playbook:
1. Identify the blocker from the board, not from memory.
2. Send the referee a template they can complete in five minutes.
3. Ask for the letter at the point of application, not a week before.
4. Track referee acceptance as a separate status.
5. Offer a university reference service as a fallback — priced as a
   service, never as a favour.

Expected effect: stalls move from 43% to under 15% in one cohort.`,
    meta: [
      { label: "Steps", value: "5" },
      { label: "Target", value: "< 15% stalls" },
    ],
  },

  /* --- video --- */
  {
    id: "tpl_video_short",
    name: "60-second explainer",
    kind: "video",
    category: "Video",
    description:
      "Six scenes, one argument, captions aligned — ready for shorts and reels.",
    tags: ["short", "explainer", "shorts"],
    href: "/app/video",
    cta: "Open in video studio",
    body: `Scene 1 — 0:00–0:05  Hook: "Your CRM is lying to you."
Scene 2 — 0:05–0:15  Proof: 41 form fills, 3 opens, 1 call, 0 sales
Scene 3 — 0:15–0:30  Cause: a definition of "lead" that measures activity, not intent
Scene 4 — 0:30–0:45  Fix: redefine the lead as a named action
Scene 5 — 0:45–0:55  Result: same traffic, 19 conversations in month one
Scene 6 — 0:55–1:00  CTA: comment AUDIT

Voice: Aria · 150 wpm · Format 9:16 · Captions on`,
    meta: [
      { label: "Scenes", value: "6" },
      { label: "Runtime", value: "60s" },
    ],
  },
  {
    id: "tpl_video_consult",
    name: "Student consultancy reel",
    kind: "video",
    category: "Video",
    description:
      "A 90-second reel that shows the service working on a real student.",
    tags: ["education", "reel", "testimonial"],
    href: "/app/video",
    cta: "Open in video studio",
    body: `Scene 1 — 0:00–0:08  "I had three offers and no idea which to take."
Scene 2 — 0:08–0:22  Show the shortlist board: safety, fit, prestige
Scene 3 — 0:22–0:40  Show one course being checked against the IELTS condition
Scene 4 — 0:40–0:58  Show the timeline: deposit, CAS, visa, enrolment
Scene 5 — 0:58–1:15  "She got into Edinburgh and it cost 9% less than the offer we nearly took."
Scene 6 — 1:15–1:30  CTA: book a free 15-minute review

Voice: Nova · 155 wpm · Format 9:16 · Captions on`,
    meta: [
      { label: "Scenes", value: "6" },
      { label: "Runtime", value: "90s" },
    ],
  },

  /* --- seo --- */
  {
    id: "tpl_seo_prioritise",
    name: "SEO triage order",
    kind: "seo",
    category: "SEO",
    description:
      "The order we fix things in — cheap wins first, structural work last.",
    tags: ["audit", "triage", "fixes"],
    href: "/app/seo",
    cta: "Open in SEO auditor",
    body: `1. Broken links — fix first. Costs minutes, breaks trust immediately.
2. Missing title and meta on high-traffic pages — largest CTR available.
3. Missing H1 or duplicate H1 — cheap, and it confuses crawlers.
4. Missing image alt text — accessibility win and a ranking win.
5. Structured data on money pages — schema unlocks rich results.
6. Canonical tags on paginated and duplicated views.
7. Internal link depth — pages more than four clicks from the home page.
8. Reading level — last. Useful for intent, rarely decisive alone.

Do not start with content. A new page on a broken site is a new broken page.`,
    meta: [
      { label: "Steps", value: "8" },
      { label: "First win", value: "~5 min" },
    ],
  },

  /* --- api --- */
  {
    id: "tpl_api_weather",
    name: "Weather — no auth",
    kind: "api",
    category: "API playbooks",
    description:
      "A free, no-auth endpoint with a clean JSON shape — the fastest way to test your wiring.",
    tags: ["no-auth", "json", "quickstart"],
    href: "/app/apis",
    cta: "Open the API bench",
    body: `GET https://api.open-meteo.com/v1/forecast?latitude=51.51&longitude=-0.13&current=temperature_2m

{
  "latitude": 51.5,
  "longitude": -0.12,
  "current": {
    "time": "2026-03-14T09:00",
    "temperature_2m": 11.4,
    "weather_code": 3
  }
}

Why it is a good first test:
→ No key, no signup, no rate-limit maze
→ Predictable shape
→ Fast enough to iterate on

Swap it for a real endpoint once your request layer is proven.`,
    meta: [
      { label: "Auth", value: "None" },
      { label: "Latency", value: "~90ms" },
    ],
  },
  {
    id: "tpl_api_webhook",
    name: "Webhook delivery recipe",
    kind: "api",
    category: "API playbooks",
    description:
      "How to receive, verify and retry webhooks without duplicating events.",
    tags: ["webhooks", "events", "retry"],
    href: "/app/apis",
    cta: "Open the API bench",
    body: `1. Verify the signature on every request, before parsing the body.
   Compare using a constant-time function, not ===.

2. Respond 2xx immediately. Queue the work. Never process inline.

3. Make the handler idempotent. Store the event id and reject duplicates
   with a 200 — the sender will keep retrying otherwise.

4. Expect retries. Most senders retry on any non-2xx, with exponential
   backoff over 24 hours.

5. Reconcile on a schedule. List events since your last successful cursor
   and reprocess what you missed.

Failure mode to avoid: returning 500 for an event you have already handled.`,
    meta: [
      { label: "Steps", value: "5" },
      { label: "Retry window", value: "24 h" },
    ],
  },
];

export const templateCategories = Array.from(
  new Set(workspaceTemplates.map((t) => t.category)),
);

export const templateKinds: { id: TemplateKind; label: string }[] = [
  { id: "diagram", label: "Diagrams" },
  { id: "social", label: "Social" },
  { id: "email", label: "Email" },
  { id: "agent", label: "Agents" },
  { id: "study", label: "Study" },
  { id: "brief", label: "Content" },
  { id: "playbook", label: "Playbooks" },
  { id: "video", label: "Video" },
  { id: "seo", label: "SEO" },
  { id: "api", label: "API" },
];
