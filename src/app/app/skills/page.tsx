"use client";

import * as React from "react";
import {
  Bot,
  Boxes,
  Check,
  ChevronRight,
  Circle,
  ClipboardCopy,
  Code2,
  Compass,
  FileJson,
  Layers,
  ListChecks,
  Package,
  Play,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wand2,
  Workflow,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/primitives";
import {
  ITERATIVE_COMMANDS,
  MCP_SERVERS,
  ONBOARDING_STEPS,
  SKILLS,
  SKILL_CONTRACTS,
  type SkillFamily,
} from "@/lib/data/skills";
import { cn, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/store/useUI";

const FAMILY_TONE: Record<SkillFamily, "brand" | "accent" | "violet" | "success" | "signal" | "danger" | "neutral"> = {
  dispatcher: "brand",
  onboarding: "accent",
  core: "success",
  components: "violet",
  placement: "neutral",
  customization: "accent",
  features: "signal",
  calls: "success",
  push: "neutral",
  migration: "neutral",
  production: "danger",
  testing: "signal",
  troubleshooting: "danger",
  "cross-cutting": "violet",
};

export default function SkillsPage() {
  const toast = useToast();
  const [family, setFamily] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");
  const [activeSkill, setActiveSkill] = React.useState<string | null>("sk_cometchat");
  const [activeMcp, setActiveMcp] = React.useState<string | null>("mcp_cometchat_docs");
  const [stage, setStage] = React.useState(0);

  const families = [
    ...new Set(SKILLS.map((s) => s.family)),
  ] as SkillFamily[];

  const filtered = SKILLS.filter((s) => {
    if (family !== "all" && s.family !== family) return false;
    if (
      query &&
      !s.name.toLowerCase().includes(query.toLowerCase()) &&
      !s.summary.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    return true;
  });

  const skill = SKILLS.find((s) => s.id === activeSkill) ?? null;
  const mcp = MCP_SERVERS.find((m) => m.id === activeMcp) ?? null;

  return (
    <div className="mx-auto max-[1700px]">
      <PageHeader
        eyebrow="Agent tooling"
        title="Skills & MCP"
        description="The pack that teaches an AI coding agent to build the messenger and the calling SDK — plus the documentation server that lets an agent read the guides instead of guessing."
        actions={
          <button
            onClick={async () => {
              const ok = await copyToClipboard(
                "npx @cometchat/skills add\nnpx @cometchat/skills add --ide cursor",
              );
              toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
            }}
            className="btn btn-primary btn-sm"
          >
            <ClipboardCopy className="size-3.5" />
            Copy install command
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Skills"
          value={SKILLS.length}
          deltaLabel={`across ${families.length} families`}
          icon={<Wand2 className="size-4" />}
        />
        <StatCard
          label="MCP servers"
          value={MCP_SERVERS.length}
          deltaLabel={`${MCP_SERVERS.filter((m) => m.readOnly).length} read-only`}
          icon={<Server className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Contracts"
          value={SKILL_CONTRACTS.length}
          deltaLabel="one per platform family"
          icon={<FileJson className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Onboarding stages"
          value={ONBOARDING_STEPS.length}
          deltaLabel="discover, understand, plan, approve"
          icon={<Compass className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[340px_1fr]">
        {/* ---------------- skill list ---------------- */}
        <aside className="space-y-3">
          <div className="fc-card p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field h-8 pl-8 text-[12.5px]"
                placeholder="Search skills…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <FilterChip
                active={family === "all"}
                onClick={() => setFamily("all")}
                count={SKILLS.length}
              >
                All
              </FilterChip>
              {families.map((f) => (
                <FilterChip
                  key={f}
                  active={family === f}
                  onClick={() => setFamily(f)}
                  count={SKILLS.filter((s) => s.family === f).length}
                >
                  {f}
                </FilterChip>
              ))}
            </div>
          </div>

          <ul className="fc-card divide-y divide-[var(--fc-line)] overflow-hidden">
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setActiveSkill(s.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors",
                    activeSkill === s.id
                      ? "bg-[var(--color-brand-500)]/[0.08]"
                      : "hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                      s.weight >= 90
                        ? "bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]"
                        : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)]",
                    )}
                  >
                    <Bot className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold">
                      {s.name}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                      {s.family} · {s.platform}
                    </span>
                  </span>
                  <span className="mt-1 text-[10px] tabular-nums text-[var(--fc-fg-subtle)]">
                    {s.weight}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* ---------------- detail ---------------- */}
        <div className="space-y-4">
          {skill && (
            <div className="fc-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-semibold">{skill.name}</h2>
                <Badge tone={FAMILY_TONE[skill.family]}>{skill.family}</Badge>
                <Badge>platform: {skill.platform}</Badge>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                {skill.summary}
              </p>

              <h3 className="mt-5 text-[11.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                What it does
              </h3>
              <ul className="mt-2 space-y-1.5">
                {skill.behaviour.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-[12.5px] leading-relaxed"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    {b}
                  </li>
                ))}
              </ul>

              <h3 className="mt-5 text-[11.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                Triggers
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skill.triggers.map((t) => (
                  <span key={t} className="chip font-mono text-[10.5px]">
                    “{t}”
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* onboarding */}
          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Compass className="size-4 text-[var(--color-accent-500)]" />
              The onboarding journey
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              Discover, understand, plan, approve. Nothing is written until the plan is
              approved.
            </p>
            <ol className="mt-4 space-y-2">
              {ONBOARDING_STEPS.map((s, i) => (
                <li
                  key={s.id}
                  className={cn(
                    "rounded-xl border p-3.5 transition-colors",
                    i === stage
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.06]"
                      : "border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
                  )}
                >
                  <button
                    onClick={() => setStage(i)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                        i < stage
                          ? "bg-emerald-500 text-white"
                          : "bg-[var(--color-brand-500)] text-white",
                      )}
                    >
                      {i < stage ? "✓" : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold">{s.question}</span>
                        <Badge tone="accent">{s.stage}</Badge>
                      </span>
                      <span className="mt-1 block text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                        {s.why}
                      </span>
                      {s.options && (
                        <span className="mt-2 flex flex-wrap gap-1">
                          {s.options.map((o) => (
                            <span
                              key={o}
                              className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 text-[10.5px]"
                            >
                              {o}
                            </span>
                          ))}
                        </span>
                      )}
                      {s.inferred && (
                        <span className="mt-2 block rounded-lg bg-[var(--fc-surface-3)] px-2 py-1 font-mono text-[10.5px] text-[var(--fc-fg-muted)]">
                          {s.inferred}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {/* iterative commands */}
          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Sparkles className="size-4 text-[var(--color-violet-500)]" />
              Iterating after the first build
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              The same conversation keeps going. Each phrase routes to one scoped
              skill.
            </p>
            <ul className="mt-3 space-y-1.5">
              {ITERATIVE_COMMANDS.map((c) => (
                <li
                  key={c.phrase}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <code className="font-mono text-[11.5px] font-semibold text-[var(--color-brand-500)]">
                    “{c.phrase}”
                  </code>
                  <Badge>{c.skill}</Badge>
                  <span className="min-w-0 flex-1 text-[11.5px] text-[var(--fc-fg-muted)]">
                    {c.effect}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* contracts */}
          <div className="fc-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
              <FileJson className="size-4 text-[var(--color-accent-500)]" />
              <h2 className="text-[15px] font-semibold">Contract files</h2>
              <span className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                what each platform must expose
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-[var(--fc-surface-2)] text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Platform</th>
                    <th className="px-4 py-2 font-semibold">File</th>
                    <th className="px-4 py-2 text-right font-semibold">Components</th>
                    <th className="px-4 py-2 text-right font-semibold">Features</th>
                    <th className="px-4 py-2 text-right font-semibold">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fc-line)]">
                  {SKILL_CONTRACTS.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 font-semibold">{c.platform}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[var(--fc-fg-muted)]">
                        {c.file}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.components}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.features}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- MCP servers ---------------- */}
      <div className="mt-4">
        <h2 className="text-[15px] font-semibold">MCP servers</h2>
        <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
          The documentation server is read-only and needs no account or key — an
          agent can look a method up instead of inventing one.
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[300px_1fr]">
          <ul className="fc-card divide-y divide-[var(--fc-line)] overflow-hidden">
            {MCP_SERVERS.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => setActiveMcp(m.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors",
                    activeMcp === m.id
                      ? "bg-[var(--color-brand-500)]/[0.08]"
                      : "hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)]">
                    <Server className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold">
                      {m.name}
                    </span>
                    <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">
                      {m.transport} · {m.auth}
                    </span>
                  </span>
                  {m.readOnly && <Badge tone="success">read-only</Badge>}
                </button>
              </li>
            ))}
          </ul>

          {mcp && (
            <div className="fc-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold">{mcp.name}</h3>
                <Badge>{mcp.publisher}</Badge>
                <Badge tone="accent">{mcp.transport}</Badge>
                {mcp.readOnly && <Badge tone="success">read-only</Badge>}
              </div>
              <code className="mt-2 block font-mono text-[11.5px] text-[var(--fc-fg-muted)]">
                {mcp.url}
              </code>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="text-[11.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                    Tools
                  </h4>
                  <ul className="mt-2 space-y-1.5">
                    {mcp.tools.map((t) => (
                      <li
                        key={t.name}
                        className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-1.5"
                      >
                        <code className="font-mono text-[11.5px] font-bold text-[var(--color-brand-500)]">
                          {t.name}
                        </code>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                          {t.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[11.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                    Prompts
                  </h4>
                  <ul className="mt-2 space-y-1.5">
                    {mcp.prompts.map((p) => (
                      <li
                        key={p.name}
                        className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-1.5"
                      >
                        <code className="font-mono text-[11.5px] font-bold">
                          {p.name}
                        </code>
                        <p className="mt-0.5 text-[11.5px] italic text-[var(--fc-fg-muted)]">
                          “{p.example}”
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <h4 className="mt-5 text-[11.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                Install
              </h4>
              <ul className="mt-2 space-y-1.5">
                {mcp.install.map((i) => (
                  <li
                    key={i.agent}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-1.5"
                  >
                    <span className="w-28 shrink-0 text-[11.5px] font-semibold">
                      {i.agent}
                    </span>
                    <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[10.5px] text-[var(--fc-fg-muted)]">
                      {i.command}
                    </code>
                    <button
                      onClick={async () => {
                        const ok = await copyToClipboard(i.command);
                        toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                      }}
                      className="grid size-6 shrink-0 place-items-center rounded-md bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
                    >
                      <ClipboardCopy className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>

              {mcp.registry.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-[var(--fc-fg-subtle)]">Listed in:</span>
                  {mcp.registry.map((r) => (
                    <Badge key={r}>{r}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
