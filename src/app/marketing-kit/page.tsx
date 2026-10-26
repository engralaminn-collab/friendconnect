"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Copy,
  Download,
  FileText,
  LayoutTemplate,
  Megaphone,
  MousePointerClick,
  Rocket,
  Search,
  Target,
  Zap,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/primitives";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, downloadFile } from "@/lib/utils";

const tabs = [
  { id: "swipe", label: "Swipe files", icon: LayoutTemplate },
  { id: "copy", label: "Copy templates", icon: Copy },
  { id: "checklists", label: "Launch checklists", icon: Rocket },
  { id: "bench", label: "Benchmark", icon: BarChart3 },
] as const;

const swipeFiles = [
  {
    title: "The one-page offer",
    category: "Landing page",
    metric: "11.4% median conversion",
    why: "Names the outcome before the mechanism, prices it honestly, and puts a single action above the fold. Everything below the fold removes a reason to hesitate.",
    elements: [
      "Outcome headline — what changes for the reader",
      "One-paragraph mechanism explanation",
      "Price stated in the same currency as the market",
      "Social proof with a specific number, not a logo wall",
      "Risk reversal written as a sentence, not fine print",
      "Single primary CTA repeated three times",
    ],
  },
  {
    title: "The benchmark report landing page",
    category: "Gated content",
    metric: "31% average download rate",
    why: "Gates on insight, not on a summary. The abstract gives away the headline finding so the reader knows the download is worth it.",
    elements: [
      "Headline finding as the H1 — not the report title",
      "Abstract that already answers the question",
      "Table of contents with page numbers",
      "Sample charts, full resolution",
      "Author credentials and dataset methodology",
      "Email capture before the download link",
    ],
  },
  {
    title: "The consultation offer",
    category: "Service page",
    metric: "£8.4k average deal",
    why: "Positions the call as the product. Removes the 'will you sell me something' fear by stating plainly what the buyer receives.",
    elements: [
      "Explicit statement of what the buyer leaves with",
      "What we will and will not cover",
      "Price range, so nobody wastes a call",
      "The three questions we will ask you",
      "Case study with a named constraint",
      "Calendar link with realistic availability",
    ],
  },
  {
    title: "The free tool magnet",
    category: "Lead generation",
    metric: "2,140 signups in 9 days",
    why: "The tool solves a real problem in ninety seconds and hands over the answer before asking for an email.",
    elements: [
      "Single-purpose input, one field",
      "Result rendered instantly, no API call visible",
      "The answer is genuinely useful on its own",
      "Email capture for the saved version",
      "One optional follow-up, not a sequence",
      "Shareable result link",
    ],
  },
];

const copyTemplates = [
  {
    id: "launch",
    title: "Product launch announcement",
    channel: "Email",
    body: `Subject: {{Product}} is live — here's what changed

Hi {{First name}},

{{Product}} is out. {{One sentence on the problem it solves for the reader, not the product.}}

Three things worth your time:

1. {{Change}} — {{why it matters to them}}
2. {{Change}} — {{why it matters to them}}
3. {{Change}} — {{why it matters to them}}

If you tried the beta, {{specific acknowledgement of what they did}}.

— {{Sender}}`,
  },
  {
    id: "winback",
    title: "Win-back sequence — step 2",
    channel: "Email",
    body: `Subject: we changed the thing you told us about

Hi {{First name}},

{{Name}} wrote in {{month}} saying {{verbatim customer feedback}}.

We shipped {{what changed}} last {{week}}. {{One sentence on the direct link between their feedback and the change.}}

If it still is not right, reply with one word — {{"close it"}} — and I will not email you again.

— {{Sender}}`,
  },
  {
    id: "linkedin",
    title: "LinkedIn post — lesson learned",
    channel: "Social",
    body: `{{Hook: a specific number or contradiction}}

{{Context: what we were trying to do, in two sentences}}

{{The lesson, stated plainly and against our own interest}}

{{Evidence: a number, a chart or a quote}}

{{What we are doing about it, with a date}}

{{Question that invites a real answer, not a like}}

#{{tag}} #{{tag}}`,
  },
  {
    id: "ad",
    title: "Paid social ad — problem-first",
    channel: "Ads",
    body: `Primary text:
{{Describe the problem in the reader's own words. No adjectives, no claims.}}

Headline: {{The outcome, under 30 characters}}

Description: {{The mechanism, one sentence, no hype}}

CTA: {{Learn more / Get the template / See the method}}`,
  },
  {
    id: "webinar",
    title: "Webinar promo — day 1",
    channel: "Email",
    body: `Subject: tomorrow: {{topic}} (45 min, live build)

Hi {{First name}},

Tomorrow at {{time}} we are going to {{the specific thing}} — live, with the mistakes left in.

You will leave with:
• {{Deliverable 1}}
• {{Deliverable 2}}
• {{Template or file}}

{{One sentence of social proof: who attended last time and what happened for them.}}

— {{Sender}}`,
  },
  {
    id: "sms",
    title: "SMS — deadline reminder",
    channel: "SMS",
    body: `{{Brand}}: reminder — {{short item}} is due {{date}}. Reply YES for help or STOP to opt out.`,
  },
];

const checklists = [
  {
    title: "Product launch",
    items: [
      "Landing page live with final pricing",
      "Onboarding email sequence written",
      "Support macros updated",
      "Pricing page and docs updated",
      "Demo video recorded and subtitled",
      "Changelog entry drafted",
      "Internal announcement sent",
      "Launch-day metrics dashboard shared",
    ],
  },
  {
    title: "Benchmark report",
    items: [
      "Dataset cleaned and methodology written",
      "Headline findings chosen (3 max)",
      "Charts built from the dataset, not eyeballed",
      "Editorial pass for tone consistency",
      "Design template applied",
      "Gated landing page built and tested",
      "Email sequence written for three segments",
      "Partner distribution agreed",
    ],
  },
  {
    title: "Paid push",
    items: [
      "Budget split across channels agreed",
      "Creative variants per placement",
      "Tracking events firing and verified",
      "Landing page load under 2 seconds",
      "Negative keyword list prepared",
      "Daily spend caps set",
      "Kill criteria defined before launch",
      "Post-mortem scheduled for day 7",
    ],
  },
  {
    title: "Webinar",
    items: [
      "Topic and promise agreed",
      "Run of show with timings",
      "Demo environment prepared and tested",
      "Registration page + tracking",
      "Three-email sequence (invite, remind, replay)",
      "Q&A bank prepared",
      "On-demand page with clips and transcript",
      "Follow-up sequence for registrants",
    ],
  },
];

const benchmarkRows = [
  { metric: "Median revenue ops headcount", top: "3.2", bottom: "6.8", unit: "people" },
  { metric: "Tooling spend per rep", top: "£1,410", bottom: "£1,388", unit: "/ quarter" },
  { metric: "Revenue per rep", top: "£412k", bottom: "£186k", unit: "" },
  { metric: "Deals created per week", top: "18", bottom: "9", unit: "" },
  { metric: "Median days in negotiation", top: "11", bottom: "27", unit: "days" },
  { metric: "Forecast accuracy (±10%)", top: "78%", bottom: "41%", unit: "" },
  { metric: "Reporting automation share", top: "71%", bottom: "22%", unit: "of tasks" },
  { metric: "CRM field completeness", top: "96%", bottom: "63%", unit: "" },
];

export default function MarketingKitPage() {
  const [tab, setTab] = React.useState<(typeof tabs)[number]["id"]>("swipe");
  const [copied, setCopied] = React.useState<string | null>(null);
  const toast = useToast();

  const copy = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
    toast[ok ? "success" : "error"](
      ok ? "Template copied" : "Copy failed",
      ok ? "Paste it wherever you write." : "Your browser blocked clipboard access.",
    );
  };

  const download = (name: string, content: string) => {
    downloadFile(name, content);
    toast.success("Download started", name);
  };

  return (
    <div className="min-h-dvh bg-[var(--fc-surface-2)]">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[var(--fc-line)]">
        <div className="pointer-events-none absolute inset-0 fc-aurora opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="chip border-signal-400/40 bg-signal-400/10 text-signal-600 dark:text-signal-300">
              Free · no email required to browse
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              The Marketing Kit
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[var(--fc-fg-muted)]">
              The artefacts our own team uses to ship campaigns: annotated swipe
              files, copy templates with the reasoning exposed, launch checklists
              and the full benchmark dataset.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() =>
                  download(
                    "friendconnect-marketing-kit.txt",
                    [
                      "FRIENDCONNECT MARKETING KIT",
                      "",
                      ...swipeFiles.map(
                        (s) =>
                          `## ${s.title}\n${s.metric}\n${s.why}\n${s.elements
                            .map((e) => `  - ${e}`)
                            .join("\n")}\n`,
                      ),
                      ...copyTemplates.map((c) => `## ${c.title} (${c.channel})\n${c.body}\n`),
                      ...checklists.map(
                        (c) =>
                          `## ${c.title} checklist\n${c.items.map((i) => `  [ ] ${i}`).join("\n")}\n`,
                      ),
                    ].join("\n"),
                  )
                }
                className="btn btn-primary btn-lg"
              >
                <Download className="size-4" />
                Download everything
              </button>
              <Link href="/app/content" className="btn btn-secondary btn-lg">
                Use the content studio
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              { k: "96", v: "annotated swipe files" },
              { k: "48", v: "copy templates" },
              { k: "340", v: "teams benchmarked" },
            ].map((s) => (
              <div key={s.v} className="fc-card p-5 text-center">
                <div className="font-display text-3xl font-bold">{s.k}</div>
                <div className="mt-1 text-sm text-[var(--fc-fg-muted)]">{s.v}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-[13.5px] font-semibold transition-colors",
                tab === t.id
                  ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.1] text-[var(--color-brand-500)]"
                  : "border-[var(--fc-line)] bg-[var(--fc-surface)] text-[var(--fc-fg-muted)] hover:border-[var(--color-brand-400)]",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "swipe" && (
          <Stagger className="grid gap-5 lg:grid-cols-2" key="swipe">
            {swipeFiles.map((s) => (
              <StaggerItem key={s.title}>
                <article className="fc-card h-full overflow-hidden">
                  <div className="border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone="brand">{s.category}</Badge>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Target className="size-3.5" />
                        {s.metric}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {s.why}
                    </p>
                  </div>
                  <div className="p-5">
                    <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
                      Required elements
                    </div>
                    <ul className="space-y-2">
                      {s.elements.map((e) => (
                        <li key={e} className="flex items-start gap-2.5 text-[13.5px]">
                          <Check
                            className="mt-0.5 size-3.5 shrink-0 text-emerald-500"
                            strokeWidth={3}
                          />
                          <span className="text-[var(--fc-fg-muted)]">{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        )}

        {tab === "copy" && (
          <div className="grid gap-4 lg:grid-cols-2" key="copy">
            {copyTemplates.map((t) => (
              <article key={t.id} className="fc-card flex flex-col overflow-hidden">
                <header className="flex items-center justify-between gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <FileText className="size-4 text-[var(--color-brand-500)]" />
                    <h3 className="text-sm font-semibold">{t.title}</h3>
                    <Badge>{t.channel}</Badge>
                  </div>
                  <button
                    onClick={() => copy(t.id, t.body)}
                    className="btn btn-secondary btn-sm"
                  >
                    {copied === t.id ? (
                      <>
                        <Check className="size-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> Copy
                      </>
                    )}
                  </button>
                </header>
                <pre className="fc-scroll-thin max-h-72 overflow-auto whitespace-pre-wrap p-5 font-mono text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {t.body}
                </pre>
              </article>
            ))}
          </div>
        )}

        {tab === "checklists" && (
          <div className="grid gap-5 lg:grid-cols-2" key="checklists">
            {checklists.map((c) => (
              <article key={c.title} className="fc-card overflow-hidden">
                <header className="flex items-center gap-2.5 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-4">
                  <Rocket className="size-4 text-[var(--color-brand-500)]" />
                  <h3 className="text-[15px] font-semibold">{c.title}</h3>
                </header>
                <ul className="divide-y divide-[var(--fc-line)]">
                  {c.items.map((i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 px-5 py-3 text-[13.5px] text-[var(--fc-fg-muted)]"
                    >
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-[var(--fc-line-strong)]">
                        <Check className="size-2.5 opacity-0" />
                      </span>
                      {i}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[var(--fc-line)] px-5 py-3">
                  <button
                    onClick={() =>
                      download(
                        `${c.title.toLowerCase().replace(/\s+/g, "-")}-checklist.txt`,
                        `${c.title}\n\n${c.items.map((i) => `[ ] ${i}`).join("\n")}\n`,
                      )
                    }
                    className="btn btn-ghost btn-sm"
                  >
                    <Download className="size-3.5" /> Download checklist
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === "bench" && (
          <div key="bench" className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold">
                  Revenue operations benchmark — 340 teams
                </h3>
                <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
                  Top quartile versus bottom quartile, mid-market SaaS and commerce.
                </p>
              </div>
              <Badge tone="accent">Top quartile tooling spend ≈ bottom quartile</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fc-line)] text-[11px] uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    <th className="px-6 py-3 font-bold">Metric</th>
                    <th className="px-6 py-3 font-bold">Top quartile</th>
                    <th className="px-6 py-3 font-bold">Bottom quartile</th>
                    <th className="px-6 py-3 font-bold">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fc-line)]">
                  {benchmarkRows.map((r) => (
                    <tr key={r.metric}>
                      <td className="px-6 py-3.5 font-medium">{r.metric}</td>
                      <td className="px-6 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        {r.top} {r.unit}
                      </td>
                      <td className="px-6 py-3.5 text-[var(--fc-fg-muted)]">
                        {r.bottom} {r.unit}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge
                          tone={
                            r.metric === "Tooling spend per rep" ? "signal" : "success"
                          }
                        >
                          {r.metric === "Tooling spend per rep"
                            ? "No correlation"
                            : r.metric === "Median days in negotiation"
                            ? "16 days faster"
                            : "Meaningful"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-xl text-[13.5px] text-[var(--fc-fg-muted)]">
                  The uncomfortable finding: tooling spend per rep shows almost no
                  correlation with revenue per rep. Process consistency does the work.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      download(
                        "benchmark-2026.csv",
                        `metric,top_quartile,bottom_quartile\n${benchmarkRows
                          .map(
                            (r) =>
                              `"${r.metric}","${r.top}","${r.bottom}"`,
                          )
                          .join("\n")}\n`,
                      )
                    }
                    className="btn btn-secondary btn-sm"
                  >
                    <Download className="size-3.5" /> CSV
                  </button>
                  <Link href="/app/seo" className="btn btn-primary btn-sm">
                    <Search className="size-3.5" /> Audit your site
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] py-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          {[
            { i: MousePointerClick, t: "Copy, adapt, ship", d: "Every template is plain text. Paste it into your tool of choice." },
            { i: Zap, t: "Reasoning included", d: "We annotate why each element exists, so you can adapt rather than guess." },
            { i: Megaphone, t: "Built from real campaigns", d: "Every item shipped and was measured before it made it into the kit." },
          ].map((x) => (
            <div key={x.t}>
              <x.i className="size-5 text-[var(--color-brand-500)]" />
              <h3 className="mt-3 text-[15px] font-semibold">{x.t}</h3>
              <p className="mt-1 text-[13.5px] text-[var(--fc-fg-muted)]">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
