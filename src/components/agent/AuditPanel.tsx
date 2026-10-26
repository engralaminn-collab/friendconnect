"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  History,
  Search,
  Trash2,
} from "lucide-react";
import { useAgentStore } from "@/lib/agent/agentStore";
import type { AuditKind } from "@/lib/agent/types";
import { downloadFile, cn } from "@/lib/utils";
import { useToast } from "@/store/useUI";
import { CopyButton, EmptyHint, SectionTitle, timeAgo } from "./widgets";

const KINDS: Array<AuditKind | "all"> = [
  "all",
  "tool",
  "approval",
  "run",
  "provider",
  "automation",
  "remote",
];

const STATUS_TONE: Record<string, string> = {
  completed: "text-emerald-500",
  "step-budget": "text-amber-500",
  "repeat-guard": "text-amber-500",
  "time-budget": "text-amber-500",
  rejected: "text-[var(--fc-fg-subtle)]",
  error: "text-[var(--color-signal-500)]",
};

export function AuditPanel() {
  const audit = useAgentStore((state) => state.auditLog);
  const runs = useAgentStore((state) => state.runs);
  const clearAudit = useAgentStore((state) => state.clearAudit);
  const clearRuns = useAgentStore((state) => state.clearRuns);
  const toast = useToast();

  const [kind, setKind] = React.useState<AuditKind | "all">("all");
  const [query, setQuery] = React.useState("");
  const [openRun, setOpenRun] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return audit.filter((entry) => {
      if (kind !== "all" && entry.kind !== kind) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) || entry.detail.toLowerCase().includes(q)
      );
    });
  }, [audit, kind, query]);

  const exportJson = () => {
    downloadFile(
      `bill-agent-audit-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ exportedAt: new Date().toISOString(), audit, runs }, null, 2),
    );
    toast.success("Audit exported", `${audit.length} entries, ${runs.length} runs`);
  };

  const exportCsv = () => {
    const header = "at,kind,action,risk,ok,detail";
    const rows = filtered.map((entry) =>
      [
        entry.at,
        entry.kind,
        entry.action,
        entry.risk ?? "",
        entry.ok === undefined ? "" : String(entry.ok),
        `"${entry.detail.replace(/"/g, '""')}"`,
      ].join(","),
    );
    downloadFile(
      `bill-agent-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows].join("\n"),
      "text/csv",
    );
    toast.success("CSV exported", `${filtered.length} rows`);
  };

  return (
    <div className="space-y-4">
      <div className="fc-card p-4 sm:p-5">
        <SectionTitle
          title="Run history"
          description="Each run records its provider, every tool call, the arguments used and why it stopped. Nothing is rewritten after the fact."
          actions={
            <>
              <button type="button" onClick={exportJson} className="btn btn-sm">
                <Download className="size-3.5" /> Export JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  clearRuns();
                  toast.info("Run history cleared");
                }}
                className="btn btn-sm btn-ghost"
              >
                <Trash2 className="size-3.5" /> Clear runs
              </button>
            </>
          }
        />
        {runs.length === 0 ? (
          <EmptyHint>No runs yet. Ask the console for something, or press Run on a tool.</EmptyHint>
        ) : (
          <ul className="space-y-2">
            {runs.map((run) => {
              const open = openRun === run.id;
              return (
                <li key={run.id} className="rounded-xl border border-[var(--fc-line)]">
                  <button
                    type="button"
                    onClick={() => setOpenRun(open ? null : run.id)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--fc-surface-2)]"
                  >
                    {open ? (
                      <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-[var(--fc-fg-subtle)]" />
                    ) : (
                      <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-[var(--fc-fg-subtle)]" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[12.5px] font-semibold">{run.task}</span>
                        <span className={cn("chip", STATUS_TONE[run.status])}>{run.status}</span>
                        <span className="chip">
                          {run.offline ? "offline" : `${run.providerId}/${run.model}`}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--fc-fg-subtle)]">
                        {timeAgo(run.startedAt)} · {run.steps.length} step(s) ·{" "}
                        {Math.max(
                          0,
                          Math.round(
                            (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000,
                          ),
                        )}
                        s
                      </span>
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-[var(--fc-line)] px-3 py-2.5">
                      <p className="text-[12.5px]">{run.answer}</p>
                      {run.error && (
                        <p className="mt-1 text-[11.5px] text-[var(--color-signal-500)]">{run.error}</p>
                      )}
                      {run.steps.length > 0 && (
                        <ol className="mt-2 space-y-1.5">
                          {run.steps.map((step) => (
                            <li
                              key={`${run.id}-${step.index}`}
                              className="rounded-lg bg-[var(--fc-surface-2)] px-2 py-1.5 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5">
                                {step.ok ? (
                                  <CheckCircle2 className="size-3 text-emerald-500" />
                                ) : (
                                  <AlertTriangle className="size-3 text-[var(--color-signal-500)]" />
                                )}
                                <code className="font-mono font-semibold">{step.tool}</code>
                                <span className="text-[var(--fc-fg-subtle)]">
                                  {step.approved ? "" : "(rejected) "}
                                  {step.ms ? `${step.ms}ms` : ""}
                                </span>
                              </div>
                              <p className="text-[var(--fc-fg-muted)]">{step.summary}</p>
                              <pre className="mt-0.5 truncate font-mono text-[10px] text-[var(--fc-fg-subtle)]">
                                {JSON.stringify(step.args)}
                              </pre>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="fc-card p-4 sm:p-5">
        <SectionTitle
          title="Audit trail"
          description="Append-only inside the browser. 500 most recent entries; export before clearing."
          actions={
            <>
              <CopyButton value={JSON.stringify(audit.slice(0, 50), null, 2)} label="Copy 50" />
              <button type="button" onClick={exportCsv} className="btn btn-sm">
                <Download className="size-3.5" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAudit();
                  toast.info("Audit trail cleared");
                }}
                className="btn btn-sm btn-ghost"
              >
                <Trash2 className="size-3.5" /> Clear
              </button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by tool, argument or detail"
                className="fc-input pl-8"
                aria-label="Filter audit"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  className={cn("chip capitalize", kind === option && "chip-brand")}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </SectionTitle>

        {filtered.length === 0 ? (
          <EmptyHint>
            Nothing recorded yet. Every tool call, approval, provider test and run lands here.
          </EmptyHint>
        ) : (
          <div className="fc-scroll-thin max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-[11.5px]">
              <thead className="sticky top-0 bg-[var(--fc-surface)]">
                <tr className="text-[10px] uppercase tracking-[0.08em] text-[var(--fc-fg-subtle)]">
                  <th className="px-2 py-1.5">When</th>
                  <th className="px-2 py-1.5">Kind</th>
                  <th className="px-2 py-1.5">Action</th>
                  <th className="px-2 py-1.5">Detail</th>
                  <th className="px-2 py-1.5">OK</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id} className="border-t border-[var(--fc-line)] align-top">
                    <td className="whitespace-nowrap px-2 py-1.5 text-[var(--fc-fg-subtle)]">
                      {timeAgo(entry.at)}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="chip">{entry.kind}</span>
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[10.5px]">{entry.action}</td>
                    <td className="max-w-[420px] px-2 py-1.5 text-[var(--fc-fg-muted)]">
                      {entry.detail}
                    </td>
                    <td className="px-2 py-1.5">
                      {entry.ok === undefined ? (
                        "—"
                      ) : entry.ok ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="size-3.5 text-[var(--color-signal-500)]" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="fc-card flex items-start gap-2 p-4 text-[11.5px] text-[var(--fc-fg-muted)]">
        <History className="mt-0.5 size-3.5 shrink-0" />
        <p>
          The audit trail is local to this browser profile, which is the honest boundary: there is no
          server-side log of your workspace edits. Use{" "}
          <strong>Export JSON</strong> before clearing, and ship those files to your own log store if
          you need retention.
        </p>
      </div>
    </div>
  );
}
