"use client";

import * as React from "react";
import {
  BookOpen,
  ChevronRight,
  Copy,
  GraduationCap,
  Search,
  Sparkles,
  Volume2,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/primitives";
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  type GlossaryTerm,
} from "@/lib/data/glossary";
import { cn, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/store/useUI";

export default function GlossaryPage() {
  const toast = useToast();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [open, setOpen] = React.useState<string | null>(GLOSSARY[0].term);

  const filtered = GLOSSARY.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (
      query &&
      !t.term.toLowerCase().includes(query.toLowerCase()) &&
      !t.short.toLowerCase().includes(query.toLowerCase()) &&
      !t.plain.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    return true;
  });

  const term = GLOSSARY.find((t) => t.term === open) ?? null;

  return (
    <div className="mx-auto max-[1700px]">
      <PageHeader
        eyebrow="Reference"
        title="AI coding dictionary"
        description="Every term an AI-coding tool throws at you, in plain English. What it means, why it matters, and which other terms it leans on."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2">
            <GraduationCap className="size-4 text-[var(--color-accent-500)]" />
            <span className="text-[12px] text-[var(--fc-fg-muted)]">
              No term needs a key or a model to read
            </span>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Terms"
          value={GLOSSARY.length}
          deltaLabel="each with a plain-English explanation"
          icon={<BookOpen className="size-4" />}
        />
        <StatCard
          label="Categories"
          value={GLOSSARY_CATEGORIES.length}
          deltaLabel="models, context, tokens, cost, agents…"
          icon={<Sparkles className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Cross links"
          value={GLOSSARY.reduce((n, t) => n + t.related.length, 0)}
          deltaLabel="connections between the terms"
          icon={<ChevronRight className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Longest read"
          value={`${Math.max(...GLOSSARY.map((t) => t.plain.length))} ch`}
          deltaLabel="the agent loop, of course"
          icon={<Volume2 className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-3">
          <div className="fc-card p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field h-8 pl-8 text-[12.5px]"
                placeholder="Search the dictionary…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <FilterChip
                active={category === "all"}
                onClick={() => setCategory("all")}
                count={GLOSSARY.length}
              >
                All
              </FilterChip>
              {GLOSSARY_CATEGORIES.map((c) => (
                <FilterChip
                  key={c.id}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                  count={GLOSSARY.filter((t) => t.category === c.id).length}
                >
                  {c.icon} {c.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <ul className="fc-card divide-y divide-[var(--fc-line)] overflow-hidden">
            {filtered.map((t) => {
              const cat = GLOSSARY_CATEGORIES.find((c) => c.id === t.category)!;
              return (
                <li key={t.term}>
                  <button
                    onClick={() => setOpen(t.term)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors",
                      open === t.term
                        ? "bg-[var(--color-brand-500)]/[0.08]"
                        : "hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.colour }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold">
                        {t.term}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--fc-fg-subtle)]">
                        {t.short}
                      </span>
                    </span>
                    <ChevronRight className="size-3.5 shrink-0 text-[var(--fc-fg-subtle)]" />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="space-y-4">
          {term && <TermDetail term={term} onPick={setOpen} />}

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">The eight categories</h2>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              Start with the one that matches the problem you are actually solving.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {GLOSSARY_CATEGORIES.map((c) => {
                const n = GLOSSARY.filter((t) => t.category === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className="flex items-center gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2.5 text-left transition-colors hover:border-[var(--color-brand-500)]"
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-[16px]"
                      style={{ backgroundColor: `${c.colour}22` }}
                    >
                      {c.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold">{c.label}</span>
                      <span className="block text-[11px] text-[var(--fc-fg-subtle)]">
                        {n} term{n === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermDetail({
  term,
  onPick,
}: {
  term: GlossaryTerm;
  onPick: (t: string) => void;
}) {
  const toast = useToast();
  const cat = GLOSSARY_CATEGORIES.find((c) => c.id === term.category)!;

  return (
    <div className="fc-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="grid size-10 place-items-center rounded-xl text-[18px]"
          style={{ backgroundColor: `${cat.colour}22` }}
        >
          {cat.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-semibold tracking-tight">{term.term}</h2>
          <p className="text-[12.5px] text-[var(--fc-fg-muted)]">{term.short}</p>
        </div>
        <Badge tone="accent">{cat.label}</Badge>
        <button
          onClick={async () => {
            const ok = await copyToClipboard(
              `**${term.term}** — ${term.short}\n\n${term.plain}`,
            );
            toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
          }}
          className="btn btn-secondary btn-sm"
        >
          <Copy className="size-3.5" />
          Copy
        </button>
      </div>

      <p className="mt-5 text-[15px] leading-[1.75] text-[var(--fc-fg)]">
        {term.plain}
      </p>

      {term.seeAlso && (
        <div className="mt-5 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
            See also
          </div>
          <button
            onClick={() => onPick(term.seeAlso!)}
            className="mt-1 flex items-center gap-1 text-[13px] font-semibold text-[var(--color-brand-500)]"
          >
            {term.seeAlso}
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      <div className="mt-5">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
          Related terms
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {term.related.map((r) => (
            <button
              key={r}
              onClick={() => onPick(r)}
              className="chip text-[11.5px] transition-colors hover:bg-[var(--color-brand-500)]/[0.12]"
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
