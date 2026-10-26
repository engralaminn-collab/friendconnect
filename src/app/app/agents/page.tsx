"use client";

import * as React from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gauge,
  Play,
  Plus,
  Settings2,
  Shield,
  Terminal,
  Timer,
  Wrench,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { AreaChart, RadarChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, formatNumber, uid } from "@/lib/utils";
import type { Agent, AgentRun } from "@/lib/types";

const TOOL_LIBRARY = [
  { name: "read_csv", desc: "Parse a CSV into structured rows", group: "data" },
  { name: "read_doc", desc: "Read a document or web page", group: "data" },
  { name: "search_web", desc: "Search the web and return snippets", group: "research" },
  { name: "enrich_company", desc: "Firmographics for a domain", group: "data" },
  { name: "score_lead", desc: "Score a record against the ICP", group: "crm" },
  { name: "write_crm", desc: "Create or update a CRM record", group: "crm" },
  { name: "rewrite", desc: "Rewrite copy in a target tone", group: "content" },
  { name: "humanize", desc: "Run the six-pass humaniser", group: "content" },
  { name: "generate_captions", desc: "Align captions to a timeline", group: "studio" },
  { name: "schedule_post", desc: "Queue a social post", group: "content" },
  { name: "fetch_page", desc: "Fetch and parse HTML", group: "research" },
  { name: "check_links", desc: "Validate links and anchors", group: "research" },
  { name: "estimate_duration", desc: "Estimate narration runtime", group: "studio" },
  { name: "tts_render", desc: "Render narration audio", group: "studio" },
];

const MODELS = [
  { id: "claude-opus-4", label: "Claude Opus 4", best: "Complex reasoning" },
  { id: "gpt-5", label: "GPT-5", best: "General purpose" },
  { id: "claude-sonnet-4", label: "Claude Sonnet 4", best: "Speed and cost" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", best: "Long context" },
  { id: "gpt-5-mini", label: "GPT-5 mini", best: "High volume" },
  { id: "local-llama", label: "Local Llama", best: "Self-hosted, private" },
];

const STOP_CONDITIONS = [
  {
    id: "goal",
    label: "Goal predicate",
    desc: "The model emits a final answer and a separate verifier confirms it satisfies the task.",
    icon: CheckCircle2,
    tone: "success" as const,
  },
  {
    id: "steps",
    label: "Step budget",
    desc: "A hard ceiling on tool calls. Most tasks terminate inside six to twenty steps.",
    icon: Gauge,
    tone: "brand" as const,
  },
  {
    id: "repeat",
    label: "Repetition guard",
    desc: "Identical tool plus identical arguments halts the run. Almost every loop is a repetition loop.",
    icon: AlertTriangle,
    tone: "signal" as const,
  },
  {
    id: "clock",
    label: "Wall-clock budget",
    desc: "Every tool gets a timeout shorter than the run budget, so one slow call cannot stall a run.",
    icon: Timer,
    tone: "violet" as const,
  },
];

/** A deterministic simulation of a bounded agent run. */
function simulateRun(agent: Agent, prompt: string): AgentRun["steps"] {
  const plan: Record<string, { tool: string; input: string; output: string; ms: number }[]> = {
    "Lead Enricher": [
      { tool: "read_csv", input: "imports/leads-q3.csv", output: "40 rows parsed, 3 duplicate emails removed", ms: 210 },
      { tool: "search_web", input: "company size + industry for 37 domains", output: "31 resolved, 6 ambiguous", ms: 8_420 },
      { tool: "enrich_company", input: "31 resolved domains", output: "employees, revenue, tech stack attached", ms: 4_180 },
      { tool: "score_lead", input: "ICP: EMEA SaaS, 50-500 emp, Series A-C", output: "12 qualified (score ≥ 70), 9 nurture", ms: 640 },
      { tool: "write_crm", input: "12 qualified + 9 nurture", output: "21 records created, 3 flagged for review", ms: 1_020 },
    ],
    "Content Repurposer": [
      { tool: "read_doc", input: "articles/attribution-without-guesswork.md", output: "1,180 words, 6 headings loaded", ms: 140 },
      { tool: "rewrite", input: "tone: punchy, length: 400 words", output: "rewritten draft, 388 words", ms: 2_900 },
      { tool: "humanize", input: "6-pass humaniser", output: "score 61 → 88, 11 edits applied", ms: 480 },
      { tool: "generate_captions", input: "3 scene list, 58 seconds", output: "5 cues aligned", ms: 320 },
      { tool: "schedule_post", input: "LinkedIn + X, tomorrow 09:00", output: "2 posts queued", ms: 210 },
    ],
    "Application Advisor": [
      { tool: "read_profile", input: "students/samuel-okafor.json", output: "IELTS 6.5 (writing 5.5), A-levels", ms: 90 },
      { tool: "search_courses", input: "query: CS, entry ≤ 6.5, no band < 6.0", output: "18 matching courses", ms: 1_640 },
      { tool: "check_entry", input: "18 courses vs profile", output: "4 eligible, 14 fail band rules", ms: 620 },
      { tool: "draft_rationale", input: "4 courses", output: "shortlist rationale, 340 words", ms: 2_100 },
    ],
    "SEO Auditor": [
      { tool: "fetch_page", input: "/consultancy", output: "200 OK, 48 KB HTML", ms: 890 },
      { tool: "parse_html", input: "head, headings, links, images", output: "1 h1, 6 h2, 11 internal, 7 images", ms: 240 },
      { tool: "check_links", input: "18 links", output: "3 broken (2 redirects, 1 404)", ms: 3_100 },
      { tool: "score_page", input: "8 checks", output: "score 38 — meta description + schema missing", ms: 180 },
    ],
    "Script to Voice": [
      { tool: "read_script", input: "scenes for 'agent loop deep dive'", output: "6 scenes, 186 words", ms: 110 },
      { tool: "estimate_duration", input: "186 words @ 150 wpm", output: "74.4 seconds", ms: 60 },
      { tool: "tts_render", input: "voice: Aria, rate 1.0", output: "6 clips rendered, 74.2s total", ms: 7_800 },
      { tool: "align_captions", input: "6 clips → 7 cues", output: "7 cues aligned within 80ms", ms: 940 },
    ],
  };

  const base = plan[agent.name] ?? [
    { tool: "read_doc", input: prompt.slice(0, 48), output: "input parsed", ms: 180 },
    { tool: "search_web", input: "context gathering", output: "6 sources found", ms: 2_400 },
    { tool: "rewrite", input: "synthesise", output: "output generated", ms: 1_800 },
  ];

  // Trim to the agent's tool allow-list, or add a generic step.
  const allowed = base.filter((s) => agent.tools.includes(s.tool));
  const steps = allowed.length ? allowed : base.slice(0, 2);
  const maxSteps = Math.max(2, Math.min(agent.tools.length, 8));
  return steps.slice(0, maxSteps);
}

export default function AgentsPage() {
  const agents = useStore((s) => s.agents);
  const runs = useStore((s) => s.agentRuns);
  const addAgent = useStore((s) => s.addAgent);
  const addAgentRun = useStore((s) => s.addAgentRun);
  const updateAgent = useStore((s) => s.updateAgent);
  const toast = useToast();

  const [activeId, setActiveId] = React.useState<string | null>(agents[0]?.id ?? null);
  const [prompt, setPrompt] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [liveSteps, setLiveSteps] = React.useState<AgentRun["steps"]>([]);
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    role: "",
    description: "",
    model: MODELS[0].id,
    tools: [] as string[],
    temperature: 0.3,
  });

  const active = agents.find((a) => a.id === activeId) ?? agents[0] ?? null;
  const agentRuns = runs.filter((r) => r.agentId === active?.id);

  const run = async () => {
    if (!active) return;
    if (!prompt.trim()) {
      toast.warning("Missing prompt", "Tell the agent what to do.");
      return;
    }
    setRunning(true);
    setLiveSteps([]);
    const plan = simulateRun(active, prompt);
    for (const step of plan) {
      await new Promise((r) => setTimeout(r, 420));
      setLiveSteps((s) => [...s, step]);
    }
    const failed = plan.some((s) => s.output.includes("terminated"));
    addAgentRun({
      agentId: active.id,
      prompt,
      steps: plan,
      status: failed ? "error" : "success",
    });
    updateAgent(active.id, { runs: active.runs + 1 });
    setRunning(false);
    toast.success(
      failed ? "Run halted" : "Run complete",
      failed
        ? "Repetition guard triggered — the run terminated safely."
        : `${plan.length} steps, ${plan.reduce((a, s) => a + s.ms, 0)}ms total.`,
    );
  };

  const createAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning("Missing name", "Name the agent.");
      return;
    }
    const created = addAgent({
      name: form.name.trim(),
      role: form.role || "Custom",
      description: form.description,
      model: form.model,
      tools: form.tools,
      temperature: form.temperature,
    });
    setActiveId(created.id);
    setModal(false);
    toast.success("Agent created", created.name);
  };

  const totalRuns = agents.reduce((a, x) => a + x.runs, 0);
  const avgSuccess = agents.length
    ? Math.round(agents.reduce((a, x) => a + x.successRate, 0) / agents.length)
    : 0;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Engineering"
        title="Agent builder"
        description="Bounded tool-calling loops with four independent stop conditions. Every run is traced, timed and replayable."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            New agent
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Agents"
          value={agents.length}
          deltaLabel="configured"
          icon={<Bot className="size-4" />}
        />
        <StatCard
          label="Total runs"
          value={formatNumber(totalRuns)}
          deltaLabel="across every agent"
          icon={<Zap className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Success rate"
          value={`${avgSuccess}%`}
          deltaLabel="mean across agents"
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Tools available"
          value={TOOL_LIBRARY.length}
          deltaLabel="shared across agents"
          icon={<Wrench className="size-4" />}
          tone="violet"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[240px_1fr_320px]">
        <div className="fc-card flex flex-col overflow-hidden">
          <div className="border-b border-[var(--fc-line)] px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
            Agents
          </div>
          <ul>
            {agents.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => setActiveId(a.id)}
                  className={cn(
                    "w-full border-b border-[var(--fc-line)] px-3.5 py-3 text-left transition-colors",
                    activeId === a.id
                      ? "bg-[var(--color-brand-500)]/[0.09]"
                      : "hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Bot className="size-3.5 shrink-0 text-[var(--color-brand-500)]" />
                    <span className="truncate text-[12.5px] font-semibold">{a.name}</span>
                  </span>
                  <span className="mt-1 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                    {a.role} · {formatNumber(a.runs)} runs · {a.successRate}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {!active ? (
            <EmptyState
              icon={<Bot className="size-6" />}
              title="No agent selected"
              description="Pick one from the list or create a new one."
            />
          ) : (
            <>
              <div className="fc-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[17px] font-semibold">{active.name}</h2>
                    <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {active.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="brand">{active.role}</Badge>
                    <Badge>{active.model}</Badge>
                    <Badge tone="signal">temp {active.temperature}</Badge>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    Tool allow-list
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {active.tools.map((t) => (
                      <span key={t} className="chip">
                        <Wrench className="size-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="fc-card p-5">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  <Terminal className="size-4 text-[var(--color-brand-500)]" />
                  Run
                </h3>
                <textarea
                  className="field mt-3 min-h-[86px] resize-y"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enrich and score the raw leads in imports/leads-q3.csv against our EMEA SaaS ICP."
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={run} disabled={running} className="btn btn-primary btn-sm">
                    {running ? (
                      <>
                        <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Running…
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5" />
                        Run agent
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setPrompt(
                        "Enrich and score the raw leads in imports/leads-q3.csv against our EMEA SaaS ICP.",
                      );
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Use example
                  </button>
                  <span className="ml-auto text-[11.5px] text-[var(--fc-fg-subtle)]">
                    4 stop conditions enforced · step budget 8 · wall clock 30s
                  </span>
                </div>

                {(running || liveSteps.length > 0) && (
                  <ol className="mt-4 space-y-2">
                    {liveSteps.map((s, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                        style={{ animation: "rise .3s cubic-bezier(.16,1,.3,1) both" }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid size-5 place-items-center rounded-md bg-[var(--color-brand-500)]/15 text-[10px] font-bold text-[var(--color-brand-500)]">
                            {i + 1}
                          </span>
                          <span className="font-mono text-[12px] font-semibold">{s.tool}</span>
                          <ChevronRight className="size-3 text-[var(--fc-fg-subtle)]" />
                          <span className="text-[11.5px] text-[var(--fc-fg-muted)]">
                            {s.input}
                          </span>
                          <span className="ml-auto inline-flex items-center gap-1 text-[11px] tabular-nums text-[var(--fc-fg-subtle)]">
                            <Clock className="size-3" />
                            {s.ms}ms
                          </span>
                        </div>
                        <div className="mt-1.5 pl-7 text-[12px] text-[var(--fc-fg-muted)]">
                          → {s.output}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {agentRuns.length > 0 && (
                <div className="fc-card overflow-hidden">
                  <div className="border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
                    <h3 className="text-[15px] font-semibold">Run history</h3>
                  </div>
                  <ul className="divide-y divide-[var(--fc-line)]">
                    {agentRuns.slice(0, 6).map((r) => (
                      <li key={r.id} className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={r.status === "success" ? "success" : r.status === "error" ? "danger" : "brand"} dot>
                            {r.status}
                          </Badge>
                          <span className="text-[12.5px] text-[var(--fc-fg-muted)]">
                            {r.prompt}
                          </span>
                          <span className="ml-auto text-[11px] tabular-nums text-[var(--fc-fg-subtle)]">
                            {r.steps.length} steps ·{" "}
                            {r.steps.reduce((a, s) => a + s.ms, 0)}ms
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {r.steps.map((s, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-[11.5px] text-[var(--fc-fg-subtle)]"
                            >
                              <span className="font-mono">{s.tool}</span>
                              <span className="truncate">→ {s.output}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold">
              <Shield className="size-4 text-[var(--color-accent-500)]" />
              Stop conditions
            </h3>
            <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
              Four independent conditions, all required
            </p>
            <ul className="mt-4 space-y-2.5">
              {STOP_CONDITIONS.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                >
                  <div className="flex items-center gap-2">
                    <c.icon
                      className={cn(
                        "size-3.5",
                        c.tone === "success"
                          ? "text-emerald-500"
                          : c.tone === "signal"
                          ? "text-[var(--color-signal-500)]"
                          : c.tone === "violet"
                          ? "text-violet-500"
                          : "text-[var(--color-brand-500)]",
                      )}
                    />
                    <span className="text-[12.5px] font-semibold">{c.label}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {c.desc}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">Agent capability</h3>
            <div className="mt-4">
              <RadarChart
                size={210}
                axes={["Speed", "Reliability", "Coverage", "Depth", "Safety", "Cost"]}
                series={[
                  {
                    name: "This agent",
                    data: [78, 94, 72, 81, 88, 69],
                    color: "#3b64f6",
                  },
                ]}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">Run volume</h3>
            <div className="mt-4">
              <AreaChart
                height={160}
                labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                series={[
                  {
                    name: "Runs",
                    data: [24, 38, 31, 52, 46, 18, 12],
                    color: "var(--color-accent-500)",
                  },
                ]}
              />
            </div>
            <div className="mt-3">
              <Progress value={avgSuccess} tone="success" />
              <p className="mt-1.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
                {avgSuccess}% of runs terminate cleanly
              </p>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Create an agent"
        description="Pick a model, choose the tools it may call, and set how deterministic it should be."
        size="lg"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={createAgent} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Create agent
            </button>
          </>
        }
      >
        <form onSubmit={createAgent} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Name *</span>
              <input
                className="field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Role</span>
              <input
                className="field"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="RevOps"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Description</span>
            <textarea
              className="field min-h-[70px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Model</span>
            <select
              className="field"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.best}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold">Tool allow-list</span>
            <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2 sm:grid-cols-2">
              {TOOL_LIBRARY.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      tools: form.tools.includes(t.name)
                        ? form.tools.filter((x) => x !== t.name)
                        : [...form.tools, t.name],
                    })
                  }
                  className={cn(
                    "rounded-lg px-2.5 py-2 text-left transition-colors",
                    form.tools.includes(t.name)
                      ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                      : "hover:bg-[var(--fc-surface-3)]",
                  )}
                >
                  <span className="block font-mono text-[11.5px] font-semibold">{t.name}</span>
                  <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">
              Temperature — {form.temperature.toFixed(2)}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={form.temperature}
              onChange={(e) =>
                setForm({ ...form, temperature: Number(e.target.value) })
              }
              className="w-full accent-[var(--color-brand-500)]"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
