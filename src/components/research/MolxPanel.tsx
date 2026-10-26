"use client";

import * as React from "react";
import {
  Box,
  Check,
  ClipboardCopy,
  Cloud,
  Cpu,
  Gauge,
  HardDrive,
  Layers,
  Radar,
  Search,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Badge, Progress } from "@/components/ui/primitives";
import {
  MOLX_CHECKLIST,
  MOLX_COMPARISON,
  MOLX_DEPLOY,
  MOLX_ENDPOINTS,
  MOLX_ENGINES,
  MOLX_ROADMAP,
  MOLX_VARS,
} from "@/lib/data/molx";
import { cn, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/store/useUI";

export function MolxPanel() {
  const toast = useToast();
  const [endpoint, setEndpoint] = React.useState(MOLX_ENDPOINTS[2].path);
  const [query, setQuery] = React.useState("golang context cancel");
  const [ran, setRan] = React.useState(false);

  const active = MOLX_ENDPOINTS.find((e) => e.path === endpoint)!;

  return (
    <div className="space-y-4">
      <div className="fc-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
            <Server className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold">molx — self-hosted crawl API</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--fc-fg-muted)]">
              A single Go binary that turns any page into markdown, HTML, text or
              links — plus native search, background batches and LLM enrichment. No
              vendor, no credits, no page ever leaves your own infrastructure.
            </p>
          </div>
          <Badge tone="success">MIT licensed</Badge>
          <Badge tone="accent">Go 1.23+</Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Idle memory", value: "~3 MB", icon: Gauge, tone: "text-emerald-500" },
            { label: "Working set", value: "~7 MB", icon: HardDrive, tone: "text-[var(--color-brand-500)]" },
            { label: "Renderer", value: "Obscura", icon: Box, tone: "text-[var(--color-violet-500)]" },
            { label: "Search engines", value: "3 native", icon: Radar, tone: "text-[var(--color-signal-500)]" },
          ].map((m) => (
            <div
              key={m.label}
              className="flex items-center gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2.5"
            >
              <m.icon className={cn("size-4 shrink-0", m.tone)} />
              <span className="min-w-0">
                <span className="block text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                  {m.label}
                </span>
                <span className="block truncate text-[13px] font-semibold">{m.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        {/* ------------- endpoints ------------- */}
        <div className="fc-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
            <Layers className="size-3.5 text-[var(--color-brand-500)]" />
            <span className="text-[12.5px] font-semibold">API endpoints</span>
            <span className="ml-auto text-[11px] text-[var(--fc-fg-subtle)]">
              every scrape and search call needs the bearer token
            </span>
          </div>
          <ul className="divide-y divide-[var(--fc-line)]">
            {MOLX_ENDPOINTS.map((e) => (
              <li key={e.path}>
                <button
                  onClick={() => setEndpoint(e.path)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors",
                    endpoint === e.path
                      ? "bg-[var(--color-brand-500)]/[0.07]"
                      : "hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <span
                    className={cn(
                      "w-12 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[9.5px] font-bold",
                      e.method === "GET"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)]",
                    )}
                  >
                    {e.method}
                  </span>
                  <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] font-semibold">
                    {e.path}
                  </code>
                  {!e.auth && <Badge tone="success">no auth</Badge>}
                  {e.auth && <Badge>token</Badge>}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--fc-line)] p-4">
            <p className="text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              {active.purpose}
            </p>
            {active.body && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                    Request
                  </span>
                  <button
                    onClick={async () => {
                      const ok = await copyToClipboard(
                        `curl -X POST http://localhost:8080${active.path} \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${active.body}'`,
                      );
                      toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                    }}
                    className="grid size-6 place-items-center rounded-md bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
                  >
                    <ClipboardCopy className="size-3" />
                  </button>
                </div>
                <pre className="fc-scroll-thin max-h-56 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[#0d1024] p-3 font-mono text-[10.5px] leading-relaxed text-emerald-300">
                  {active.body}
                </pre>
              </div>
            )}
            {active.response && (
              <div className="mt-3">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                  Response
                </span>
                <pre className="fc-scroll-thin mt-1 max-h-56 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[#0d1024] p-3 font-mono text-[10.5px] leading-relaxed text-sky-300">
                  {active.response}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* ------------- search playground ------------- */}
        <div className="space-y-4">
          <div className="fc-card p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold">
              <Search className="size-4 text-[var(--color-accent-500)]" />
              Native search
            </h3>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              No SearXNG instance to run — the engines are queried in-process.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="field h-9 flex-1 text-[12.5px]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setRan(true);
                }}
              />
              <button onClick={() => setRan(true)} className="btn btn-primary btn-sm">
                Search
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {MOLX_ENGINES.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[12.5px] font-semibold">{e.label}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-[var(--fc-fg-muted)]">{e.note}</p>
                </div>
              ))}
            </div>

            {ran && (
              <ul className="mt-3 space-y-1.5">
                {[
                  "context.Context as the cancellation backbone",
                  "When to use context.WithCancel",
                  "Propagation patterns across HTTP handlers",
                ].map((t, i) => (
                  <li
                    key={t}
                    className="flex items-center gap-2.5 rounded-lg border border-[var(--fc-line)] px-3 py-2"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)]/12 text-[9.5px] font-bold text-[var(--color-brand-500)]">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{t}</span>
                    <Badge tone="accent">scraped</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="fc-card p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold">
              <ShieldCheck className="size-4 text-emerald-500" />
              Operational checklist
            </h3>
            <ul className="mt-3 space-y-2">
              {MOLX_CHECKLIST.map((c) => (
                <li key={c} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="fc-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
          <Terminal className="size-4 text-[var(--color-brand-500)]" />
          <h2 className="text-[15px] font-semibold">Deploy it</h2>
        </div>
        <div className="grid gap-3 p-5 lg:grid-cols-2">
          {MOLX_DEPLOY.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-semibold">{d.label}</span>
                <button
                  onClick={async () => {
                    const ok = await copyToClipboard(d.command);
                    toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                  }}
                  className="ml-auto grid size-6 place-items-center rounded-md bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
                >
                  <ClipboardCopy className="size-3" />
                </button>
              </div>
              <pre className="fc-scroll-thin mt-2 overflow-auto rounded-lg bg-[#0d1024] p-3 font-mono text-[10.5px] leading-relaxed text-emerald-300">
                {d.command}
              </pre>
              <p className="mt-2 text-[11.5px] text-[var(--fc-fg-muted)]">{d.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="fc-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
            <Cpu className="size-4 text-[var(--color-violet-500)]" />
            <h2 className="text-[15px] font-semibold">Environment</h2>
            <span className="ml-auto text-[11px] text-[var(--fc-fg-subtle)]">
              {MOLX_VARS.length} variables
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[var(--fc-surface-2)] text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                <tr>
                  <th className="px-4 py-2 font-semibold">Variable</th>
                  <th className="px-4 py-2 font-semibold">Default</th>
                  <th className="px-4 py-2 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--fc-line)]">
                {MOLX_VARS.map((v) => (
                  <tr key={v.name}>
                    <td className="px-4 py-2 font-mono text-[11px] font-semibold">{v.name}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-[var(--fc-fg-muted)]">
                      {v.default}
                    </td>
                    <td className="px-4 py-2 text-[11.5px] text-[var(--fc-fg-muted)]">
                      {v.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="fc-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
              <Cloud className="size-4 text-[var(--color-accent-500)]" />
              <h2 className="text-[15px] font-semibold">molx vs Firecrawl</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11.5px]">
                <thead className="bg-[var(--fc-surface-2)] text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Area</th>
                    <th className="px-4 py-2 font-semibold">molx</th>
                    <th className="px-4 py-2 font-semibold">Firecrawl</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fc-line)]">
                  {MOLX_COMPARISON.map((r) => (
                    <tr key={r.row}>
                      <td className="px-4 py-2 font-semibold">{r.row}</td>
                      <td className="px-4 py-2 text-emerald-500">{r.molx}</td>
                      <td className="px-4 py-2 text-[var(--fc-fg-subtle)]">{r.firecrawl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">On the roadmap</h3>
            <ul className="mt-3 space-y-2">
              {MOLX_ROADMAP.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                >
                  <div className="text-[12.5px] font-semibold">{r.title}</div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {r.detail}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Progress value={100} tone="accent" />
              <p className="mt-1.5 text-[11px] text-[var(--fc-fg-subtle)]">
                The core contract is stable — every endpoint above is implemented and
                versioned.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
