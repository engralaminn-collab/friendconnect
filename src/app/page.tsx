import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BookOpen,
  Clapperboard,
  Check,
  Database,
  GraduationCap,
  KanbanSquare,
  MessageSquare,
  Newspaper,
  Plug,
  Radar,
  Search,
  Sparkles,
  Workflow,
  AudioLines,
  UsersRound,
  Quote,
  Play,
  Zap,
  ShieldCheck,
  Globe2,
  LineChart,
  LayoutGrid,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ProductMock } from "@/components/marketing/ProductMock";
import { Reveal, Stagger, StaggerItem, GradientText } from "@/components/ui/Reveal";
import { AreaChart, FunnelChart, DonutChart } from "@/components/charts";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[var(--fc-surface-2)]">
      <MarketingHeader />

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 fc-aurora opacity-70" />
        <div className="pointer-events-none absolute inset-0 fc-grid-bg [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 size-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(59,100,246,.16),transparent_68%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--fc-line)] bg-[var(--fc-surface)]/70 px-3 py-1.5 text-xs font-semibold text-[var(--fc-fg-muted)] backdrop-blur">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </span>
                  FriendConnect 2.0 — agents, studios and the marketing kit are live
                  <ArrowRight className="size-3.5" />
                </span>
              </Reveal>

              <Reveal delay={0.06}>
                <h1 className="mt-6 text-[2.6rem] font-bold leading-[1.04] tracking-tight sm:text-[3.4rem] lg:text-[3.9rem]">
                  Everything your team does,{" "}
                  <GradientText>in one workspace</GradientText>
                </h1>
              </Reveal>

              <Reveal delay={0.12}>
                <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-[var(--fc-fg-muted)]">
                  CRM and pipeline, education consultancy, an AI marketing studio, a
                  diagram designer, video and voice studios, a bounded agent builder,
                  a knowledge base and a community feed — connected by one data
                  layer, not seven tabs.
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/app" className="btn btn-primary btn-lg">
                    Open the workspace
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/showcase" className="btn btn-secondary btn-lg">
                    <Play className="size-4" />
                    See what is inside
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.24}>
                <ul className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-2.5 text-[13px] text-[var(--fc-fg-muted)]">
                  {[
                    "Runs entirely in your browser",
                    "No seat-based pricing traps",
                    "Every module shares one data layer",
                    "Open API and plugin marketplace",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <Reveal delay={0.15} className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[linear-gradient(120deg,rgba(59,100,246,.18),rgba(20,184,166,.16))] blur-2xl" />
              <ProductMock />
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { k: "28", v: "modules" },
                  { k: "140+", v: "features" },
                  { k: "0", v: "setup calls" },
                ].map((s) => (
                  <div
                    key={s.k}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)]/80 px-3 py-2.5 backdrop-blur"
                  >
                    <div className="font-display text-lg font-bold leading-none">{s.k}</div>
                    <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ========================== TRUST MARQUEE ========================== */}
      <section className="border-y border-[var(--fc-line)] bg-[var(--fc-surface)] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--fc-fg-subtle)]">
            Trusted by teams in revenue, education and creative studios
          </p>
          <div className="fc-mask-fade-x mt-5 overflow-hidden">
            <div className="flex w-max animate-marquee items-center gap-12">
              {[
                "Northwind Analytics",
                "Meridian Health",
                "Kite Education",
                "Lumen Retail",
                "Orbital Labs",
                "Verdant Capital",
                "Saffron Media",
                "Atlas Freight",
              ].map((name) => (
                <span
                  key={name}
                  className="whitespace-nowrap font-display text-lg font-semibold tracking-tight text-[var(--fc-fg)]/45"
                >
                  {name}
                </span>
              ))}
              {[
                "Northwind Analytics",
                "Meridian Health",
                "Kite Education",
                "Lumen Retail",
                "Orbital Labs",
                "Verdant Capital",
                "Saffron Media",
                "Atlas Freight",
              ].map((name) => (
                <span
                  key={`${name}-b`}
                  className="whitespace-nowrap font-display text-lg font-semibold tracking-tight text-[var(--fc-fg)]/45"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================ STATS ============================ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "12,480", l: "Qualified leads enriched", i: Radar },
            { k: "£4.2m", l: "Pipeline under management", i: LineChart },
            { k: "340", l: "Teams in the benchmark", i: BarChart3 },
            { k: "99.98%", l: "Workspace uptime", i: ShieldCheck },
          ].map((s) => (
            <StaggerItem key={s.l}>
              <div className="fc-card fc-card-hover h-full p-5">
                <s.i className="size-4 text-[var(--color-brand-500)]" />
                <div className="mt-3 font-display text-3xl font-bold tracking-tight">{s.k}</div>
                <div className="mt-1 text-sm text-[var(--fc-fg-muted)]">{s.l}</div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* =========================== FEATURES =========================== */}
      <section id="features" className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="chip border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
              Seven pillars
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              A platform, not a pile of tools
            </h2>
            <p className="mt-4 text-[var(--fc-fg-muted)]">
              Each module is genuinely useful on its own. Together they share one
              contact graph, one content library and one agent layer — so a lead in
              the pipeline becomes a student, a student becomes a subscriber, and a
              subscriber becomes a script.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeatureTile
              icon={KanbanSquare}
              title="Revenue pipeline"
              desc="Six-stage board, weighted forecast, drag-to-move stage changes that write an activity, and deal probability that reacts as you move."
              href="/features#crm"
              visual={<PipelineVisual />}
            />
            <FeatureTile
              icon={GraduationCap}
              title="Education consultancy"
              desc="Universities, courses, intakes and tuition, students with applications, and a document checklist that calculates progress as you tick."
              href="/features#education"
              visual={<ChecklistVisual />}
            />
            <FeatureTile
              icon={Newspaper}
              title="AI content studio"
              desc="Draft, rewrite and humanise in one editor. Six humanising passes strip the machine rhythm out of generated prose."
              href="/features#marketing"
              visual={<WaveVisual />}
            />
            <FeatureTile
              icon={Workflow}
              title="Diagram designer"
              desc="Drag nodes, wire edges, export SVG or Mermaid. Twelve templates covering funnels, journeys, systems and agent loops."
              href="/features#studios"
              visual={<DiagramVisual />}
            />
            <FeatureTile
              icon={Bot}
              title="Agent builder"
              desc="Bounded tool-calling loops with a goal predicate, step budget, repetition guard and wall-clock budget. Every run is replayable."
              href="/features#agents"
              visual={<AgentVisual />}
            />
            <FeatureTile
              icon={MessageSquare}
              title="Community & messaging"
              desc="A feed for your community plus one inbox for SMS, WhatsApp, email and VoIP threads with unified read state."
              href="/features#community"
              visual={<CommunityVisual />}
            />
            <FeatureTile
              icon={Radar}
              title="Market radar & research"
              desc="Live signals from competitors, search and policy, a forecast for every series, plus a web crawler and a deep-research agent."
              href="/features#insights"
              visual={<RadarVisual />}
            />
            <FeatureTile
              icon={LayoutGrid}
              title="Dashboard builder"
              desc="Drag widgets onto a grid, bind them to any dataset and save the view. Low-code, no config file, same canvas every time."
              href="/features#insights"
              visual={<DashboardVisual />}
            />
          </Stagger>
        </div>
      </section>

      {/* ========================= MODULE SPOTLIGHT ========================= */}
      <section className="border-t border-[var(--fc-line)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="chip border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-800 dark:bg-accent-900/40 dark:text-accent-300">
                Live workspace
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Numbers you can interrogate
              </h2>
              <p className="mt-4 text-[var(--fc-fg-muted)]">
                Every chart in FriendConnect is generated from the same live records
                you are editing. Filter the pipeline and the revenue chart answers
                instantly — no report builder, no stale exports.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Interactive SVG charts with hover detail — no chart library",
                  "Funnels, cohort heatmaps, radar scoring and area trends",
                  "Every widget is filterable by owner, stage, source or date",
                  "Share a filtered view with a permalink that preserves state",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="text-[var(--fc-fg-muted)]">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/app" className="btn btn-primary mt-8">
                Explore the dashboard
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="fc-card overflow-hidden p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                      Pipeline by stage
                    </span>
                    <span className="chip">This quarter</span>
                  </div>
                  <FunnelChart
                    stages={[
                      { label: "Leads", value: 1280, color: "#94a3b8" },
                      { label: "Qualified", value: 642, color: "#14b8a6" },
                      { label: "Proposal", value: 318, color: "#3b64f6" },
                      { label: "Negotiation", value: 141, color: "#8b5cf6" },
                      { label: "Won", value: 86, color: "#22c55e" },
                    ]}
                  />
                </div>
                <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    Acquisition mix
                  </div>
                  <DonutChart
                    size={150}
                    thickness={22}
                    centerLabel="Sourced"
                    centerValue="1.3k"
                    data={[
                      { label: "Inbound", value: 520 },
                      { label: "Outbound", value: 340 },
                      { label: "Partner", value: 260 },
                      { label: "Events", value: 160 },
                    ]}
                  />
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    Weekly revenue
                  </span>
                  <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                    +18.4%
                  </span>
                </div>
                <AreaChart
                  height={170}
                  labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]}
                  series={[
                    {
                      name: "This year",
                      data: [38, 44, 41, 58, 62, 71, 68, 84],
                      color: "var(--color-brand-500)",
                    },
                    {
                      name: "Last year",
                      data: [30, 33, 35, 40, 44, 49, 52, 58],
                      color: "var(--color-ink-400)",
                    },
                  ]}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========================== MARKETING KIT ========================== */}
      <section className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="chip border-signal-400/40 bg-signal-400/10 text-signal-600 dark:text-signal-300">
              Free download
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              The FriendConnect Marketing Kit
            </h2>
            <p className="mt-4 text-[var(--fc-fg-muted)]">
              Swipe files, copy templates, launch checklists and a benchmark report
              — the exact artefacts our own team uses to ship campaigns, packaged
              so you can start on Monday.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: "Launch checklists",
                desc: "Twelve checklists for product launch, webinar, report and paid push.",
                meta: "12 files",
              },
              {
                icon: BookOpen,
                title: "Copy templates",
                desc: "Landing pages, emails, ads and social, with the reasoning annotated.",
                meta: "48 templates",
              },
              {
                icon: BarChart3,
                title: "Swipe files",
                desc: "Annotated examples of landing pages that converted, and why.",
                meta: "96 examples",
              },
              {
                icon: Database,
                title: "Benchmark report",
                desc: "340 revenue teams surveyed — the full dataset and method.",
                meta: "42 pages",
              },
            ].map((k) => (
              <StaggerItem key={k.title}>
                <Link
                  href="/marketing-kit"
                  className="fc-card fc-card-hover group flex h-full flex-col p-5"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-accent-400))] text-white">
                    <k.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{k.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--fc-fg-muted)]">
                    {k.desc}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="chip">{k.meta}</span>
                    <ArrowRight className="size-4 text-[var(--fc-fg-subtle)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-brand-500)]" />
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ============================ TESTIMONIALS ============================ */}
      <section className="border-t border-[var(--fc-line)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What teams say after a quarter
            </h2>
          </Reveal>
          <Stagger className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote:
                  "We replaced four tools and a spreadsheet with this. The pipeline board writes its own activity log, so nobody has to admin it any more.",
                name: "Amara Osei",
                role: "VP Growth, Northwind Analytics",
                hue: 226,
              },
              {
                quote:
                  "Our consultants used to lose half a day per student on spreadsheets. The application checklists and document tracking removed that entirely.",
                name: "Aisha Rahman",
                role: "Education Consultant, Kite Education",
                hue: 12,
              },
              {
                quote:
                  "The agent builder is the first one I have used that actually terminates. Four stop conditions, a replay harness — it behaves like software, not a demo.",
                name: "Omar Haddad",
                role: "Frontend Engineer, Orbital Labs",
                hue: 34,
              },
            ].map((t) => (
              <StaggerItem key={t.name}>
                <figure className="fc-card flex h-full flex-col p-6">
                  <Quote className="size-5 text-[var(--color-brand-400)]" />
                  <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-[var(--fc-fg)]">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-[var(--fc-line)] pt-4">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                      style={{
                        backgroundImage: `linear-gradient(135deg, hsl(${t.hue} 72% 52%), hsl(${
                          (t.hue + 42) % 360
                        } 74% 44%))`,
                      }}
                    >
                      {t.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{t.name}</span>
                      <span className="block text-xs text-[var(--fc-fg-muted)]">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ============================= PRICING ============================= */}
      <section id="pricing" className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Pricing that does not punish growth
            </h2>
            <p className="mt-4 text-[var(--fc-fg-muted)]">
              Every plan includes the full workspace. You pay for seats, not for
              features — nothing important is held back.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-5 lg:grid-cols-3">
            {[
              {
                name: "Solo",
                price: "£0",
                period: "forever",
                desc: "One person, all modules, local-first storage.",
                features: [
                  "All 34 modules",
                  "Local-first storage",
                  "3 agent runs / day",
                  "Community feed",
                ],
                cta: "Start free",
                featured: false,
              },
              {
                name: "Team",
                price: "£24",
                period: "per seat / month",
                desc: "Shared workspace, live collaboration, unlimited agents.",
                features: [
                  "Everything in Solo",
                  "Shared CRM & pipeline",
                  "Unlimited agent runs",
                  "Marketing Kit + templates",
                  "API and plugin access",
                ],
                cta: "Start 14-day trial",
                featured: true,
              },
              {
                name: "Scale",
                price: "£61",
                period: "per seat / month",
                desc: "For consultancies running campaigns across many clients.",
                features: [
                  "Everything in Team",
                  "Multi-workspace & client spaces",
                  "Self-host or private cloud",
                  "SSO, audit log, SLA",
                  "Custom integrations",
                ],
                cta: "Talk to sales",
                featured: false,
              },
            ].map((p) => (
              <StaggerItem key={p.name}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border p-6",
                    p.featured
                      ? "border-transparent bg-[linear-gradient(150deg,var(--color-brand-600),var(--color-brand-500)_45%,var(--color-accent-500))] text-white shadow-[0_30px_70px_-30px_rgba(59,100,246,.75)]"
                      : "border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
                  )}
                >
                  {p.featured && (
                    <span className="absolute right-5 top-5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-bold tracking-tight">{p.price}</span>
                    <span
                      className={cn(
                        "text-sm",
                        p.featured ? "text-white/75" : "text-[var(--fc-fg-muted)]",
                      )}
                    >
                      {p.period}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-2.5 text-sm",
                      p.featured ? "text-white/80" : "text-[var(--fc-fg-muted)]",
                    )}
                  >
                    {p.desc}
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            p.featured ? "text-white" : "text-emerald-500",
                          )}
                          strokeWidth={2.6}
                        />
                        <span className={p.featured ? "text-white/90" : "text-[var(--fc-fg-muted)]"}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/app"
                    className={cn(
                      "btn mt-7 w-full",
                      p.featured ? "bg-white text-[var(--color-brand-700)] hover:bg-white/90" : "btn-secondary",
                    )}
                  >
                    {p.cta}
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ============================== CTA ============================== */}
      <section className="border-t border-[var(--fc-line)] py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-[var(--fc-line)] bg-[var(--fc-surface)] px-6 py-16 sm:px-12">
              <div className="pointer-events-none absolute inset-0 fc-aurora opacity-60" />
              <div className="relative">
                <span className="grid size-12 mx-auto place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-accent-400))] text-white">
                  <Sparkles className="size-6" />
                </span>
                <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
                  Your team already does all of this. Now do it in one place.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-[var(--fc-fg-muted)]">
                  Open the workspace with sample data pre-loaded — a pipeline, a
                  consultancy, a content calendar and a running agent. Nothing to
                  install.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/app" className="btn btn-primary btn-lg">
                    Open the workspace
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/contact" className="btn btn-secondary btn-lg">
                    Book a walkthrough
                  </Link>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--fc-fg-subtle)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Globe2 className="size-3.5" /> Runs in any modern browser
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" /> Your data stays local
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Plug className="size-3.5" /> Open API from day one
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

/* =========================== Feature tile =========================== */

function FeatureTile({
  icon: Icon,
  title,
  desc,
  href,
  visual,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  href: string;
  visual: React.ReactNode;
}) {
  return (
    <StaggerItem>
      <Link
        href={href}
        className="fc-card fc-card-hover group flex h-full flex-col overflow-hidden"
      >
        <div className="relative h-40 overflow-hidden border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
          {visual}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,var(--fc-surface))]" />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <span className="grid size-9 place-items-center rounded-lg bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
            <Icon className="size-4.5" />
          </span>
          <h3 className="mt-3.5 text-[15px] font-semibold">{title}</h3>
          <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
            {desc}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-brand-500)]">
            Learn more
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </StaggerItem>
  );
}

/* ============================ Mini visuals ============================ */

function PipelineVisual() {
  return (
    <div className="flex h-full gap-2">
      {[
        { l: "Lead", c: "#94a3b8", n: 6 },
        { l: "Proposal", c: "#3b64f6", n: 4 },
        { l: "Won", c: "#22c55e", n: 3 },
      ].map((col) => (
        <div key={col.l} className="flex-1 rounded-lg bg-[var(--fc-surface)] p-2">
          <div className="mb-2 flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: col.c }} />
            <span className="text-[9px] font-bold text-[var(--fc-fg-subtle)]">{col.l}</span>
          </div>
          {Array.from({ length: col.n }).map((_, i) => (
            <div
              key={i}
              className="mb-1.5 rounded-md border border-[var(--fc-line)] p-1.5"
              style={{ backgroundColor: `${col.c}12` }}
            >
              <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: `${col.c}55` }} />
              <div className="mt-1 h-1 w-2/3 rounded-full bg-[var(--fc-line-strong)]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ChecklistVisual() {
  const items = [
    { l: "Personal statement", d: true },
    { l: "IELTS certificate", d: true },
    { l: "Reference letter", d: false },
    { l: "Passport copy", d: false },
  ];
  return (
    <div className="h-full rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-[var(--fc-fg-subtle)]">APPLICATION</span>
        <span className="chip border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-800 dark:bg-accent-900/40 dark:text-accent-300">
          50%
        </span>
      </div>
      {items.map((i) => (
        <div key={i.l} className="flex items-center gap-2 py-1">
          <span
            className={cn(
              "grid size-3.5 place-items-center rounded-[5px] border",
              i.d
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-[var(--fc-line-strong)]",
            )}
          >
            {i.d && <Check className="size-2.5" strokeWidth={3.5} />}
          </span>
          <span
            className={cn(
              "text-[10px]",
              i.d ? "text-[var(--fc-fg-subtle)] line-through" : "text-[var(--fc-fg-muted)]",
            )}
          >
            {i.l}
          </span>
        </div>
      ))}
    </div>
  );
}

function WaveVisual() {
  const bars = [40, 70, 30, 90, 55, 75, 35, 62, 45, 82, 28, 58];
  return (
    <div className="flex h-full items-center gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3">
      <div className="flex h-full flex-1 items-center gap-[3px]">
        {bars.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${b}%`,
              backgroundImage:
                "linear-gradient(180deg, var(--color-brand-400), var(--color-accent-500))",
            }}
          />
        ))}
      </div>
      <div className="w-20 shrink-0 space-y-1.5">
        <div className="h-1.5 w-full rounded-full bg-[var(--fc-line-strong)]" />
        <div className="h-1.5 w-4/5 rounded-full bg-[var(--fc-line-strong)]" />
        <div className="h-1.5 w-2/3 rounded-full bg-[var(--color-brand-400)]" />
      </div>
    </div>
  );
}

function DiagramVisual() {
  return (
    <svg viewBox="0 0 240 120" className="h-full w-full">
      <defs>
        <marker id="dv-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 z" fill="var(--fc-fg-subtle)" />
        </marker>
      </defs>
      <rect x="8" y="42" width="52" height="30" rx="8" fill="var(--color-brand-500)" opacity="0.16" stroke="var(--color-brand-500)" strokeWidth="1.5" />
      <text x="34" y="61" textAnchor="middle" className="fill-[var(--fc-fg)] text-[9px] font-semibold">Signal</text>
      <rect x="94" y="42" width="52" height="30" rx="8" fill="var(--color-accent-500)" opacity="0.16" stroke="var(--color-accent-500)" strokeWidth="1.5" />
      <text x="120" y="61" textAnchor="middle" className="fill-[var(--fc-fg)] text-[9px] font-semibold">Score</text>
      <rect x="180" y="12" width="52" height="30" rx="8" fill="var(--color-signal-500)" opacity="0.16" stroke="var(--color-signal-500)" strokeWidth="1.5" />
      <text x="206" y="31" textAnchor="middle" className="fill-[var(--fc-fg)] text-[9px] font-semibold">Outreach</text>
      <rect x="180" y="78" width="52" height="30" rx="8" fill="var(--color-ink-400)" opacity="0.14" stroke="var(--color-ink-400)" strokeWidth="1.5" />
      <text x="206" y="97" textAnchor="middle" className="fill-[var(--fc-fg)] text-[9px] font-semibold">Nurture</text>
      <path d="M60,57 L92,57" stroke="var(--fc-fg-subtle)" strokeWidth="1.5" markerEnd="url(#dv-arrow)" />
      <path d="M146,52 C168,52 164,27 178,27" stroke="var(--fc-fg-subtle)" strokeWidth="1.5" fill="none" markerEnd="url(#dv-arrow)" />
      <path d="M146,62 C168,62 164,93 178,93" stroke="var(--fc-fg-subtle)" strokeWidth="1.5" fill="none" strokeDasharray="3 3" markerEnd="url(#dv-arrow)" />
    </svg>
  );
}

function AgentVisual() {
  const steps = ["read_csv", "search_web", "enrich", "score", "write_crm"];
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span className="grid size-4 place-items-center rounded-full bg-emerald-500/15 text-[8px] font-bold text-emerald-600 dark:text-emerald-400">
            {i + 1}
          </span>
          <span className="font-mono text-[9.5px] text-[var(--fc-fg-muted)]">{s}</span>
          <span className="ml-auto h-1 flex-1 overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-500),var(--color-accent-500))]"
              style={{ width: `${(i + 1) * 20}%` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function CommunityVisual() {
  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3">
      {[
        { n: "Maya Rahman", m: "Week-one activation up 23%…", h: 226 },
        { n: "Dan Whitfield", m: "Your CRM is a receipt, not a truth…", h: 158 },
        { n: "Aisha Rahman", m: "Bank statements explain visas…", h: 12 },
      ].map((p) => (
        <div key={p.n} className="flex gap-2">
          <span
            className="size-5 shrink-0 rounded-full"
            style={{
              backgroundImage: `linear-gradient(135deg, hsl(${p.h} 72% 52%), hsl(${(p.h + 42) % 360} 74% 44%))`,
            }}
          />
          <div className="min-w-0">
            <div className="text-[9.5px] font-bold text-[var(--fc-fg)]">{p.n}</div>
            <div className="truncate text-[9px] text-[var(--fc-fg-subtle)]">{p.m}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RadarVisual() {
  return (
    <div className="flex h-full items-center justify-center">
      <svg viewBox="0 0 220 150" className="w-full max-w-[260px]">
        <defs>
          <radialGradient id="rv-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b64f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b64f6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="110" cy="75" r="58" fill="url(#rv-glow)" />
        {[26, 44, 62].map((r) => (
          <circle
            key={r}
            cx="110"
            cy="75"
            r={r}
            fill="none"
            stroke="var(--fc-line)"
            strokeWidth="1"
          />
        ))}
        <line x1="110" y1="75" x2="110" y2="25" stroke="var(--fc-line)" strokeWidth="1" />
        <line x1="110" y1="75" x2="154" y2="95" stroke="var(--fc-line)" strokeWidth="1" />
        <line x1="110" y1="75" x2="70" y2="104" stroke="var(--fc-line)" strokeWidth="1" />
        <polygon
          points="110,32 146,88 78,98"
          fill="#3b64f6"
          fillOpacity="0.16"
          stroke="#3b64f6"
          strokeWidth="1.75"
        />
        <circle cx="110" cy="32" r="4" fill="#3b64f6" />
        <circle cx="146" cy="88" r="4" fill="#14b8a6" />
        <circle cx="78" cy="98" r="4" fill="#f59e0b" />
        <circle cx="150" cy="48" r="3.5" fill="#ef4444" />
        <circle cx="62" cy="46" r="2.5" fill="#8b5cf6" />
      </svg>
    </div>
  );
}

function DashboardVisual() {
  return (
    <div className="grid h-full grid-cols-4 grid-rows-3 gap-1.5">
      <div className="col-span-2 row-span-1 rounded-md border border-[var(--fc-line)] bg-[var(--fc-surface)] p-1.5">
        <div className="h-1 w-8 rounded-full bg-[var(--color-brand-500)]" />
        <div className="mt-1 flex items-end gap-1">
          {[40, 62, 48, 78, 58, 90].map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-sm bg-[var(--color-brand-500)]/60"
              style={{ height: `${h * 0.32}px` }}
            />
          ))}
        </div>
      </div>
      <div className="col-span-1 row-span-1 rounded-md border border-[var(--fc-line)] bg-[var(--fc-surface)] p-1.5">
        <div className="size-4 rounded-full border-[3px] border-[var(--color-accent-500)] border-r-transparent" />
      </div>
      <div className="col-span-1 row-span-1 rounded-md border border-[var(--fc-line)] bg-[var(--fc-surface)] p-1.5">
        <div className="text-[9px] font-bold text-[var(--fc-fg)]">34</div>
        <div className="text-[7px] text-[var(--fc-fg-subtle)]">modules</div>
      </div>
      <div className="col-span-2 row-span-1 rounded-md border border-[var(--fc-line)] bg-[var(--fc-surface)] p-1.5">
        <div className="flex items-end gap-1">
          {[30, 44, 38, 56, 70, 64, 82].map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-sm bg-[var(--color-accent-500)]/60"
              style={{ height: `${h * 0.3}px` }}
            />
          ))}
        </div>
      </div>
      <div className="col-span-2 row-span-1 rounded-md border border-dashed border-[var(--fc-line)] p-1.5">
        <div className="text-[8px] text-[var(--fc-fg-subtle)]">+ drop a widget</div>
      </div>
    </div>
  );
}
