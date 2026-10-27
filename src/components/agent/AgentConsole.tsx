"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleSlash,
  Eraser,
  Gauge,
  Loader2,
  Send,
  ShieldOff,
  Sparkles,
  Square,
  Timer,
  User,
  Wrench,
} from "lucide-react";
import { OFFLINE_EXAMPLES } from "@/lib/agent/offline";
import { PROVIDERS } from "@/lib/agent/providers";
import { useAgentStore } from "@/lib/agent/agentStore";
import { cn } from "@/lib/utils";
import { useToast } from "@/store/useUI";
import { timeAgo } from "./widgets";
import type { AgentRunner } from "./useAgentRun";

const AUTONOMY: Array<{ id: "ask" | "auto-safe" | "auto-all"; label: string; hint: string }> = [
  { id: "ask", label: "Ask every time", hint: "Any write needs your click." },
  { id: "auto-safe", label: "Auto-safe", hint: "Reads and writes run; deletes still ask." },
  { id: "auto-all", label: "Auto-all", hint: "Only destructive tools ask." },
];

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  "step-budget": "Stopped at the step budget",
  "repeat-guard": "Stopped on a repeated call",
  "time-budget": "Stopped at the time budget",
  rejected: "Rejected by you",
  error: "Failed",
};

export function AgentConsole({
  runner,
  onOpenProviders,
}: {
  runner: AgentRunner;
  onOpenProviders: () => void;
}) {
  const messages = useAgentStore((state) => state.messages);
  const settings = useAgentStore((state) => state.settings);
  const activeProviderId = useAgentStore((state) => state.activeProviderId);
  const providers = useAgentStore((state) => state.providers);
  const setSettings = useAgentStore((state) => state.setSettings);
  const clearMessages = useAgentStore((state) => state.clearMessages);
  const toast = useToast();

  const [draft, setDraft] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  const provider = PROVIDERS.find((item) => item.id === activeProviderId);
  const model =
    activeProviderId === "offline" ? "offline grammar" : providers[activeProviderId]?.model || "no model";

  React.useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, runner.busy, runner.liveSteps]);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const task = draft.trim();
    if (!task || runner.busy) return;
    setDraft("");
    await runner.runTask(task);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="fc-card flex min-h-[560px] flex-col overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-[var(--fc-line)] px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-accent-500))] text-white">
            <Bot className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[14px] font-bold">Bill Agent</h2>
              <span
                className={cn(
                  "chip",
                  activeProviderId === "offline"
                    ? "border-[var(--fc-line-strong)]"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                )}
              >
                {provider?.name ?? "Offline"} · {model}
              </span>
            </div>
            <p className="text-[11.5px] text-[var(--fc-fg-subtle)]">
              {AUTONOMY.find((option) => option.id === settings.autonomy)?.hint} ·{" "}
              {settings.maxSteps} step budget{settings.dryRun ? " · dry run" : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={clearMessages}
              className="btn btn-sm btn-ghost"
              title="Clear the conversation"
            >
              <Eraser className="size-3.5" /> Clear
            </button>
            <button type="button" onClick={onOpenProviders} className="btn btn-sm">
              <Sparkles className="size-3.5" /> Providers
            </button>
          </div>
        </header>

        <div ref={listRef} className="fc-scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--fc-line-strong)] bg-[var(--fc-surface-2)] p-4">
              <p className="text-[13px] font-semibold">Nothing yet. Try one of these:</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {OFFLINE_EXAMPLES.slice(0, 8).map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setDraft(example)}
                    className="chip text-left hover:border-[var(--color-brand-400)] hover:text-[var(--fc-fg)]"
                  >
                    {example}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--fc-fg-subtle)]">
                Click a suggestion to load it into the composer. Every tool call is validated,
                audited and reversible-by-inspection — deletes always ask first.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-2.5", message.role === "user" ? "justify-end" : "justify-start")}
            >
              {message.role !== "user" && (
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-500)]/12 text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]">
                  <Bot className="size-3.5" />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed",
                  message.role === "user"
                    ? "bg-[var(--color-brand-500)] text-white"
                    : "border border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                {message.tools && message.tools.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {message.tools.map((tool, index) => (
                      <li
                        key={`${message.id}-${tool.name}-${index}`}
                        className="flex items-start gap-1.5 rounded-md bg-[var(--fc-surface)] px-2 py-1 text-[11.5px]"
                      >
                        {tool.ok ? (
                          <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                        ) : tool.approved ? (
                          <AlertTriangle className="mt-0.5 size-3 shrink-0 text-[var(--color-signal-500)]" />
                        ) : (
                          <CircleSlash className="mt-0.5 size-3 shrink-0 text-[var(--fc-fg-subtle)]" />
                        )}
                        <span className="min-w-0">
                          <code className="font-mono text-[10.5px] text-[var(--fc-fg-subtle)]">
                            {tool.name}
                          </code>{" "}
                          {tool.summary}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--fc-fg-subtle)]">
                  <span>{timeAgo(message.at)}</span>
                  {message.runStatus && (
                    <span
                      className={cn(
                        message.runStatus === "completed"
                          ? "text-emerald-500"
                          : "text-[var(--color-signal-500)]",
                      )}
                    >
                      {STATUS_LABEL[message.runStatus] ?? message.runStatus}
                    </span>
                  )}
                </div>
              </div>
              {message.role === "user" && (
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)]">
                  <User className="size-3.5" />
                </span>
              )}
            </div>
          ))}

          {runner.busy && (
            <div className="flex items-center gap-2 text-[12px] text-[var(--fc-fg-muted)]">
              <Loader2 className="size-3.5 animate-spin" />
              Working
              {runner.liveSteps.length > 0 && ` · ${runner.liveSteps.length} step(s) done`}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="border-t border-[var(--fc-line)] p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              rows={2}
              placeholder="Tell Bill what to do — e.g. “move Jane Okafor to negotiation”, “status”, “audit https://example.com/pricing”"
              className="fc-input min-h-[52px] flex-1 resize-none"
            />
            {runner.busy ? (
              <button type="button" onClick={runner.requestStop} className="btn btn-danger">
                <Square className="size-3.5" /> Stop
              </button>
            ) : (
              <button type="submit" disabled={!draft.trim()} className="btn btn-primary">
                <Send className="size-3.5" /> Run
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[10.5px] text-[var(--fc-fg-subtle)]">
            Enter sends · Shift+Enter adds a line · every call is validated against the tool schema
            before it touches the workspace.
          </p>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="fc-card p-4">
          <h3 className="font-display text-[13px] font-bold">Run policy</h3>
          <div className="mt-2 space-y-1.5">
            {AUTONOMY.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSettings({ autonomy: option.id });
                  toast.info(`Autonomy: ${option.label}`, option.hint);
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                  settings.autonomy === option.id
                    ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/8"
                    : "border-[var(--fc-line)] hover:bg-[var(--fc-surface-2)]",
                )}
              >
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    settings.autonomy === option.id
                      ? "bg-[var(--color-brand-500)]"
                      : "bg-[var(--fc-line-strong)]",
                  )}
                />
                <span>
                  <span className="block text-[12.5px] font-semibold">{option.label}</span>
                  <span className="block text-[11px] text-[var(--fc-fg-subtle)]">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div className="field">
              <label htmlFor="max-steps">
                <Gauge className="mr-1 inline size-3" /> Step budget — {settings.maxSteps}
              </label>
              <input
                id="max-steps"
                type="range"
                min={1}
                max={30}
                value={settings.maxSteps}
                onChange={(event) => setSettings({ maxSteps: Number(event.target.value) })}
                className="accent-[var(--color-brand-500)]"
              />
            </div>
            <div className="field">
              <label htmlFor="max-ms">
                <Timer className="mr-1 inline size-3" /> Time budget —{" "}
                {Math.round(settings.maxMs / 1000)}s
              </label>
              <input
                id="max-ms"
                type="range"
                min={15}
                max={300}
                step={15}
                value={Math.round(settings.maxMs / 1000)}
                onChange={(event) => setSettings({ maxMs: Number(event.target.value) * 1000 })}
                className="accent-[var(--color-brand-500)]"
              />
            </div>
            <label className="flex items-center justify-between gap-2 rounded-lg border border-[var(--fc-line)] px-2.5 py-2 text-[12px]">
              <span className="flex items-center gap-1.5">
                <ShieldOff className="size-3.5 text-[var(--fc-fg-subtle)]" />
                Dry run — plan without writing
              </span>
              <input
                type="checkbox"
                checked={settings.dryRun}
                onChange={(event) => setSettings({ dryRun: event.target.checked })}
                className="size-4 accent-[var(--color-brand-500)]"
              />
            </label>
          </div>
        </div>

        <div className="fc-card p-4">
          <h3 className="font-display text-[13px] font-bold">This run</h3>
          {runner.liveSteps.length === 0 ? (
            <p className="mt-1.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
              Steps appear here as each tool returns, with the exact arguments used.
            </p>
          ) : (
            <ol className="mt-2 space-y-2">
              {runner.liveSteps.map((step) => (
                <li
                  key={`${step.index}-${step.tool}`}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="truncate font-mono text-[11px] font-semibold">
                      {step.tool}
                    </code>
                    {step.ok ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="size-3.5 shrink-0 text-[var(--color-signal-500)]" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-[var(--fc-fg-muted)]">
                    {step.summary}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-[var(--fc-fg-subtle)]">
                    {JSON.stringify(step.args)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="fc-card p-4">
          <h3 className="flex items-center gap-1.5 font-display text-[13px] font-bold">
            <Wrench className="size-3.5" /> Boundaries
          </h3>
          <ul className="mt-1.5 space-y-1.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
            <li>Unknown tools and bad arguments are rejected before execution.</li>
            <li>Destructive tools always require a human click.</li>
            <li>Every call lands in the audit trail with its arguments and result.</li>
            <li>
              Nothing is proxied through FriendConnect: model traffic goes to the endpoint you
              configured.
            </li>
          </ul>
          <a
            href="/api/agent/manifest"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--color-accent-500)] hover:underline"
          >
            Open the manifest <ArrowUpRight className="size-3" />
          </a>
        </div>
      </aside>
    </div>
  );
}
