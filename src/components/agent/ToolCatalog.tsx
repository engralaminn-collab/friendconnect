"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  Search,
  Wrench,
} from "lucide-react";
import { TOOLS, TOOL_GROUPS } from "@/lib/agent/registry";
import type { SchemaProperty, ToolDefinition, ToolResult } from "@/lib/agent/types";
import { cn } from "@/lib/utils";
import { CopyButton, RiskBadge, SectionTitle } from "./widgets";

type Draft = Record<string, string | boolean>;

function initialDraft(tool: ToolDefinition): Draft {
  const draft: Draft = {};
  for (const [name, property] of Object.entries(tool.schema.properties)) {
    if (property.type === "boolean") draft[name] = Boolean(property.default ?? false);
    else draft[name] = property.default !== undefined ? String(property.default) : "";
  }
  return draft;
}

function toArgs(tool: ToolDefinition, draft: Draft): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const [name, property] of Object.entries(tool.schema.properties)) {
    const raw = draft[name];
    if (property.type === "boolean") {
      args[name] = Boolean(raw);
      continue;
    }
    if (raw === "" || raw === undefined) continue;
    if (property.type === "number") {
      const parsed = Number(raw);
      args[name] = Number.isFinite(parsed) ? parsed : raw;
    } else if (property.type === "array") {
      args[name] = String(raw)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    } else {
      args[name] = raw;
    }
  }
  return args;
}

function FieldInput({
  name,
  property,
  value,
  onChange,
}: {
  name: string;
  property: SchemaProperty;
  value: string | boolean;
  onChange: (next: string | boolean) => void;
}) {
  const id = `arg-${name}`;
  if (property.type === "boolean") {
    return (
      <label className="flex items-center justify-between gap-2 rounded-lg border border-[var(--fc-line)] px-2.5 py-2 text-[12px]">
        <span>
          <code className="font-mono text-[11px]">{name}</code>
          <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">{property.description}</span>
        </span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 accent-[var(--color-brand-500)]"
        />
      </label>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>
        <code className="font-mono text-[11px] normal-case tracking-normal">{name}</code>
        {property.enum ? " · one of" : ""}
      </label>
      {property.enum ? (
        <select
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">—</option>
          {property.enum.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={property.type === "number" ? "number" : "text"}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={property.type === "array" ? "comma, separated, values" : property.description}
          spellCheck={false}
        />
      )}
      <span className="hint">{property.description}</span>
    </div>
  );
}

export function ToolCatalog({
  runTool,
}: {
  runTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
}) {
  const [query, setQuery] = React.useState("");
  const [group, setGroup] = React.useState<string>("all");
  const [openTool, setOpenTool] = React.useState<string | null>(TOOLS[0]?.name ?? null);
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [running, setRunning] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Record<string, ToolResult>>({});

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      if (group !== "all" && tool.group !== group) return false;
      if (!q) return true;
      return (
        tool.name.toLowerCase().includes(q) ||
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q)
      );
    });
  }, [query, group]);

  const run = async (tool: ToolDefinition) => {
    const draft = drafts[tool.name] ?? initialDraft(tool);
    setRunning(tool.name);
    try {
      const result = await runTool(tool.name, toArgs(tool, draft));
      setResults((prev) => ({ ...prev, [tool.name]: result }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [tool.name]: {
          ok: false,
          summary: error instanceof Error ? error.message : String(error),
        },
      }));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="fc-card p-4 sm:p-5">
        <SectionTitle
          title={`${TOOLS.length} tools, one contract`}
          description="Every button in the workspace is one of these. The console can call them, an external client can queue them, and you can run any of them here by hand to see exactly what changes."
          actions={
            <>
              <CopyButton
                label="Copy manifest URL"
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/agent/manifest`}
              />
              <a href="/api/agent/manifest" target="_blank" rel="noreferrer noopener" className="btn btn-sm">
                Open manifest
              </a>
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools, e.g. “deal”, “note”, “audit”"
              className="fc-input pl-8"
              aria-label="Search tools"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGroup("all")}
              className={cn("chip", group === "all" && "chip-brand")}
            >
              all {TOOLS.length}
            </button>
            {TOOL_GROUPS.filter((item) => TOOLS.some((tool) => tool.group === item.id)).map((item) => {
              const count = TOOLS.filter((tool) => tool.group === item.id).length;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGroup(item.id)}
                  className={cn("chip", group === item.id && "chip-brand")}
                >
                  {item.label} {count}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.map((tool) => {
          const open = openTool === tool.name;
          const draft = drafts[tool.name] ?? initialDraft(tool);
          const result = results[tool.name];
          return (
            <article key={tool.name} className="fc-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenTool(open ? null : tool.name)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--fc-surface-2)]"
              >
                {open ? (
                  <ChevronDown className="mt-0.5 size-4 shrink-0 text-[var(--fc-fg-subtle)]" />
                ) : (
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-[var(--fc-fg-subtle)]" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-[12.5px] font-bold">{tool.name}</code>
                    <span className="text-[12px] text-[var(--fc-fg-muted)]">{tool.title}</span>
                    <RiskBadge risk={tool.risk} />
                    {tool.requiresApproval && (
                      <span className="chip border-[var(--color-signal-500)]/35 text-[var(--color-signal-600)] dark:text-[var(--color-signal-400)]">
                        always asks
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {tool.description}
                  </span>
                </span>
              </button>

              {open && (
                <div className="border-t border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--fc-fg-subtle)]">
                        <Wrench className="size-3" /> Arguments
                      </h4>
                      {Object.keys(tool.schema.properties).length === 0 ? (
                        <p className="text-[12px] text-[var(--fc-fg-muted)]">
                          This tool takes no arguments.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {Object.entries(tool.schema.properties).map(([name, property]) => (
                            <FieldInput
                              key={name}
                              name={name}
                              property={property}
                              value={draft[name] ?? ""}
                              onChange={(next) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [tool.name]: {
                                    ...(prev[tool.name] ?? initialDraft(tool)),
                                    [name]: next,
                                  },
                                }))
                              }
                            />
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void run(tool)}
                          disabled={running === tool.name}
                          className={cn("btn btn-sm", tool.risk === "destructive" ? "btn-danger" : "btn-primary")}
                        >
                          {running === tool.name ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Play className="size-3.5" />
                          )}
                          Run {tool.name}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((prev) => ({ ...prev, [tool.name]: initialDraft(tool) }))
                          }
                          className="btn btn-sm btn-ghost"
                        >
                          Reset form
                        </button>
                        {tool.examples?.[0] && (
                          <button
                            type="button"
                            onClick={() =>
                              setDrafts((prev) => ({
                                ...prev,
                                [tool.name]: {
                                  ...initialDraft(tool),
                                  ...Object.fromEntries(
                                    Object.entries(tool.examples![0].args).map(([key, value]) => [
                                      key,
                                      Array.isArray(value) ? value.join(", ") : String(value),
                                    ]),
                                  ),
                                },
                              }))
                            }
                            className="btn btn-sm btn-ghost"
                          >
                            Use example
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--fc-fg-subtle)]">
                          JSON schema
                        </h4>
                        <pre className="fc-scroll-thin max-h-48 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5 font-mono text-[10.5px] leading-relaxed">
{JSON.stringify(tool.schema, null, 2)}
                        </pre>
                        <div className="mt-1.5">
                          <CopyButton
                            label="Copy schema"
                            value={JSON.stringify({ tool: tool.name, args: toArgs(tool, draft) }, null, 2)}
                          />
                        </div>
                      </div>

                      {result && (
                        <div
                          className={cn(
                            "rounded-lg border p-2.5 text-[11.5px]",
                            result.ok
                              ? "border-emerald-500/30 bg-emerald-500/10"
                              : "border-[var(--color-signal-500)]/30 bg-[var(--color-signal-500)]/10",
                          )}
                        >
                          <div className="flex items-center gap-1.5 font-semibold">
                            {result.ok ? (
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="size-3.5 text-[var(--color-signal-500)]" />
                            )}
                            {result.ok ? "Tool ran" : "Tool refused"}
                          </div>
                          <p className="mt-1">{result.summary}</p>
                          {result.data !== undefined && (
                            <pre className="fc-scroll-thin mt-1.5 max-h-40 overflow-auto rounded bg-[var(--fc-surface)] p-2 font-mono text-[10px]">
{JSON.stringify(result.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="fc-card p-6 text-center text-[12.5px] text-[var(--fc-fg-muted)]">
            No tool matches “{query}”. Clear the search to see all {TOOLS.length}.
          </div>
        )}
      </div>
    </div>
  );
}
