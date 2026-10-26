"use client";

import * as React from "react";
import {
  Brain,
  Coins,
  Cpu,
  Eye,
  Gauge,
  Layers,
  Route,
  Search,
  Split,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { BarChart, RadarChart } from "@/components/charts";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard } from "@/lib/utils";
import {
  MODEL_CATALOG,
  ROUTER_RULES,
  SCENARIO_PROMPTS,
  type ChatTurn,
  type ModelCard,
} from "@/lib/data/models";

/** Deterministic mock completion, shaped differently per model family. */
function mockCompletion(model: ModelCard, turns: ChatTurn[]): string {
  const user = turns.filter((t) => t.role === "user").map((t) => t.content).join(" ");
  const seed = model.id.length * 31 + user.length;
  const intro = model.family.startsWith("Claude")
    ? "Here is the short answer, then the reasoning."
    : model.family.startsWith("GPT")
    ? "Short answer first."
    : model.family.startsWith("Gemini")
    ? "Considering the whole input together:"
    : model.family.startsWith("GLM")
    ? "Answer:"
    : "Here you go.";

  const bodies: Record<string, string[]> = {
    "Claude 4": [
      `${intro} Three signals drive this: headcount sits inside the band, the product appears in a procurement-led category, and the funding stage matches.`,
      `Score: 82. The gap is that "Series A–C" could not be confirmed from the input, so it was excluded rather than assumed.`,
    ],
    "GPT-5": [
      `${intro} Score 82/100.`,
      `Drivers: headcount 260 (inside band), procurement-led category (strong), Series A–C confirmed (neutral). Excluded: region (unknown, not disqualifying).`,
    ],
    "Gemini 2.5": [
      `${intro} Across the full record, the company clears two of three hard constraints and one soft signal.`,
      `Weighted score 82. Headcount 260 → full points. Procurement category → full points. Funding stage unknown → no points, no penalty.`,
    ],
    GLM: [
      `${intro} Score 82/100.`,
      `Signals: headcount 260 (pass), procurement category (pass), Series A–C (unconfirmed). Recommendation: qualify, verify funding stage before the call.`,
    ],
    "DeepSeek": [
      `${intro} score=82 signals=[headcount_260, procurement_category, series_unknown] excluded=[funding_stage]`,
    ],
    "Llama 4": [
      `${intro} Score 82/100. Headcount and category match the ICP; funding stage is unknown, so it neither adds nor subtracts. Recommend qualifying with a funding-stage verification question on the first call.`,
    ],
    "Llama 3": [
      `${intro} Score 82. Qualified on headcount and category. Funding stage not in the input, so it was left out of the score rather than guessed at.`,
    ],
    Qwen3: [
      `${intro} {\n  "score": 82,\n  "signals": ["headcount_260", "procurement_category"],\n  "excluded": ["funding_stage_unknown"],\n  "recommendation": "qualify"\n}`,
    ],
    "Mistral": [
      `${intro} Score: 82/100. Two of three hard constraints are met; the third cannot be evaluated from the input, so it is excluded rather than estimated.`,
    ],
    Grok: [
      `${intro} 82. Headcount fits, category fits, and the funding stage is the only gap — but it's a big one, because Series A–C was the whole point of the filter. Verify before you spend a call on it.`,
    ],
  };

  const key = Object.keys(bodies).find((k) => model.family.startsWith(k)) ?? "";
  const lines = bodies[key] ?? [intro];
  return lines.join("\n\n");
}

function estimateTokens(text: string) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length * 1.32));
}

export default function ModelsPage() {
  const toast = useToast();

  const [tab, setTab] = React.useState<"playground" | "catalog" | "router">("playground");
  const [query, setQuery] = React.useState("");
  const [provider, setProvider] = React.useState("all");
  const [selected, setSelected] = React.useState<string[]>(["claude-sonnet-4", "gpt-5", "gemini-2.5-pro"]);
  const [system, setSystem] = React.useState(
    "You are a precise analyst. Be terse. Never invent a fact that is not in the input.",
  );
  const [prompt, setPrompt] = React.useState(
    "Score this lead against our ICP (EMEA SaaS, 50–500 employees, sells to procurement, Series A–C). Return a score 0–100 and the three signals that drove it.",
  );
  const [temperature, setTemperature] = React.useState(0.4);
  const [maxTokens, setMaxTokens] = React.useState(600);
  const [turns, setTurns] = React.useState<ChatTurn[]>([]);
  const [running, setRunning] = React.useState(false);
  const [showRouter, setShowRouter] = React.useState(false);

  const providers = Array.from(new Set(MODEL_CATALOG.map((m) => m.provider)));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODEL_CATALOG.filter((m) => {
      if (provider !== "all" && m.provider !== provider) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.family.toLowerCase().includes(q) ||
        m.bestFor.toLowerCase().includes(q)
      );
    });
  }, [query, provider]);

  const chosen = MODEL_CATALOG.filter((m) => selected.includes(m.id));

  const run = () => {
    if (!prompt.trim()) {
      toast.warning("Empty prompt", "Write something to send.");
      return;
    }
    if (chosen.length === 0) {
      toast.warning("No model selected", "Pick at least one model to compare.");
      return;
    }
    setRunning(true);
    setTurns([]);
    const next: ChatTurn[] = [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ];
    setTurns(next);
    let i = 0;
    const tick = () => {
      i += 1;
      if (i > chosen.length) {
        setRunning(false);
        toast.success("Comparison complete", `${chosen.length} models answered.`);
        return;
      }
      setTimeout(tick, 420);
    };
    setTimeout(tick, 380);
  };

  const toggleModel = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const inputTokens = estimateTokens(system) + estimateTokens(prompt);
  const totalCost = chosen.reduce(
    (a, m) => a + (inputTokens / 1_000_000) * m.inputCost + (600 / 1_000_000) * m.outputCost,
    0,
  );

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Developer"
        title="Model playground"
        description="Run one prompt across several models side by side — compare cost, latency and answer quality before you commit to a provider."
        actions={
          <div className="flex gap-1.5">
            {(
              [
                { id: "playground", label: "Playground" },
                { id: "catalog", label: "Model catalog" },
                { id: "router", label: "Smart router" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn("btn btn-sm", tab === t.id ? "btn-primary" : "btn-ghost")}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Models"
          value={MODEL_CATALOG.length}
          deltaLabel={`${providers.length} providers`}
          icon={<Cpu className="size-4" />}
        />
        <StatCard
          label="Open weights"
          value={MODEL_CATALOG.filter((m) => m.openWeights).length}
          deltaLabel="self-hostable"
          icon={<Layers className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Longest context"
          value="1M"
          deltaLabel="Gemini 2.5 Pro"
          icon={<Eye className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Cheapest output"
          value="$0.80/M"
          deltaLabel="Llama 4 Maverick"
          icon={<Coins className="size-4" />}
          tone="success"
        />
      </div>

      {/* ---------------- Playground ---------------- */}
      {tab === "playground" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Terminal className="size-4 text-[var(--color-brand-500)]" />
                Request
              </h2>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12.5px] font-semibold">System prompt</span>
                <textarea
                  className="field min-h-[72px] resize-y text-[12.5px]"
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12.5px] font-semibold">User prompt</span>
                <textarea
                  className="field min-h-[130px] resize-y text-[12.5px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-semibold">
                    Temperature {temperature.toFixed(2)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full accent-[var(--color-brand-500)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-semibold">
                    Max tokens {maxTokens}
                  </span>
                  <input
                    type="range"
                    min={128}
                    max={4096}
                    step={64}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="w-full accent-[var(--color-brand-500)]"
                  />
                </label>
              </div>

              <button onClick={run} disabled={running} className="btn btn-primary mt-5 w-full">
                {running ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Running…
                  </>
                ) : (
                  <>
                    <Zap className="size-4" />
                    Run on {chosen.length} model{chosen.length === 1 ? "" : "s"}
                  </>
                )}
              </button>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {SCENARIO_PROMPTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setPrompt(s.prompt);
                      setSystem(s.system);
                    }}
                    className="chip hover:border-[var(--color-brand-400)]"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="fc-card p-5">
              <h2 className="text-[15px] font-semibold">Compare these models</h2>
              <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {MODEL_CATALOG.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleModel(m.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      selected.includes(m.id)
                        ? "bg-[var(--color-brand-500)]/[0.1]"
                        : "hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border",
                        selected.includes(m.id)
                          ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)] text-white"
                          : "border-[var(--fc-line)]",
                      )}
                    >
                      {selected.includes(m.id) && <span className="text-[9px]">✓</span>}
                    </span>
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold">
                        {m.name}
                      </span>
                      <span className="block truncate text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {m.provider} · {m.bestFor}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-[var(--fc-fg-muted)]">
                      ${m.inputCost}/${m.outputCost}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--fc-fg-muted)]">Input tokens</span>
                  <span className="font-semibold tabular-nums">{inputTokens}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[12px]">
                  <span className="text-[var(--fc-fg-muted)]">Est. cost this call</span>
                  <span className="font-semibold tabular-nums">
                    ${totalCost.toFixed(4)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[12px]">
                  <span className="text-[var(--fc-fg-muted)]">Est. per 1,000 calls</span>
                  <span className="font-semibold tabular-nums">
                    ${(totalCost * 1000).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {turns.length === 0 ? (
              <div className="fc-card px-6 py-20 text-center">
                <Brain className="mx-auto size-8 text-[var(--fc-fg-subtle)]" />
                <p className="mt-3 text-[15px] font-semibold">Nothing run yet</p>
                <p className="mx-auto mt-1 max-w-md text-[13px] text-[var(--fc-fg-muted)]">
                  Pick your models on the left, write a prompt, and run. Answers appear
                  side by side with cost and latency for each.
                </p>
              </div>
            ) : (
              chosen.map((m, i) => {
                const answer = mockCompletion(m, turns);
                const outTokens = estimateTokens(answer);
                const cost =
                  (inputTokens / 1_000_000) * m.inputCost +
                  (outTokens / 1_000_000) * m.outputCost;
                return (
                  <article key={m.id} className="fc-card overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2.5 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      <h3 className="text-[14.5px] font-semibold">{m.name}</h3>
                      <Badge>{m.provider}</Badge>
                      {m.reasoning && (
                        <Badge tone="violet">
                          <Brain className="size-2.5" />
                          reasoning
                        </Badge>
                      )}
                      <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-[var(--fc-fg-subtle)]">
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="size-3" />
                          {m.speed} t/s
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Coins className="size-3" />${cost.toFixed(4)}
                        </span>
                        <span className="tabular-nums">{outTokens} out</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                        {answer}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--fc-line)] pt-3.5">
                        {m.strengths.map((s) => (
                          <span key={s} className="chip">
                            {s}
                          </span>
                        ))}
                        <button
                          onClick={async () => {
                            const ok = await copyToClipboard(answer);
                            toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                          }}
                          className="btn btn-ghost btn-sm ml-auto"
                        >
                          Copy answer
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ---------------- Catalog ---------------- */}
      {tab === "catalog" && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search models by name, provider or use case…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <FilterChip active={provider === "all"} onClick={() => setProvider("all")}>
              All providers
            </FilterChip>
            {providers.map((p) => (
              <FilterChip
                key={p}
                active={provider === p}
                onClick={() => setProvider(provider === p ? "all" : p)}
              >
                {p}
              </FilterChip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<Cpu className="size-6" />} title="No models match" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((m) => (
                <article key={m.id} className="fc-card fc-card-hover flex flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-white"
                      style={{ backgroundColor: m.color }}
                    >
                      <Cpu className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14.5px] font-semibold">{m.name}</h3>
                      <div className="mt-0.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
                        {m.provider} · {m.family}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModel(m.id)}
                      className={cn(
                        "btn btn-sm shrink-0",
                        selected.includes(m.id) ? "btn-primary" : "btn-ghost",
                      )}
                    >
                      {selected.includes(m.id) ? "Selected" : "Compare"}
                    </button>
                  </div>

                  <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    Best for {m.bestFor.toLowerCase()}.
                  </p>

                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      { l: "Context", v: `${Math.round(m.context / 1000)}K` },
                      { l: "In / Out", v: `$${m.inputCost} / $${m.outputCost}` },
                      { l: "Speed", v: `${m.speed} t/s` },
                      { l: "Quality", v: `${m.quality}/100` },
                    ].map((row) => (
                      <div
                        key={row.l}
                        className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-1.5"
                      >
                        <dt className="text-[10px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          {row.l}
                        </dt>
                        <dd className="mt-0.5 text-[12px] font-semibold">{row.v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.vision && (
                      <Badge tone="accent">
                        <Eye className="size-2.5" />
                        vision
                      </Badge>
                    )}
                    {m.tools && (
                      <Badge tone="brand">
                        <Wrench className="size-2.5" />
                        tools
                      </Badge>
                    )}
                    {m.openWeights && <Badge tone="success">open weights</Badge>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- Router ---------------- */}
      {tab === "router" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="fc-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold">Smart router</h2>
                <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                  Most teams pick one model for everything and overpay on 90% of it.
                  The router picks per task: the cheapest model that can actually do the
                  job, with a frontier model reserved for the steps that need one.
                </p>
              </div>
              <button
                onClick={() => setShowRouter(!showRouter)}
                className="btn btn-secondary btn-sm"
              >
                <Route className="size-3.5" />
                {showRouter ? "Hide" : "Show"} trace
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {ROUTER_RULES.map((r) => {
                const m = MODEL_CATALOG.find((x) => x.id === r.pick)!;
                return (
                  <div
                    key={r.task}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold">{r.task}</span>
                      <span className="text-[var(--fc-fg-subtle)]">→</span>
                      <Badge tone="brand">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                        {m.name}
                      </Badge>
                      <Badge tone="success">{r.saving}</Badge>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {r.why}
                    </p>
                    {showRouter && (
                      <div
                        className="mt-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3 font-mono text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]"
                        style={{ animation: "rise .3s cubic-bezier(.16,1,.3,1) both" }}
                      >
{`route(task="${r.task}")
  → classify: ${r.task.toLowerCase().includes("classif") ? "classification" : r.task.toLowerCase().includes("summar") ? "long_context" : r.task.toLowerCase().includes("agent") ? "agentic" : r.task.toLowerCase().includes("json") || r.task.toLowerCase().includes("extract") ? "structured" : "general"}
  → constraints: quality ≥ ${r.task.toLowerCase().includes("classif") ? 78 : 82}, latency ≤ ${m.speed * 100}ms/1k tok
  → candidates: ${MODEL_CATALOG.length} models
  → scored by: quality, latency, cost, capability fit
  → selected: ${m.id} ($${m.inputCost}/$${m.outputCost} per Mtok)
  → rejected: ${MODEL_CATALOG.filter((x) => x.id !== m.id && x.provider !== m.provider).length} alternatives
  → fallback: ${MODEL_CATALOG.find((x) => x.id !== m.id && x.quality > 90)?.name ?? "claude-opus-4"} on error or timeout`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <Split className="size-4 text-[var(--color-accent-500)]" />
                Quality spread
              </h3>
              <div className="mt-4">
                <BarChart
                  height={220}
                  labels={MODEL_CATALOG.slice(0, 8).map((m) => m.family)}
                  series={[
                    {
                      name: "Quality",
                      data: MODEL_CATALOG.slice(0, 8).map((m) => m.quality),
                    },
                  ]}
                />
              </div>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Cost of always using the best</h3>
              <div className="mt-4 space-y-3">
                {[
                  { l: "One frontier model for everything", v: 1284, best: false },
                  { l: "Routed per task", v: 96, best: true },
                ].map((row) => (
                  <div key={row.l}>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="text-[var(--fc-fg-muted)]">{row.l}</span>
                      <span className="font-semibold tabular-nums">
                        ${row.v.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          row.best ? "bg-emerald-500" : "bg-[var(--color-signal-500)]",
                        )}
                        style={{ width: `${(row.v / 1284) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                On 10,000 calls a month, routing is the difference between a rounding
                error and a line item.
              </p>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Capability matrix</h3>
              <div className="mt-4">
                <RadarChart
                  size={230}
                  axes={["Quality", "Speed", "Cost", "Context", "Tools", "Privacy"]}
                  series={[
                    {
                      name: "Routed mix",
                      data: [86, 84, 92, 78, 88, 82],
                      color: "#3b64f6",
                    },
                  ]}
                />
              </div>
              <div className="mt-3">
                <Progress value={86} tone="brand" />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
