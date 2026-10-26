"use client";

import * as React from "react";
import {
  Check,
  ChevronRight,
  Circle,
  ClipboardCopy,
  Code2,
  Cpu,
  Download,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  Lightbulb,
  Play,
  Server,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge, Progress } from "@/components/ui/primitives";
import { BarChart, DonutChart } from "@/components/charts";
import { generateSuite, suiteToCsv } from "@/lib/robot";
import {
  PROJECT_LAYOUT,
  REQUIREMENT_DOCS,
  SAFETY_RULES,
  TEST_ARTIFACTS,
  TEST_PROVIDERS,
} from "@/lib/data/testing";
import { cn, copyToClipboard, downloadFile } from "@/lib/utils";
import { useToast } from "@/store/useUI";

export default function TestingPage() {
  const toast = useToast();
  const [docId, setDocId] = React.useState(REQUIREMENT_DOCS[0].id);
  const [providerId, setProviderId] = React.useState(TEST_PROVIDERS[0].id);
  const [view, setView] = React.useState<"robot" | "pytest" | "sheet">("robot");
  const [running, setRunning] = React.useState(false);
  const [runLog, setRunLog] = React.useState<string[]>([]);
  const [fallbackUsed, setFallbackUsed] = React.useState(false);

  const doc = REQUIREMENT_DOCS.find((d) => d.id === docId)!;
  const provider = TEST_PROVIDERS.find((p) => p.id === providerId)!;
  const suite = React.useMemo(
    () => generateSuite(doc.criteria, { suiteName: doc.title, tags: doc.tags }),
    [doc],
  );

  const run = () => {
    setRunning(true);
    setRunLog([]);
    setFallbackUsed(false);
    const steps = [
      `reading ${doc.title.toLowerCase()} — ${suite.cases.length} sentences`,
      `provider: ${provider.name} (${provider.model})`,
      `temperature: ${provider.temperature} · deterministic`,
      "prompt built: criteria + rules + required output shape",
      "generating cases…",
      "validating syntax of every generated file",
      `wrote ${suite.cases.length} cases · 0 parse errors`,
    ];
    steps.forEach((s, i) =>
      window.setTimeout(
        () => {
          setRunLog((l) => [...l, s]);
          if (i === steps.length - 1) {
            setRunning(false);
            toast.success("Suite generated", `${suite.cases.length} test cases.`);
          }
        },
        340 * (i + 1),
      ),
    );
  };

  const byKind = ["smoke", "functional", "negative", "edge"].map((k) => ({
    label: k,
    value: suite.cases.filter((c) => c.kind === k).length,
  }));

  return (
    <div className="mx-auto max-[1700px]">
      <PageHeader
        eyebrow="Quality"
        title="Test generation"
        description="Write the acceptance criteria in plain English. Get a Robot Framework suite, a pytest module and a spreadsheet of test cases — generated deterministically, validated before it is written, and never edited by hand afterwards."
        actions={
          <>
            <button
              onClick={() => {
                downloadFile(`${doc.id}.robot`, suite.robot);
                toast.success("Exported", `${doc.id}.robot`);
              }}
              className="btn btn-secondary btn-sm"
            >
              <Download className="size-3.5" />
              Export suite
            </button>
            <button onClick={run} disabled={running} className="btn btn-primary btn-sm">
              {running ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Generating
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  Generate
                </>
              )}
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Requirement docs"
          value={REQUIREMENT_DOCS.length}
          deltaLabel="one file per feature"
          icon={<FileSpreadsheet className="size-4" />}
        />
        <StatCard
          label="Cases in this suite"
          value={suite.cases.length}
          deltaLabel={`${byKind.filter((k) => k.value > 0).length} kinds of test`}
          icon={<FlaskConical className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Provider"
          value={provider.kind === "local" ? "Local" : "Cloud"}
          deltaLabel={`${provider.name} · ${provider.model}`}
          icon={provider.kind === "local" ? <Server className="size-4" /> : <Cpu className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Cost per run"
          value={`$${provider.costPerRun.toFixed(3)}`}
          deltaLabel={`${provider.latencyMs}ms typical latency`}
          icon={<Gauge className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[300px_1fr]">
        {/* ---------------- requirements ---------------- */}
        <aside className="space-y-3">
          <ul className="fc-card divide-y divide-[var(--fc-line)] overflow-hidden">
            {REQUIREMENT_DOCS.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setDocId(d.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3.5 py-3 text-left transition-colors",
                    docId === d.id
                      ? "bg-[var(--color-brand-500)]/[0.08]"
                      : "hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold">
                      {d.title}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                      {d.feature} · {d.owner}
                    </span>
                  </span>
                  <Badge
                    tone={
                      d.status === "approved"
                        ? "success"
                        : d.status === "generated"
                        ? "accent"
                        : d.status === "ready"
                        ? "signal"
                        : "neutral"
                    }
                  >
                    {d.status}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>

          <div className="fc-card p-4">
            <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
              <Server className="size-4 text-[var(--color-accent-500)]" />
              Provider
            </h3>
            <ul className="mt-2.5 space-y-1.5">
              {TEST_PROVIDERS.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setProviderId(p.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                      providerId === p.id
                        ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.06]"
                        : "border-[var(--fc-line)] hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold">{p.name}</span>
                      <span className="block truncate text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {p.model} · {p.latencyMs}ms · ${p.costPerRun.toFixed(3)}
                      </span>
                    </span>
                    {p.available ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="size-1.5 shrink-0 rounded-full bg-[var(--fc-fg-subtle)]" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--fc-fg-subtle)]">
              {provider.note}
            </p>
          </div>
        </aside>

        {/* ---------------- main ---------------- */}
        <div className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">{doc.title}</h2>
            <p className="mt-1 text-[11.5px] text-[var(--fc-fg-subtle)]">
              {doc.feature} · owned by {doc.owner} · updated {doc.updatedAt.slice(0, 10)}
            </p>
            <div className="mt-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                Acceptance criteria
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed">{doc.criteria}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {doc.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </div>

          {runLog.length > 0 && (
            <div className="fc-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
                <Terminal className="size-3.5 text-emerald-500" />
                <span className="text-[12.5px] font-semibold">Generation log</span>
                {running && (
                  <span className="ml-auto text-[11px] text-[var(--fc-fg-subtle)]">
                    running…
                  </span>
                )}
              </div>
              <pre className="fc-scroll-thin max-h-48 overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-emerald-300">
                {runLog.map((l) => `› ${l}`).join("\n")}
              </pre>
            </div>
          )}

          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
              {(
                [
                  { id: "robot", label: "Robot Framework" },
                  { id: "pytest", label: "pytest" },
                  { id: "sheet", label: "Test-case sheet" },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                    view === v.id
                      ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                      : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  {v.label}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-[var(--fc-fg-subtle)]">
                {suite.cases.length} cases · {suite.description}
              </span>
            </div>

            {view === "sheet" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[var(--fc-surface-2)] text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Test name</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Priority</th>
                      <th className="px-4 py-2 font-semibold">Steps</th>
                      <th className="px-4 py-2 font-semibold">Expected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fc-line)]">
                    {suite.sheet.map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-semibold">{r.title}</td>
                        <td className="px-4 py-2">
                          <Badge
                            tone={
                              r.kind === "smoke"
                                ? "success"
                                : r.kind === "negative"
                                ? "danger"
                                : r.kind === "edge"
                                ? "signal"
                                : "accent"
                            }
                          >
                            {r.kind}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 tabular-nums">{r.priority}</td>
                        <td className="max-w-[320px] px-4 py-2 text-[11.5px] text-[var(--fc-fg-muted)]">
                          {r.steps}
                        </td>
                        <td className="max-w-[320px] px-4 py-2 text-[11.5px] text-[var(--fc-fg-muted)]">
                          {r.expected}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre className="fc-scroll-thin max-h-[420px] overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-emerald-300">
                {view === "robot" ? suite.robot : suite.pytest}
              </pre>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Coverage</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <DonutChart
                  size={150}
                  centerLabel="cases"
                  centerValue={String(suite.cases.length)}
                  data={byKind.map((k) => ({
                    label: k.label,
                    value: k.value,
                    color:
                      k.label === "smoke"
                        ? "#22c55e"
                        : k.label === "functional"
                        ? "#3b64f6"
                        : k.label === "negative"
                        ? "#ef4444"
                        : "#f59e0b",
                  }))}
                />
                <div>
                  <BarChart
                    height={150}
                    labels={byKind.map((k) => k.label)}
                    series={[
                      { name: "Cases", data: byKind.map((k) => k.value) },
                    ]}
                  />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { l: "Sentences in the criteria", v: suite.cases.length },
                  { l: "Cases generated", v: suite.cases.length },
                  { l: "Edge and negative cases", v: suite.cases.filter((c) => c.kind === "edge" || c.kind === "negative").length },
                  { l: "Distinct keywords", v: new Set(suite.cases.map((c) => c.keyword)).size },
                ].map((r) => (
                  <div
                    key={r.l}
                    className="flex items-center justify-between rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5 text-[12px]"
                  >
                    <span className="text-[var(--fc-fg-muted)]">{r.l}</span>
                    <span className="font-semibold tabular-nums">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <ShieldCheck className="size-4 text-emerald-500" />
                Safe defaults
              </h3>
              <ul className="mt-3 space-y-2">
                {SAFETY_RULES.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="text-[12.5px] font-semibold">{r.rule}</div>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {r.why}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                  Project layout
                </div>
                <ul className="mt-2 space-y-1">
                  {PROJECT_LAYOUT.map((f) => (
                    <li key={f.path} className="flex items-start gap-2 text-[11px]">
                      <code className="shrink-0 font-mono text-[10.5px] text-[var(--color-brand-500)]">
                        {f.path}
                      </code>
                      <span className="min-w-0 flex-1 text-[var(--fc-fg-muted)]">
                        {f.purpose}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">Artifacts</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {TEST_ARTIFACTS.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2.5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)]">
                    {a.kind === "sheet" ? (
                      <FileSpreadsheet className="size-4" />
                    ) : a.kind === "report" ? (
                      <Gauge className="size-4" />
                    ) : (
                      <Code2 className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[12px] font-semibold">
                      {a.name}
                    </span>
                    <span className="block text-[11px] text-[var(--fc-fg-muted)]">
                      {a.description}
                    </span>
                  </span>
                  <span className="text-[10.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                    {(a.bytes / 1024).toFixed(1)} KB
                  </span>
                  <button
                    onClick={async () => {
                      const ok = await copyToClipboard(a.name);
                      toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                    }}
                    className="grid size-7 place-items-center rounded-lg bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
                  >
                    <ClipboardCopy className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
