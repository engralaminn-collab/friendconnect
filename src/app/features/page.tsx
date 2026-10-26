import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Clapperboard,
  GraduationCap,
  KanbanSquare,
  MessageSquare,
  Newspaper,
  Plug,
  Radar,
  Search,
  Share2,
  StickyNote,
  Workflow,
  AudioLines,
  BookOpen,
  BarChart3,
  Settings2,
  Webhook,
  UsersRound,
  ImageIcon,
  Cpu,
  Truck,
  ScanText,
  LayoutGrid,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem, GradientText } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Seven pillars, thirty-four modules: revenue, education consultancy, AI marketing, creative studios, agents, knowledge systems, community and operational insight.",
};

interface Feature {
  icon: React.ElementType;
  name: string;
  blurb: string;
  points: string[];
}

const pillars: { id: string; title: string; accent: string; lead: string; features: Feature[] }[] = [
  {
    id: "crm",
    title: "Revenue operations",
    accent: "var(--color-brand-500)",
    lead: "A CRM that writes its own activity log. Move a deal on the board and the timeline, the forecast and the activity feed all update — no admin, no drift.",
    features: [
      {
        icon: KanbanSquare,
        name: "Pipeline board",
        blurb: "Six stages with drag-and-drop, weighted forecast and a per-stage conversion funnel.",
        points: [
          "Drag a card between stages to move the deal",
          "Weighted forecast recalculates on every move",
          "Stage changes are written to the activity log automatically",
          "Filter by owner, source, tag, country or close date",
        ],
      },
      {
        icon: UsersRound,
        name: "Contact graph",
        blurb: "Every contact, company and conversation connected, with enriched firmographics.",
        points: [
          "Email, phone, city, country and title in one record",
          "Star, tag, filter and bulk-select",
          "Contact graph links people to accounts and threads",
          "Duplicate detection on email and domain",
        ],
      },
      {
        icon: Radar,
        name: "Lead enrichment",
        blurb: "Prospect against your ICP, enrich with firmographics, then score and route.",
        points: [
          "ICP builder with must-have and disqualifier rules",
          "Signal-based scoring with transparent reasons",
          "Enrichment pipeline shows what each step found",
          "One-click promotion into the CRM",
        ],
      },
    ],
  },
  {
    id: "education",
    title: "Education consultancy",
    accent: "var(--color-accent-500)",
    lead: "The full student journey — enquiry, shortlist, documents, offer, visa, CAS — with the chasing, tracking and checklists that usually fall through.",
    features: [
      {
        icon: GraduationCap,
        name: "Student records",
        blurb: "Every enquiry through to enrolment, with budget, level and target course.",
        points: [
          "Seven lifecycle statuses with colour coding",
          "Target course linked to the university catalogue",
          "Budget and funding context on the record",
          "Applicant portal link generated per student",
        ],
      },
      {
        icon: Check,
        name: "Application tracker",
        blurb: "Document checklists that compute progress, and deadlines that surface early.",
        points: [
          "Per-application checklist with live progress",
          "Due dates ranked by urgency across all students",
          "Blocked items flagged where a third party is the bottleneck",
          "Offer, interview and rejection states",
        ],
      },
      {
        icon: StickyNote,
        name: "Study planner",
        blurb: "Revision sessions with planned versus logged time and a confidence score.",
        points: [
          "Subject-level planning with topic detail",
          "Logged minutes compared against the plan",
          "Confidence rating to spot weak areas",
          "Weekly focus summary for students",
        ],
      },
    ],
  },
  {
    id: "marketing",
    title: "AI marketing",
    accent: "var(--color-signal-500)",
    lead: "Write, humanise, distribute and measure. Every piece of content carries its own SEO score and can be repurposed into every channel.",
    features: [
      {
        icon: Newspaper,
        name: "Content studio",
        blurb: "A long-form editor with a built-in humaniser and live SEO scoring.",
        points: [
          "Six-pass humaniser strips machine rhythm and hedging",
          "Word count, reading time and conversion tracking",
          "SEO score computed from the draft itself",
          "Status pipeline from idea to published",
        ],
      },
      {
        icon: Share2,
        name: "Social planner",
        blurb: "Six networks, one queue, scheduled publishing with platform-aware formats.",
        points: [
          "LinkedIn, X, Instagram, Facebook, TikTok and YouTube",
          "Platform-aware media and hashtag handling",
          "Queue view across a full month",
          "Engagement tracking on published posts",
        ],
      },
      {
        icon: Search,
        name: "SEO auditor",
        blurb: "Eight on-page and technical checks with a prioritised fix list.",
        points: [
          "Title, meta, headings, links, alt text, schema, canonical",
          "Weighted score out of 100",
          "Specific remediation text per failed check",
          "Score history so regressions are visible",
        ],
      },
      {
        icon: BarChart3,
        name: "Campaign analytics",
        blurb: "Email, ads, webinar and SMS in one board with funnel math.",
        points: [
          "Open, click and conversion rates per campaign",
          "Budget and cost-per-conversation alongside volume",
          "Channel comparison in a single view",
          "Funnel chart across the whole mix",
        ],
      },
    ],
  },
  {
    id: "studios",
    title: "Creative studios",
    accent: "var(--color-brand-500)",
    lead: "Diagrams, video and voice — all connected. A script becomes a scene list becomes narration becomes captions, without leaving the workspace.",
    features: [
      {
        icon: Workflow,
        name: "Diagram designer",
        blurb: "A node-and-edge canvas with editable nodes and export to SVG or Mermaid.",
        points: [
          "Six node types: process, decision, data, actor, start, end",
          "Twelve templates across funnels, journeys and systems",
          "Drag to reposition, click to relabel, wire with a click",
          "Export SVG or Mermaid source",
        ],
      },
      {
        icon: Clapperboard,
        name: "Video studio",
        blurb: "Script, hook, scene list, shot notes and caption timing.",
        points: [
          "Hook library with six proven patterns",
          "Scene list with narration, shot and transition",
          "Auto-generated caption timing",
          "Aspect ratio presets for every platform",
        ],
      },
      {
        icon: AudioLines,
        name: "Voice studio",
        blurb: "Browser-native text to speech with rate, pitch and a waveform preview.",
        points: [
          "Multiple voice profiles with rate and pitch control",
          "Live waveform render of the clip",
          "Estimated duration computed from word count",
          "Downloadable audio and caption files",
        ],
      },
    ],
  },
  {
    id: "agents",
    title: "Agent builder",
    accent: "var(--color-accent-500)",
    lead: "Bounded tool-calling loops. Four independent stop conditions mean a run always terminates, and every step is logged so it can be replayed.",
    features: [
      {
        icon: Bot,
        name: "Bounded agent loops",
        blurb: "Goal predicate, step budget, repetition guard and wall-clock budget.",
        points: [
          "Every run shows its full step trace with timings",
          "Repetition guard halts identical tool calls",
          "Step and wall-clock budgets enforced per run",
          "Failures are returned to the model as tool results",
        ],
      },
      {
        icon: Plug,
        name: "Tool registry",
        blurb: "A shared library of tools the agents, plugins and API bench all use.",
        points: [
          "Search, enrich, score, render, publish and schedule tools",
          "Schema-validated arguments on every tool",
          "Tool reuse across agents and plugins",
          "Latency shown per call",
        ],
      },
      {
        icon: Webhook,
        name: "Run history",
        blurb: "Every run retained with its prompt, trace and outcome.",
        points: [
          "Success rate per agent",
          "Replayable step traces",
          "Error classification and halt reasons",
          "Export a run as JSON",
        ],
      },
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge & community",
    accent: "var(--color-signal-500)",
    lead: "Notes, a canonical wiki, an API directory and a plugin marketplace — plus the community feed that keeps the whole thing human.",
    features: [
      {
        icon: StickyNote,
        name: "Notes",
        blurb: "Working memory with tags, pinning and a quick editor.",
        points: [
          "Markdown-friendly content with tags",
          "Pinned notes surface first",
          "Full-text search across every note",
          "One-click export of a note as an article",
        ],
      },
      {
        icon: BookOpen,
        name: "Wiki",
        blurb: "Canonical pages with categories and cross-links.",
        points: [
          "Page categories and summaries",
          "Cross-linked related pages",
          "Last-edited tracking",
          "Promote a note into a canonical page",
        ],
      },
      {
        icon: Plug,
        name: "API directory",
        blurb: "Browse public APIs and fire test requests from the browser.",
        points: [
          "Fifteen curated APIs with auth and CORS metadata",
          "Category and tag filters",
          "In-browser request bench with timing and status",
          "Copy-ready endpoint snippets",
        ],
      },
      {
        icon: MessageSquare,
        name: "Community & inbox",
        blurb: "A feed for members and one inbox for every channel.",
        points: [
          "Posts with topics, tags and reactions",
          "Pinned announcements",
          "SMS, WhatsApp, email and VoIP threads in one list",
          "Unread counts shared across channels",
        ],
      },
    ],
  },
  {
    id: "insights",
    title: "Insights & operations",
    accent: "var(--color-violet-500)",
    lead: "The layer that turns the rest of the workspace into decisions — market signals, web research, freight, and a dashboard builder that lets you compose your own view.",
    features: [
      {
        icon: Radar,
        name: "Market radar",
        blurb: "Signals from competitors, search, social and policy — with a forecast for every series.",
        points: [
          "Eight live signals with impact and confidence scores",
          "Five competitor profiles with strengths and weaknesses",
          "Seasonal forecasts with an explicit confidence band",
          "Scan a market on demand and plan against what you find",
        ],
      },
      {
        icon: ScanText,
        name: "Web research",
        blurb: "Crawl a page clean, then let an agent read eight pages and cite every fact.",
        points: [
          "Five output formats including markdown and link lists",
          "Main-content extraction that strips navigation and cookie banners",
          "A blocked-crawl record instead of a silent retry",
          "Deep research that cross-checks the claims it keeps",
        ],
      },
      {
        icon: Truck,
        name: "Logistics",
        blurb: "Shipments, carriers, customs holds and cargo value on one board.",
        points: [
          "Air, sea, road and rail with a status board",
          "Customs holds surfaced the moment a document is missing",
          "Incoterms and cargo value per shipment",
          "A customs checklist that ships with the workspace",
        ],
      },
      {
        icon: LayoutGrid,
        name: "Dashboard builder",
        blurb: "Drag widgets onto a grid, point them at any dataset, save the result.",
        points: [
          "Seven widget types across nine datasets",
          "Drag from the palette, resize and reposition in the inspector",
          "Live charts bound to real workspace records",
          "Save dashboards and reload them in one click",
        ],
      },
      {
        icon: ImageIcon,
        name: "Image studio",
        blurb: "Prompt, parameterise and queue images, with a node-graph workflow editor.",
        points: [
          "Six models compared on speed, quality and cost",
          "A prompt library with positive and negative prompts",
          "Four ComfyUI-style workflow graphs you can export as JSON",
          "Deterministic offline rendering — no API key needed",
        ],
      },
      {
        icon: Cpu,
        name: "Model playground",
        blurb: "Run one prompt across several models and compare cost, latency and answer.",
        points: [
          "Twelve models from six providers, priced per million tokens",
          "Side-by-side answers with per-model cost estimates",
          "A smart router that picks the cheapest model that can do the job",
          "Capability matrix for reasoning, vision, tools and open weights",
        ],
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-dvh bg-[var(--fc-surface-2)]">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[var(--fc-line)]">
        <div className="pointer-events-none absolute inset-0 fc-aurora opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="chip border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
              34 modules · 7 pillars
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Everything below ships in <GradientText>every plan</GradientText>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[var(--fc-fg-muted)]">
              We do not gate features behind tiers. Seat count is the only thing that
              changes. Here is the complete surface area of the workspace.
            </p>
          </Reveal>

          <nav className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
            {pillars.map((p) => (
              <a
                key={p.id}
                href={`#${p.id}`}
                className="rounded-full border border-[var(--fc-line)] bg-[var(--fc-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--fc-fg-muted)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-500)]"
              >
                {p.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {pillars.map((pillar) => (
        <section
          key={pillar.id}
          id={pillar.id}
          className="scroll-mt-20 border-b border-[var(--fc-line)] py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-3xl">
              <span
                className="mb-4 block h-1 w-12 rounded-full"
                style={{ backgroundColor: pillar.accent }}
              />
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{pillar.title}</h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--fc-fg-muted)]">
                {pillar.lead}
              </p>
            </Reveal>

            <Stagger className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pillar.features.map((f) => (
                <StaggerItem key={f.name}>
                  <div className="fc-card flex h-full flex-col p-6">
                    <span
                      className="grid size-11 place-items-center rounded-xl text-white"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${pillar.accent}, color-mix(in oklab, ${pillar.accent} 55%, var(--color-accent-400)))`,
                      }}
                    >
                      <f.icon className="size-5" />
                    </span>
                    <h3 className="mt-4 text-[16px] font-semibold">{f.name}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {f.blurb}
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5 border-t border-[var(--fc-line)] pt-5">
                      {f.points.map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-[13px]">
                          <Check
                            className="mt-0.5 size-3.5 shrink-0 text-emerald-500"
                            strokeWidth={3}
                          />
                          <span className="text-[var(--fc-fg-muted)]">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      ))}

      <section id="roadmap" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              And a few things on the way
            </h2>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
            {[
              {
                t: "Realtime multiplayer boards",
                d: "Cursor presence and conflict-free edits on the pipeline and diagram canvases.",
                s: "In progress",
              },
              {
                t: "Native mobile apps",
                d: "Push notifications for application deadlines and inbox threads.",
                s: "Planned",
              },
              {
                t: "Self-hosted deployment",
                d: "A container image with the same workspace running on your own infrastructure.",
                s: "Planned",
              },
              {
                t: "Plugin SDK v2",
                d: "Signed plugins, sandboxed permissions and a published review process.",
                s: "In progress",
              },
            ].map((r) => (
              <div key={r.t} className="fc-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[15px] font-semibold">{r.t}</h3>
                  <Badge tone={r.s === "In progress" ? "accent" : "neutral"}>{r.s}</Badge>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {r.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Settings2 className="mx-auto size-8 text-[var(--color-brand-500)]" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight">Ready to see it live?</h2>
          <p className="mt-4 text-[var(--fc-fg-muted)]">
            The workspace opens with a full sample workspace already loaded.
          </p>
          <Link href="/app" className="btn btn-primary btn-lg mt-8">
            Open the workspace
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
