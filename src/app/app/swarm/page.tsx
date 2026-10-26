"use client";

import * as React from "react";
import {
  Activity,
  Brain,
  Cpu,
  Download,
  Network,
  Play,
  RefreshCw,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge, Progress } from "@/components/ui/primitives";
import { AreaChart, BarChart, DonutChart } from "@/components/charts";
import {
  extractGraph,
  generatePersonas,
  runSwarm,
  type GraphNode,
  type SwarmResult,
} from "@/lib/swarm";
import {
  SWARM_DOCUMENTS,
  SWARM_PIPELINE,
  SWARM_STACK,
} from "@/lib/data/swarm";
import { cn, downloadFile } from "@/lib/utils";
import { useToast } from "@/store/useUI";

const SEED_TEXT = `FriendConnect announced a private messenger with end-to-end encrypted calling.
Amara from the trust team says the moderation controls are the real headline.
The launch post quotes 40,000 beta testers and a 4.7 star average.
Critics argue the calling stack still drops on older Android devices.
Carriers in Bangladesh are piloting the SMS gateway with local businesses.`;

export default function SwarmPage() {
  const toast = useToast();
  const [seed, setSeed] = React.useState(SEED_TEXT);
  const [count, setCount] = React.useState(40);
  const [rounds, setRounds] = React.useState(6);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<SwarmResult | null>(null);
  const [nodes, setNodes] = React.useState<GraphNode[]>([]);
  const [activeDoc, setActiveDoc] = React.useState(SWARM_DOCUMENTS[0].id);

  const graph = React.useMemo(() => extractGraph(seed), [seed]);

  const run = () => {
    setRunning(true);
    setNodes(graph.nodes);
    window.setTimeout(() => {
      const personas = generatePersonas(count, seed, graph.nodes);
      const res = runSwarm({ personas, rounds, seed });
      setResult(res);
      setRunning(false);
      toast.success("Simulation complete", `${res.posts.length} posts across ${rounds} rounds.`);
    }, 420);
  };

  const doc = SWARM_DOCUMENTS.find((d) => d.id === activeDoc)!;

  return (
    <div className="mx-auto max-[1700px]">
      <PageHeader
        eyebrow="Research"
        title="Swarm lab"
        description="Build a knowledge graph from a piece of text, give it believable people, then let the conversation run and watch the sentiment spread. Everything runs locally and every run is reproducible from its seed."
        actions={
          <>
            <button
              onClick={() => {
                downloadFile("swarm-report.md", buildReport(result, seed, count, rounds));
                toast.success("Exported", "swarm-report.md");
              }}
              disabled={!result}
              className="btn btn-secondary btn-sm"
            >
              <Download className="size-3.5" />
              Export report
            </button>
            <button onClick={run} disabled={running} className="btn btn-primary btn-sm">
              {running ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Simulating
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  Run simulation
                </>
              )}
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Graph entities"
          value={graph.nodes.length}
          deltaLabel={`${graph.edges.length} relationships extracted`}
          icon={<Network className="size-4" />}
        />
        <StatCard
          label="Personas"
          value={count}
          deltaLabel="archetypes with their own bias and speed"
          icon={<Users className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Rounds"
          value={rounds}
          deltaLabel="each round spreads the opinion further"
          icon={<Workflow className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Convergence"
          value={result ? `${Math.round(result.convergence * 100)}%` : "—"}
          deltaLabel="how settled the room became"
          icon={<Activity className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[380px_1fr]">
        {/* ---------------- controls ---------------- */}
        <aside className="space-y-3">
          <div className="fc-card p-4">
            <h3 className="text-[13.5px] font-semibold">Seed text</h3>
            <p className="mt-0.5 text-[11px] text-[var(--fc-fg-subtle)]">
              Paste the announcement, the review, the thread — anything.
            </p>
            <textarea
              className="field mt-2.5 min-h-[170px] resize-y text-[12px] leading-relaxed"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
            <button
              onClick={() => {
                setSeed(SEED_TEXT);
                setResult(null);
              }}
              className="btn btn-secondary btn-sm mt-2"
            >
              <RefreshCw className="size-3.5" />
              Reset
            </button>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                  Personas
                </span>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={5}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="mt-1.5 w-full accent-[var(--color-brand-500)]"
                />
                <span className="text-[12px] font-semibold tabular-nums">{count}</span>
              </label>
              <label className="block">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                  Rounds
                </span>
                <input
                  type="range"
                  min={2}
                  max={20}
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="mt-1.5 w-full accent-[var(--color-brand-500)]"
                />
                <span className="text-[12px] font-semibold tabular-nums">{rounds}</span>
              </label>
            </div>
          </div>

          <div className="fc-card p-4">
            <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
              <Network className="size-4 text-[var(--color-accent-500)]" />
              Extracted graph
            </h3>
            <ul className="mt-2.5 space-y-1">
              {(nodes.length ? nodes : graph.nodes).slice(0, 10).map((n) => (
                <li
                  key={n.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5"
                >
                  <Badge
                    tone={
                      n.kind === "person"
                        ? "accent"
                        : n.kind === "company"
                        ? "violet"
                        : n.kind === "product"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {n.kind}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                    {n.label}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-[var(--fc-fg-subtle)]">
                    {n.weight.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-[var(--fc-fg-subtle)]">
              {graph.edges.length} edges · named entities, product names, places and
              numbers, each weighted by how often it appears.
            </p>
          </div>

          <div className="fc-card p-4">
            <h3 className="text-[13.5px] font-semibold">Pipeline</h3>
            <ol className="mt-2.5 space-y-2">
              {SWARM_PIPELINE.map((p, i) => (
                <li key={p.id} className="flex gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)] text-[9px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold">{p.name}</span>
                    <span className="block text-[11px] text-[var(--fc-fg-muted)]">
                      {p.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        {/* ---------------- results ---------------- */}
        <div className="space-y-4">
          {!result && (
            <div className="fc-card grid place-items-center p-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
                <Brain className="size-6" />
              </span>
              <p className="mt-3 text-[14px] font-semibold">No simulation yet</p>
              <p className="mt-1 max-w-[420px] text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                Set the seed text, choose how many people take part and how long the
                conversation runs. The same seed always produces the same run.
              </p>
              <button onClick={run} disabled={running} className="btn btn-primary btn-sm mt-4">
                <Play className="size-3.5" />
                Run simulation
              </button>
            </div>
          )}

          {result && (
            <>
              <div className="fc-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-semibold">Focus-group report</h2>
                  <Badge tone="accent">{result.posts.length} posts</Badge>
                  <Badge tone="success">{result.rounds.length} rounds</Badge>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed">{result.verdict}</p>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                      Sentiment per round
                    </div>
                    <div className="mt-2">
                      <AreaChart
                        height={170}
                        labels={result.rounds.map((r) => `R${r.round}`)}
                        series={[
                          { name: "Mean sentiment", data: result.rounds.map((r) => r.meanSentiment) },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                      Topic share
                    </div>
                    <div className="mt-2">
                      <DonutChart
                        size={170}
                        centerLabel="topics"
                        centerValue={String(result.topicShare.length)}
                        data={result.topicShare.slice(0, 6).map((t, i) => ({
                          label: t.topic,
                          value: t.count,
                          color: ["#3b64f6", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#22c55e"][i],
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="fc-card p-5">
                  <h3 className="text-[15px] font-semibold">The conversation</h3>
                  <ul className="mt-3 space-y-2">
                    {result.posts.slice(0, 10).map((p) => (
                      <li
                        key={p.id}
                        className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                            style={{
                              backgroundColor: `hsl(${hueOf(p.authorId)} 60% 45%)`,
                            }}
                          >
                            {p.author.slice(0, 1)}
                          </span>
                          <span className="text-[12px] font-semibold">{p.author}</span>
                          <Badge
                            tone={
                              p.sentiment > 0.15
                                ? "success"
                                : p.sentiment < -0.15
                                ? "danger"
                                : "neutral"
                            }
                          >
                            {p.sentiment > 0.15 ? "positive" : p.sentiment < -0.15 ? "negative" : "neutral"}
                          </Badge>
                          <span className="text-[10.5px] text-[var(--fc-fg-subtle)]">
                            round {p.round} · @{p.handle}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed">{p.text}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10.5px] text-[var(--fc-fg-subtle)]">
                          <span className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 text-[10px]">
                            {p.topic}
                          </span>
                          <span>{p.likes} likes</span>
                          <span>{p.replies} replies</span>
                          <span>influence {p.influence.toFixed(2)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="fc-card p-5">
                    <h3 className="text-[15px] font-semibold">Who moved the room</h3>
                    <ul className="mt-3 space-y-1.5">
                      {result.influence.slice(0, 6).map((i) => (
                        <li
                          key={i.id}
                          className="flex items-center gap-2.5 rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-semibold">
                              {i.name}
                            </span>
                            <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">
                              {i.followers.toLocaleString()} followers
                            </span>
                          </span>
                          <span className="w-24 shrink-0">
                            <Progress value={i.score * 100} tone="accent" />
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums">
                            {i.score.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="fc-card p-5">
                    <h3 className="text-[15px] font-semibold">Opinion shift</h3>
                    <ul className="mt-3 space-y-1.5">
                      {result.personaShift.slice(0, 6).map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-2.5 rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5 text-[11.5px]"
                        >
                          <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                          <span className="tabular-nums text-[var(--fc-fg-subtle)]">
                            {p.from.toFixed(2)}
                          </span>
                          <span className="text-[var(--fc-fg-subtle)]">→</span>
                          <span
                            className={cn(
                              "tabular-nums font-semibold",
                              p.to > p.from
                                ? "text-emerald-500"
                                : p.to < p.from
                                ? "text-rose-500"
                                : "text-[var(--fc-fg-muted)]",
                            )}
                          >
                            {p.to.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="fc-card p-5">
                    <h3 className="text-[15px] font-semibold">Round by round</h3>
                    <div className="mt-2">
                      <BarChart
                        height={160}
                        labels={result.rounds.map((r) => `R${r.round}`)}
                        series={[
                          { name: "Positive", data: result.rounds.map((r) => r.positive) },
                          { name: "Neutral", data: result.rounds.map((r) => r.neutral) },
                          { name: "Negative", data: result.rounds.map((r) => r.negative) },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ---------------- docs & stack ---------------- */}
          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
              {SWARM_DOCUMENTS.map((d) => (
                <FilterChip
                  key={d.id}
                  active={activeDoc === d.id}
                  onClick={() => setActiveDoc(d.id)}
                >
                  {d.title}
                </FilterChip>
              ))}
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <h3 className="text-[15px] font-semibold">{doc.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {doc.summary}
                </p>
                <pre className="fc-scroll-thin mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {doc.body}
                </pre>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="accent">{doc.kind}</Badge>
                  <Badge>{doc.suggestedAgents} agents</Badge>
                  <Badge>{doc.suggestedRounds} rounds</Badge>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
                <div className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                  <Cpu className="size-3.5" />
                  What it needs
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {SWARM_STACK.map((s) => (
                    <li key={s.label} className="flex items-start gap-2 text-[12px]">
                      <span className="min-w-[86px] shrink-0 font-semibold">{s.label}</span>
                      <span className="min-w-0 flex-1 text-[var(--fc-fg-muted)]">
                        {s.original}
                      </span>
                      <Badge tone="success">{s.offline}</Badge>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-violet-500)]/[0.08] px-2.5 py-2 text-[11.5px] text-[var(--color-violet-500)]">
                  <Sparkles className="size-3.5" />
                  No API key is required for the deterministic engine — the model is
                  optional.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function hueOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function buildReport(
  result: SwarmResult | null,
  seed: string,
  count: number,
  rounds: number,
): string {
  if (!result) return "# Swarm report\n\nNo run yet.\n";
  const lines = [
    "# Swarm focus-group report",
    "",
    `Seed characters: ${seed.length}`,
    `Personas: ${count}`,
    `Rounds: ${rounds}`,
    `Posts: ${result.posts.length}`,
    `Convergence: ${(result.convergence * 100).toFixed(1)}%`,
    "",
    "## Verdict",
    "",
    result.verdict,
    "",
    "## Rounds",
    "",
    "| Round | Posts | Positive | Neutral | Negative | Mean sentiment | Top topic |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...result.rounds.map(
      (r) =>
        `| ${r.round} | ${r.posts} | ${r.positive} | ${r.neutral} | ${r.negative} | ${r.meanSentiment.toFixed(3)} | ${r.topTopic} |`,
    ),
    "",
    "## Most influential",
    "",
    ...result.influence.map(
      (i) => `- ${i.name} — score ${i.score.toFixed(3)}, ${i.followers.toLocaleString()} followers`,
    ),
    "",
  ];
  return lines.join("\n");
}
