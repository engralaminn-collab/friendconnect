"use client";

import * as React from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Plus,
  Repeat,
  Trash2,
  XCircle,
} from "lucide-react";
import { TOOLS, getTool } from "@/lib/agent/registry";
import { useAgentStore } from "@/lib/agent/agentStore";
import type { ToolResult } from "@/lib/agent/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/store/useUI";
import { EmptyHint, SectionTitle, timeAgo } from "./widgets";

const TRIGGERS: Array<{ id: "manual" | "daily" | "weekly" | "on-open"; label: string; hint: string }> = [
  { id: "manual", label: "Manual", hint: "Only when you press Run." },
  { id: "daily", label: "Daily", hint: "Runs once a day when the workspace opens." },
  { id: "weekly", label: "Weekly", hint: "Runs once a week when the workspace opens." },
  { id: "on-open", label: "On open", hint: "Runs every time the workspace opens." },
];

const PRESETS: Array<{ name: string; description: string; tool: string; args: Record<string, unknown> }> = [
  {
    name: "Morning snapshot",
    description: "Read the workspace and record what needs attention today.",
    tool: "workspace_snapshot",
    args: {},
  },
  {
    name: "Weekly forecast note",
    description: "Write the weighted pipeline into a note every week.",
    tool: "create_note",
    args: { title: "Weekly pipeline forecast", content: "Auto-written by the weekly forecast automation.", tags: ["forecast", "automation"] },
  },
  {
    name: "Follow-up task from open deals",
    description: "Add a follow-up task for the team.",
    tool: "create_task",
    args: { title: "Follow up on open proposals", priority: "high", module: "CRM" },
  },
];

export function AutomationsPanel({
  runTool,
}: {
  runTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
}) {
  const automations = useAgentStore((state) => state.automations);
  const addAutomation = useAgentStore((state) => state.addAutomation);
  const updateAutomation = useAgentStore((state) => state.updateAutomation);
  const removeAutomation = useAgentStore((state) => state.removeAutomation);
  const audit = useAgentStore((state) => state.audit);
  const toast = useToast();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tool, setTool] = React.useState("workspace_snapshot");
  const [argsText, setArgsText] = React.useState("{}");
  const [trigger, setTrigger] = React.useState<"manual" | "daily" | "weekly" | "on-open">("manual");
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState<string | null>(null);

  const selected = getTool(tool);

  const create = () => {
    setError(null);
    if (!name.trim()) {
      setError("Give the automation a name.");
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      const value = JSON.parse(argsText || "{}") as unknown;
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("Arguments must be a JSON object.");
      }
      parsed = value as Record<string, unknown>;
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Invalid JSON.");
      return;
    }
    const created = addAutomation({
      name: name.trim(),
      description: description.trim() || `Calls ${tool}.`,
      tool,
      args: parsed,
      trigger,
      enabled: true,
    });
    audit({ kind: "automation", action: "create", detail: `${created.name} → ${created.tool}`, ok: true });
    toast.success("Automation created", created.name);
    setName("");
    setDescription("");
    setArgsText("{}");
  };

  const run = async (id: string) => {
    const automation = automations.find((item) => item.id === id);
    if (!automation) return;
    setRunning(id);
    const result = await runTool(automation.tool, automation.args);
    setRunning(null);
    updateAutomation(id, {
      lastRunAt: new Date().toISOString(),
      lastResult: result.summary,
      runCount: automation.runCount + 1,
    });
    audit({
      kind: "automation",
      action: "run",
      detail: `${automation.name}: ${result.summary}`,
      ok: result.ok,
    });
    if (result.ok) toast.success(automation.name, result.summary);
    else toast.error(automation.name, result.summary);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="fc-card p-4 sm:p-5">
          <SectionTitle
            title="Saved runs"
            description="An automation is a tool call with a name and a rhythm. It executes against live workspace state through the same validated registry the console uses."
          />
          {automations.length === 0 ? (
            <EmptyHint>
              Nothing saved yet. Add one from a preset on the right, or build your own below.
            </EmptyHint>
          ) : (
            <ul className="space-y-2.5">
              {automations.map((automation) => (
                <li key={automation.id} className="rounded-xl border border-[var(--fc-line)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold">{automation.name}</span>
                        <span className="chip">
                          {TRIGGERS.find((item) => item.id === automation.trigger)?.label}
                        </span>
                        <code className="font-mono text-[10.5px] text-[var(--fc-fg-subtle)]">
                          {automation.tool}
                        </code>
                      </div>
                      <p className="mt-1 text-[11.5px] text-[var(--fc-fg-muted)]">
                        {automation.description}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-[var(--fc-fg-subtle)]">
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="size-3" /> {automation.runCount} run(s)
                        </span>
                        {automation.lastRunAt && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" /> {timeAgo(automation.lastRunAt)}
                          </span>
                        )}
                        {automation.lastResult && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              automation.lastResult.toLowerCase().includes("invalid")
                                ? "text-[var(--color-signal-500)]"
                                : "text-emerald-500",
                            )}
                          >
                            <CheckCircle2 className="size-3" /> {automation.lastResult.slice(0, 90)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <label className="flex items-center gap-1 text-[11px] text-[var(--fc-fg-subtle)]">
                        <input
                          type="checkbox"
                          checked={automation.enabled}
                          onChange={(event) =>
                            updateAutomation(automation.id, { enabled: event.target.checked })
                          }
                          className="size-3.5 accent-[var(--color-brand-500)]"
                        />
                        on
                      </label>
                      <button
                        type="button"
                        onClick={() => void run(automation.id)}
                        disabled={running === automation.id}
                        className="btn btn-sm"
                      >
                        {running === automation.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Play className="size-3.5" />
                        )}
                        Run
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeAutomation(automation.id);
                          audit({ kind: "automation", action: "delete", detail: automation.name, ok: true });
                          toast.info("Automation deleted", automation.name);
                        }}
                        className="btn btn-sm btn-icon"
                        aria-label={`Delete ${automation.name}`}
                      >
                        <Trash2 className="size-3.5 text-[var(--color-signal-500)]" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="fc-card p-4 sm:p-5">
          <SectionTitle title="Build one" description="Pick a tool, give it arguments, choose a rhythm." />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="auto-name">Name</label>
              <input
                id="auto-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Morning snapshot"
              />
            </div>
            <div className="field">
              <label htmlFor="auto-trigger">Trigger</label>
              <select
                id="auto-trigger"
                value={trigger}
                onChange={(event) => setTrigger(event.target.value as typeof trigger)}
              >
                {TRIGGERS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} — {item.hint}
                  </option>
                ))}
              </select>
            </div>
            <div className="field sm:col-span-2">
              <label htmlFor="auto-desc">Description</label>
              <input
                id="auto-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What this run is for"
              />
            </div>
            <div className="field sm:col-span-2">
              <label htmlFor="auto-tool">Tool</label>
              <select
                id="auto-tool"
                value={tool}
                onChange={(event) => {
                  setTool(event.target.value);
                  const next = getTool(event.target.value);
                  if (next) {
                    const example = next.examples?.[0]?.args ?? {};
                    setArgsText(JSON.stringify(example, null, 2));
                  }
                }}
              >
                {TOOLS.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.title} · {item.name} ({item.risk})
                  </option>
                ))}
              </select>
              {selected && <span className="hint">{selected.description}</span>}
            </div>
            <div className="field sm:col-span-2">
              <label htmlFor="auto-args">Arguments (JSON)</label>
              <textarea
                id="auto-args"
                value={argsText}
                onChange={(event) => setArgsText(event.target.value)}
                rows={5}
                spellCheck={false}
                className="font-mono text-[11.5px]"
              />
              {selected && (
                <span className="hint">
                  Required: {selected.schema.required.join(", ") || "none"}
                </span>
              )}
            </div>
          </div>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--color-signal-500)]">
              <XCircle className="size-3.5" /> {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={create} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" /> Create automation
            </button>
            <button
              type="button"
              onClick={() => {
                void runTool(tool, JSON.parse(argsText || "{}") as Record<string, unknown>).then(
                  (result) => {
                    if (result.ok) toast.success("Test run", result.summary);
                    else toast.error("Test run failed", result.summary);
                  },
                );
              }}
              className="btn btn-sm"
            >
              <Play className="size-3.5" /> Test the tool now
            </button>
          </div>
        </div>
      </div>

      <aside className="space-y-3">
        <div className="fc-card p-4">
          <h3 className="font-display text-[13px] font-bold">Presets</h3>
          <p className="mt-1 text-[11.5px] text-[var(--fc-fg-muted)]">
            One click each. They call real tools; nothing is simulated.
          </p>
          <div className="mt-2.5 space-y-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setName(preset.name);
                  setDescription(preset.description);
                  setTool(preset.tool);
                  setArgsText(JSON.stringify(preset.args, null, 2));
                  toast.info("Preset loaded", "Press Create automation to save it.");
                }}
                className="w-full rounded-lg border border-[var(--fc-line)] p-2.5 text-left transition-colors hover:border-[var(--color-brand-400)] hover:bg-[var(--fc-surface-2)]"
              >
                <span className="block text-[12.5px] font-semibold">{preset.name}</span>
                <span className="mt-0.5 block text-[11px] text-[var(--fc-fg-subtle)]">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="fc-card p-4">
          <h3 className="flex items-center gap-1.5 font-display text-[13px] font-bold">
            <CalendarClock className="size-3.5" /> How schedules fire
          </h3>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
            There is no server-side cron to trust. The workspace checks due automations when it
            opens: <strong>daily</strong> fires if the last run was before midnight,{" "}
            <strong>weekly</strong> if it was more than seven days ago, and{" "}
            <strong>on-open</strong> fires every load. That keeps the schedule honest without a
            background worker.
          </p>
        </div>
      </aside>
    </div>
  );
}
