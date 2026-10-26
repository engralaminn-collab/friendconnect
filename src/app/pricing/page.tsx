"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, HelpCircle, Minus, Sparkles } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Solo",
    tagline: "One person, everything.",
    price: 0,
    period: "forever",
    cta: "Start free",
    href: "/app",
    featured: false,
    features: [
      "All 42 modules, no feature gating",
      "Local-first browser storage",
      "3 agent runs per day",
      "Community feed read + post",
      "Diagram, video and voice studios",
      "Marketing Kit download",
    ],
  },
  {
    name: "Team",
    tagline: "Shared workspace for a real team.",
    price: 24,
    period: "per seat / month",
    cta: "Start 14-day trial",
    href: "/app",
    featured: true,
    features: [
      "Everything in Solo",
      "Shared CRM, pipeline and content library",
      "Unlimited agent runs and run history",
      "API bench and plugin marketplace",
      "Role-based workspace permissions",
      "Export any dataset as CSV or JSON",
    ],
  },
  {
    name: "Scale",
    tagline: "Consultancies and multi-brand teams.",
    price: 61,
    period: "per seat / month",
    cta: "Talk to sales",
    href: "/contact",
    featured: false,
    features: [
      "Everything in Team",
      "Multiple client workspaces",
      "Self-hosted or private cloud deployment",
      "SSO, SCIM, audit log",
      "99.9% uptime SLA",
      "Named onboarding engineer",
    ],
  },
];

const comparison: { feature: string; solo: string | boolean; team: string | boolean; scale: string | boolean }[] = [
  { feature: "Modules available", solo: "28", team: "28", scale: "28" },
  { feature: "Contacts & pipeline", solo: "Local only", team: "Shared", scale: "Shared" },
  { feature: "Agent runs per day", solo: "3", team: "Unlimited", scale: "Unlimited" },
  { feature: "Marketing Kit", solo: true, team: true, scale: true },
  { feature: "Plugin marketplace", solo: "Browse", team: "Install", scale: "Install + publish" },
  { feature: "API bench", solo: "5 requests/day", team: "Unlimited", scale: "Unlimited" },
  { feature: "Client workspaces", solo: false, team: false, scale: "Unlimited" },
  { feature: "SSO & audit log", solo: false, team: false, scale: true },
  { feature: "Self-hosting", solo: false, team: false, scale: true },
  { feature: "Support", solo: "Community", team: "48h email", scale: "4h + Slack" },
];

const faqs = [
  {
    q: "Do you charge per module?",
    a: "No. Every plan includes every module. We charge for seats only, because we do not want a team to be told they cannot see the pipeline because they are on a cheaper tier.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Nothing. Your workspace stays intact and readable. Features that require a higher tier become read-only rather than disappearing, so you never lose context.",
  },
  {
    q: "Is the free tier really free?",
    a: "Yes — one seat, forever, with three agent runs a day. We make money from teams, not from locking individuals out of their own data.",
  },
  {
    q: "Can we run this on our own infrastructure?",
    a: "On Scale, yes. We publish a container image and a docker-compose file. Your data never has to leave your network.",
  },
  {
    q: "How does seat counting work?",
    a: "A seat is a person who can sign in. Shared read-only links, public forms and API integrations do not consume a seat.",
  },
  {
    q: "Do you offer non-profit or education pricing?",
    a: "Registered education institutions and registered charities receive 40% off Team pricing. Contact us and we will apply it — there is no application form.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  return (
    <div className="min-h-dvh bg-[var(--fc-surface-2)]">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[var(--fc-line)]">
        <div className="pointer-events-none absolute inset-0 fc-aurora opacity-55" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="chip border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
              Simple, seat-based
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              One price. Every feature.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[var(--fc-fg-muted)]">
              We would rather earn the upgrade by being useful than by hiding the
              pipeline behind a tier. Cancel any time, export everything, keep the
              data.
            </p>
          </Reveal>

          <Stagger className="mt-14 grid gap-5 lg:grid-cols-3">
            {plans.map((p) => (
              <StaggerItem key={p.name}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border p-7",
                    p.featured
                      ? "border-transparent bg-[linear-gradient(150deg,var(--color-brand-600),var(--color-brand-500)_45%,var(--color-accent-500))] text-white shadow-[0_34px_80px_-34px_rgba(59,100,246,.8)]"
                      : "border-[var(--fc-line)] bg-[var(--fc-surface)]",
                  )}
                >
                  {p.featured && (
                    <span className="absolute right-6 top-6 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur">
                      Most popular
                    </span>
                  )}
                  <h2 className="text-xl font-bold">{p.name}</h2>
                  <p
                    className={cn(
                      "mt-1 text-sm",
                      p.featured ? "text-white/75" : "text-[var(--fc-fg-muted)]",
                    )}
                  >
                    {p.tagline}
                  </p>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="font-display text-5xl font-bold tracking-tight">
                      {p.price === 0 ? "£0" : `£${p.price}`}
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        p.featured ? "text-white/75" : "text-[var(--fc-fg-muted)]",
                      )}
                    >
                      {p.period}
                    </span>
                  </div>
                  <ul className="mt-7 flex-1 space-y-3">
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
                    href={p.href}
                    className={cn(
                      "btn mt-8 w-full",
                      p.featured
                        ? "bg-white text-[var(--color-brand-700)] hover:bg-white/90"
                        : "btn-secondary",
                    )}
                  >
                    {p.cta}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.1} className="mx-auto mt-8 max-w-2xl">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] px-5 py-4 text-center text-sm">
              <Sparkles className="size-4 shrink-0 text-[var(--color-brand-500)]" />
              <span className="text-[var(--fc-fg-muted)]">
                Registered education institutions and charities get{" "}
                <strong className="text-[var(--fc-fg)]">40% off Team</strong> — no
                application form.
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Compare plans</h2>
          </Reveal>
          <Reveal delay={0.06} className="fc-card mt-10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)]">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                      Feature
                    </th>
                    {plans.map((p) => (
                      <th key={p.name} className="px-6 py-4 text-sm font-bold">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fc-line)]">
                  {comparison.map((row) => (
                    <tr key={row.feature}>
                      <td className="px-6 py-3.5 font-medium">{row.feature}</td>
                      {[row.solo, row.team, row.scale].map((v, i) => (
                        <td key={i} className="px-6 py-3.5">
                          {v === true ? (
                            <Check className="size-4 text-emerald-500" strokeWidth={2.6} />
                          ) : v === false ? (
                            <Minus className="size-4 text-[var(--fc-fg-subtle)]" />
                          ) : (
                            <span className="text-[var(--fc-fg-muted)]">{v}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Questions</h2>
          </Reveal>
          <div className="mt-10 space-y-3">
            {faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.04}>
                <div className="fc-card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="flex items-center gap-3 text-[14.5px] font-semibold">
                      <HelpCircle className="size-4 shrink-0 text-[var(--color-brand-500)]" />
                      {f.q}
                    </span>
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border border-[var(--fc-line)] text-[var(--fc-fg-muted)] transition-transform",
                        openFaq === i && "rotate-45",
                      )}
                    >
                      +
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="border-t border-[var(--fc-line)] px-5 py-4 pl-12 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {f.a}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1} className="mt-10 text-center">
            <Badge tone="accent">Still deciding?</Badge>
            <p className="mt-3 text-sm text-[var(--fc-fg-muted)]">
              Open the workspace with sample data — no card required.
            </p>
            <Link href="/app" className="btn btn-primary mt-5">
              Try it now
              <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
