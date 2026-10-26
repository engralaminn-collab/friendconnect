"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Check,
  Copy,
  Download,
  Layers,
  Palette,
  Play,
  Ruler,
  Sparkles,
  Type,
  Workflow,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { DiagramCanvas } from "@/components/studio/DiagramCanvas";
import { AreaChart, DonutChart, FunnelChart, RadarChart, Sparkline } from "@/components/charts";
import { Badge, Kbd } from "@/components/ui/primitives";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, downloadFile } from "@/lib/utils";
import { seedDiagrams } from "@/lib/data/studio";
import { seedArticles } from "@/lib/data/marketing";

const buttonVariants = [
  { cls: "btn btn-primary", label: "Primary", desc: "Gradient brand fill. One per view." },
  { cls: "btn btn-secondary", label: "Secondary", desc: "Outlined surface. The workhorse." },
  { cls: "btn btn-ghost", label: "Ghost", desc: "No chrome until hover." },
  { cls: "btn btn-danger", label: "Danger", desc: "Destructive actions only." },
];

const buttonSizes = [
  { cls: "btn btn-primary btn-lg", label: "Large" },
  { cls: "btn btn-primary", label: "Default" },
  { cls: "btn btn-primary btn-sm", label: "Small" },
  { cls: "btn btn-primary btn-icon", label: "Icon" },
];

const palettes = [
  { name: "Brand", colors: ["--color-brand-300", "--color-brand-500", "--color-brand-700", "--color-brand-950"] },
  { name: "Accent", colors: ["--color-accent-200", "--color-accent-400", "--color-accent-600", "--color-accent-900"] },
  { name: "Signal", colors: ["--color-signal-300", "--color-signal-400", "--color-signal-500", "--color-signal-600"] },
  { name: "Ink", colors: ["--color-ink-200", "--color-ink-400", "--color-ink-600", "--color-ink-900"] },
];

export default function ShowcasePage() {
  const toast = useToast();

  const copyCss = async (label: string, text: string) => {
    const ok = await copyToClipboard(text);
    toast[ok ? "success" : "error"](
      ok ? `${label} copied` : "Copy failed",
      ok ? "Ready to paste into your codebase." : undefined,
    );
  };

  return (
    <div className="min-h-dvh bg-[var(--fc-surface-2)]">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[var(--fc-line)]">
        <div className="pointer-events-none absolute inset-0 fc-aurora opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="chip border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
              Design system & templates
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              The FriendConnect design language
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[var(--fc-fg-muted)]">
              Every diagram template, button state, palette and chart style used
              inside the workspace — open source, copyable, and rendering the same
              way here as it does in the product.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/app/diagrams" className="btn btn-primary btn-lg">
                <Workflow className="size-4" />
                Open the diagram designer
              </Link>
              <button
                onClick={() =>
                  downloadFile(
                    "friendconnect-design-tokens.json",
                    JSON.stringify(
                      {
                        radius: { sm: 9, md: 12, lg: 16, xl: 22 },
                        shadows: ["xs", "sm", "md", "lg", "xl", "glow"],
                        brand: ["#3b64f6", "#2544eb", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#22c55e"],
                        fontScale: [12, 13.5, 15, 17, 22, 30, 39],
                      },
                      null,
                      2,
                    ),
                  )
                }
                className="btn btn-secondary btn-lg"
              >
                <Download className="size-4" />
                Export tokens
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ========================= BUTTON SYSTEM ========================= */}
      <section className="border-b border-[var(--fc-line)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="chip border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                <Ruler className="size-3" />
                Buttons
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">One action per view</h2>
              <p className="mt-3 max-w-2xl text-[var(--fc-fg-muted)]">
                Four variants, four sizes, six states. Each has a defined job, so
                hierarchy never depends on taste.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="fc-card p-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Variants
              </h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {buttonVariants.map((v) => (
                  <div key={v.label} className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                    <button className={v.cls}>
                      <Play className="size-4" />
                      {v.label}
                    </button>
                    <div className="mt-3">
                      <div className="text-[13px] font-semibold">{v.label}</div>
                      <div className="text-xs text-[var(--fc-fg-muted)]">{v.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="fc-card p-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Sizes &amp; states
              </h3>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {buttonSizes.map((b, i) => (
                  <button key={b.label} className={b.cls} aria-label={b.label}>
                    {b.label}
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { l: "Default", cls: "btn btn-primary", dis: false },
                  { l: "Hover", cls: "btn btn-primary hover:brightness-110", dis: false },
                  { l: "Focus", cls: "btn btn-primary focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-brand-500)]", dis: false },
                  { l: "Disabled", cls: "btn btn-primary", dis: true },
                  { l: "Loading", cls: "btn btn-primary", dis: false, loading: true },
                  { l: "Danger", cls: "btn btn-danger", dis: false },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg border border-[var(--fc-line)] p-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--fc-fg-subtle)]">
                      {s.l}
                    </div>
                    <button className={s.cls} disabled={s.dis}>
                      {s.loading && (
                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      )}
                      {s.l}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="fc-card mt-5 p-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
              Palette
            </h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {palettes.map((p) => (
                <div key={p.name}>
                  <div className="mb-2 text-[13px] font-semibold">{p.name}</div>
                  <div className="flex overflow-hidden rounded-lg border border-[var(--fc-line)]">
                    {p.colors.map((c) => (
                      <div
                        key={c}
                        className="h-14 flex-1"
                        style={{ backgroundColor: `var(${c})` }}
                        title={c}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      copyCss(
                        p.name,
                        p.colors.map((c) => `var(${c})`).join(", "),
                      )
                    }
                    className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--fc-fg-muted)] hover:text-[var(--color-brand-500)]"
                  >
                    <Copy className="size-3" /> Copy variables
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================= DIAGRAM LIBRARY ========================= */}
      <section id="diagrams" className="scroll-mt-20 border-b border-[var(--fc-line)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="chip border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-800 dark:bg-accent-900/40 dark:text-accent-300">
                <Workflow className="size-3" />
                Diagram templates
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Diagrams that explain, not decorate
              </h2>
              <p className="mt-3 max-w-2xl text-[var(--fc-fg-muted)]">
                Six node types, orthogonal-aware routing, labelled edges and export
                to SVG or Mermaid. These four ship as the starting templates.
              </p>
            </div>
            <Link href="/app/diagrams" className="btn btn-secondary">
              Open designer
              <ArrowRight className="size-4" />
            </Link>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {seedDiagrams.map((d) => (
              <Reveal key={d.id}>
                <div className="fc-card flex h-full flex-col overflow-hidden">
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-4">
                    <div>
                      <h3 className="text-[15px] font-semibold">{d.name}</h3>
                      <p className="mt-0.5 text-[12.5px] text-[var(--fc-fg-muted)]">
                        {d.description}
                      </p>
                    </div>
                    <Badge>{d.template}</Badge>
                  </div>
                  <div className="h-[300px] bg-[var(--fc-surface)]">
                    <DiagramCanvas diagram={d} className="h-full w-full" />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* =========================== CHART SYSTEM =========================== */}
      <section className="border-b border-[var(--fc-line)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <span className="chip border-signal-400/40 bg-signal-400/10 text-signal-600 dark:text-signal-300">
              <Palette className="size-3" />
              Charts
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">
              Hand-built SVG charts, no library
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--fc-fg-muted)]">
              Every chart is resolution independent, theme aware and hover
              interactive — and adds zero kilobytes to the bundle.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="fc-card p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Area &amp; line
              </h3>
              <AreaChart
                height={200}
                labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]}
                series={[
                  { name: "New", data: [22, 30, 26, 42, 38, 52, 49, 64] },
                  { name: "Returning", data: [12, 16, 14, 21, 19, 26, 23, 31] },
                ]}
              />
            </div>
            <div className="fc-card p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Funnel
              </h3>
              <FunnelChart
                stages={[
                  { label: "Visitors", value: 12400 },
                  { label: "Sign-ups", value: 3120 },
                  { label: "Activated", value: 1680 },
                  { label: "Paying", value: 412 },
                ]}
              />
            </div>
            <div className="fc-card p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Donut
              </h3>
              <DonutChart
                data={[
                  { label: "Email", value: 42 },
                  { label: "Social", value: 28 },
                  { label: "Ads", value: 18 },
                  { label: "Partner", value: 12 },
                ]}
                centerLabel="Sourced"
                centerValue="100%"
              />
            </div>
            <div className="fc-card p-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Radar &amp; sparkline
              </h3>
              <div className="grid grid-cols-2 items-center gap-4">
                <RadarChart
                  size={210}
                  axes={["Speed", "Cost", "Reach", "Trust", "Safety", "Depth"]}
                  series={[
                    { name: "Us", data: [82, 64, 71, 88, 92, 76], color: "#3b64f6" },
                    { name: "Them", data: [58, 78, 84, 61, 54, 69], color: "#94a3b8" },
                  ]}
                />
                <div className="space-y-4">
                  {[
                    { l: "Revenue", d: [12, 18, 15, 26, 22, 31, 28, 40] },
                    { l: "Signups", d: [40, 34, 38, 30, 26, 24, 20, 18] },
                    { l: "Retention", d: [22, 26, 28, 31, 33, 36, 38, 44] },
                  ].map((s) => (
                    <div key={s.l}>
                      <div className="mb-1 flex justify-between text-[11px] font-semibold text-[var(--fc-fg-muted)]">
                        <span>{s.l}</span>
                        <span className="tabular-nums">12 wk</span>
                      </div>
                      <Sparkline data={s.d} height={36} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ CONTENT ============================ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <span className="chip border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
              <Type className="size-3" />
              Typography
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Type that scales cleanly</h2>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="fc-card p-6">
              <div className="space-y-5">
                {[
                  { s: "display", c: "text-[2.6rem] font-bold tracking-tight leading-[1.05]", t: "Everything your team does", k: "39px / Bold" },
                  { s: "h1", c: "text-[1.85rem] font-semibold tracking-tight", t: "Revenue operations, without the sprawl", k: "30px / Semibold" },
                  { s: "h2", c: "text-[1.35rem] font-semibold tracking-tight", t: "One workspace, seven pillars", k: "22px / Semibold" },
                  { s: "body", c: "text-[15px] leading-relaxed", t: "The pipeline board writes its own activity log, so nobody has to admin it any more.", k: "15px / Regular" },
                  { s: "small", c: "text-[12.5px] text-[var(--fc-fg-muted)]", t: "Updated 4 minutes ago · 3 watchers", k: "12.5px / Muted" },
                ].map((row) => (
                  <div key={row.s} className="border-b border-[var(--fc-line)] pb-4 last:border-0 last:pb-0">
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fc-fg-subtle)]">
                      {row.k}
                    </div>
                    <div className={row.c}>{row.t}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="fc-card p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  Components
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="brand">Brand</Badge>
                  <Badge tone="accent">Accent</Badge>
                  <Badge tone="signal">Signal</Badge>
                  <Badge tone="success">Success</Badge>
                  <Badge tone="danger">Danger</Badge>
                  <Badge tone="violet">Violet</Badge>
                  <Badge>Neutral</Badge>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                  <Kbd>Esc</Kbd>
                  <Kbd>↵</Kbd>
                </div>
              </div>

              <div className="fc-card p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  Surfaces
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: "Surface", c: "bg-[var(--fc-surface)]" },
                    { l: "Surface 2", c: "bg-[var(--fc-surface-2)]" },
                    { l: "Surface 3", c: "bg-[var(--fc-surface-3)]" },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className={cn(
                        "rounded-xl border border-[var(--fc-line)] p-3 text-center",
                        s.c,
                      )}
                    >
                      <div className="text-[11px] font-semibold">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                  <Boxes className="size-5 shrink-0 text-[var(--color-brand-500)]" />
                  <p className="text-[13px] text-[var(--fc-fg-muted)]">
                    Every surface uses the same border token, so nothing drifts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ ARTICLES ============================ */}
      <section className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="chip border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                <Layers className="size-3" />
                Editorial
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">Writing, in the same voice</h2>
            </div>
            <Link href="/blog" className="btn btn-secondary">
              All articles
              <ArrowRight className="size-4" />
            </Link>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {seedArticles.slice(0, 3).map((a) => (
              <Reveal key={a.id}>
                <Link href={`/blog/${a.slug}`} className="fc-card fc-card-hover flex h-full flex-col p-6">
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">{a.tone}</Badge>
                    <span className="text-[11px] text-[var(--fc-fg-subtle)]">{a.readTime} min read</span>
                  </div>
                  <h3 className="mt-3 text-[16px] font-semibold leading-snug">{a.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {a.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[11.5px] font-semibold text-[var(--color-brand-500)]">
                    Read
                    <ArrowRight className="size-3.5" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
