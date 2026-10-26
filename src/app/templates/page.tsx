"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Copy,
  Download,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { DiagramCanvas } from "@/components/studio/DiagramCanvas";
import { Badge } from "@/components/ui/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { cn, copyToClipboard, downloadFile } from "@/lib/utils";
import {
  templateCategories,
  templateKinds,
  workspaceTemplates,
  type WorkspaceTemplate,
} from "@/lib/data/templates";

const KIND_ICON: Record<WorkspaceTemplate["kind"], string> = {
  diagram: "◧",
  social: "◈",
  email: "✉",
  agent: "⌬",
  study: "◑",
  brief: "▤",
  playbook: "⛭",
  video: "▶",
  seo: "◎",
  api: "⌗",
};

export default function TemplatesPage() {
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<string>("all");
  const [activeId, setActiveId] = React.useState<string | null>(
    workspaceTemplates[0]?.id ?? null,
  );
  const [copied, setCopied] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaceTemplates.filter((t) => {
      if (kind !== "all" && t.kind !== kind) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((x) => x.toLowerCase().includes(q))
      );
    });
  }, [query, kind]);

  const active =
    workspaceTemplates.find((t) => t.id === activeId) ??
    filtered[0] ??
    workspaceTemplates[0];

  const copy = async (t: WorkspaceTemplate) => {
    if (!t.body) return;
    const ok = await copyToClipboard(t.body);
    setCopied(ok ? t.id : null);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="min-h-screen bg-[var(--fc-bg)]">
      <MarketingHeader />

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden border-b border-[var(--fc-line)]">
        <div className="aurora-mesh pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-[1200px] px-5 py-16 sm:py-24">
          <Reveal>
            <Badge tone="brand" dot>
              <Sparkles className="size-3" />
              {workspaceTemplates.length} ready-to-use templates
            </Badge>
            <h1 className="mt-5 max-w-3xl font-display text-[40px] font-bold leading-[1.06] tracking-tight sm:text-[58px]">
              Start from something that already{" "}
              <span className="text-gradient">works</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[var(--fc-fg-muted)] sm:text-[17px]">
              Diagrams, social sets, email sequences, agent blueprints, study plans,
              video scripts, SEO playbooks and API recipes — each one written from
              real client work, not from a blank page. Copy it, open it in the
              workspace, make it yours.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className="btn btn-primary">
                Open the workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/marketing-kit" className="btn btn-secondary">
                Get the Marketing Kit
              </Link>
            </div>
          </Reveal>

          <Stagger className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Diagramming", v: "7", d: "Live previews, export to SVG or Mermaid" },
              { k: "Marketing", v: "9", d: "Social sets, emails, video scripts" },
              { k: "Automation", v: "3", d: "Agent blueprints with stop conditions" },
              { k: "Education", v: "4", d: "Study plans, briefs and playbooks" },
            ].map((s) => (
              <StaggerItem key={s.k}>
                <div className="fc-card p-5">
                  <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                    {s.k}
                  </div>
                  <div className="mt-1.5 font-display text-[30px] font-bold leading-none">
                    {s.v}
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {s.d}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------------- Filters ---------------- */}
      <section className="mx-auto max-w-[1200px] px-5 pt-10">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
            <input
              className="field pl-9"
              placeholder="Search templates by name, purpose or tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setKind("all")}
            className={cn("btn btn-sm", kind === "all" ? "btn-primary" : "btn-ghost")}
          >
            All
          </button>
          {templateKinds.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={cn("btn btn-sm", kind === k.id ? "btn-primary" : "btn-ghost")}
            >
              {k.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="fc-card mt-6 px-6 py-20 text-center">
            <p className="text-[15px] font-semibold">No templates match</p>
            <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
              Try a different keyword or clear the filters.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px]">
            {/* ---------- Grid ---------- */}
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "fc-card fc-card-hover group flex flex-col p-5 text-left transition-all",
                    active?.id === t.id &&
                      "border-[var(--color-brand-500)] ring-1 ring-[var(--color-brand-500)]/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
                      {KIND_ICON[t.kind]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14.5px] font-semibold leading-snug">{t.name}</h3>
                      <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--fc-fg-subtle)]">
                        {t.category}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 flex-1 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {t.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {t.meta && (
                    <div className="mt-3 flex gap-4 border-t border-[var(--fc-line)] pt-3">
                      {t.meta.map((m) => (
                        <span key={m.label} className="text-[11px]">
                          <span className="text-[var(--fc-fg-subtle)]">{m.label} </span>
                          <span className="font-semibold">{m.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* ---------- Preview ---------- */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="fc-card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]">
                    {KIND_ICON[active.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-semibold">{active.name}</h3>
                    <div className="text-[11px] uppercase tracking-[0.1em] text-[var(--fc-fg-subtle)]">
                      {active.category}
                    </div>
                  </div>
                </div>

                {active.diagram ? (
                  <div className="fc-diagram-preview bg-[var(--fc-surface-2)] p-3">
                    <DiagramCanvas diagram={active.diagram} className="h-[260px] w-full" />
                  </div>
                ) : (
                  <pre className="fc-scroll-thin max-h-[380px] overflow-auto whitespace-pre-wrap bg-[var(--fc-surface-2)] p-5 font-mono text-[11.5px] leading-[1.7] text-[var(--fc-fg-muted)]">
                    {active.body}
                  </pre>
                )}

                <div className="space-y-3 p-5">
                  <p className="text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {active.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={active.href} className="btn btn-primary btn-sm">
                      <Zap className="size-3.5" />
                      {active.cta}
                    </Link>
                    {active.body && (
                      <>
                        <button
                          onClick={() => copy(active)}
                          className="btn btn-secondary btn-sm"
                        >
                          <Copy className="size-3.5" />
                          {copied === active.id ? "Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => {
                            downloadFile(
                              `${active.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`,
                              active.body ?? "",
                            );
                          }}
                          className="btn btn-ghost btn-sm"
                        >
                          <Download className="size-3.5" />
                          .txt
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="fc-card mt-4 p-5">
                <h4 className="text-[14px] font-semibold">All categories</h4>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {templateCategories.map((c) => (
                    <span key={c} className="chip">
                      {c} ·{" "}
                      {workspaceTemplates.filter((t) => t.category === c).length}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="mx-auto max-w-[1200px] px-5 py-16">
        <div className="fc-card relative overflow-hidden p-8 sm:p-12">
          <div className="aurora-mesh pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-[28px] font-bold tracking-tight sm:text-[34px]">
              Every template is a starting point, not a straitjacket.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--fc-fg-muted)]">
              Open any template inside the workspace and edit it with the same tools
              you use for your own work — the humaniser, the SEO inspector, the
              diagram canvas, the caption generator. Nothing is locked.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/app" className="btn btn-primary">
                Open the workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/features" className="btn btn-secondary">
                See every module
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
