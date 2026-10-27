"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DownloadCloud,
  KeyRound,
  Loader2,
  RefreshCw,
  Send,
  Terminal,
  Wifi,
  WifiOff,
} from "lucide-react";
import { TOOLS, getTool } from "@/lib/agent/registry";
import { useAgentStore } from "@/lib/agent/agentStore";
import { cn } from "@/lib/utils";
import { useToast } from "@/store/useUI";
import { CopyButton, EmptyHint, SectionTitle, timeAgo } from "./widgets";
import type { RemoteQueueState } from "./useAgentRun";

function newToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function ControlApiPanel({ remote }: { remote: RemoteQueueState }) {
  const remoteState = useAgentStore((state) => state.remote);
  const setRemote = useAgentStore((state) => state.setRemote);
  const audit = useAgentStore((state) => state.audit);
  const toast = useToast();

  const [tool, setTool] = React.useState("workspace_snapshot");
  const [argsText, setArgsText] = React.useState("{}");
  const [posting, setPosting] = React.useState(false);
  const [response, setResponse] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [commands, setCommands] = React.useState<
    Array<{ id: string; tool: string; createdAt: string; status: string; result?: string }>
  >([]);
  const [loadingQueue, setLoadingQueue] = React.useState(false);

  // Resolved on the client without a state write, so the server-rendered
  // markup and the first client render agree.
  const origin = React.useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://panel.alolabs.net",
  );

  const refresh = async () => {
    setLoadingQueue(true);
    try {
      const res = await fetch("/api/agent/commands?all=1", { cache: "no-store" });
      const payload = (await res.json()) as { commands?: typeof commands; error?: string };
      if (!res.ok) throw new Error(payload.error ?? `HTTP ${res.status}`);
      setCommands(payload.commands ?? []);
    } catch (error) {
      toast.error("Could not read the queue", error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingQueue(false);
    }
  };

  React.useEffect(() => {
    // Deferred one tick so the first paint is not blocked by the queue read.
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, []);

  const enqueue = async () => {
    setPosting(true);
    setResponse(null);
    try {
      const args = JSON.parse(argsText || "{}") as Record<string, unknown>;
      const res = await fetch("/api/agent/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args }),
      });
      const payload = (await res.json()) as { error?: string; command?: { id: string } };
      if (!res.ok) throw new Error(payload.error ?? `HTTP ${res.status}`);
      setResponse({ ok: true, message: `Queued ${payload.command?.id ?? "command"}.` });
      audit({ kind: "remote", action: "enqueue", detail: `${tool} ${argsText}`, ok: true });
      toast.success("Command queued", tool);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setResponse({ ok: false, message });
      toast.error("Queue rejected the command", message);
    } finally {
      setPosting(false);
    }
  };

  const curlEnqueue = [
    `curl -sS -X POST ${origin}/api/agent/commands \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H "Authorization: Bearer $AGENT_TOKEN" \\`,
    `  -d '{"tool":"create_task","args":{"title":"Follow up with Meridian","priority":"high"}}'`,
  ].join("\n");

  const selected = getTool(tool);

  return (
    <div className="space-y-4">
      <div className="fc-card p-4 sm:p-5">
        <SectionTitle
          title="HTTP control surface"
          description="The workspace lives in the browser, so an external caller cannot write to it directly. It posts a tool call to the queue; the open operator tab drains the queue, executes against live state and settles the command with the real result."
          actions={
            <>
              <button type="button" onClick={() => void refresh()} className="btn btn-sm">
                {loadingQueue ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Refresh queue
              </button>
              <CopyButton value={`${origin}/api/agent/manifest`} label="Manifest URL" />
            </>
          }
        />

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--fc-line)] p-3">
            <h4 className="flex items-center gap-1.5 text-[12px] font-bold">
              <Terminal className="size-3.5" /> 1 · Discover
            </h4>
            <pre className="fc-scroll-thin mt-1.5 overflow-auto rounded bg-[var(--fc-surface-2)] p-2 font-mono text-[10px]">
{`GET /api/agent/manifest`}
            </pre>
            <p className="mt-1.5 text-[11px] text-[var(--fc-fg-muted)]">
              {TOOLS.length} tools with JSON schemas. No auth needed; no data returned.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--fc-line)] p-3">
            <h4 className="flex items-center gap-1.5 text-[12px] font-bold">
              <Send className="size-3.5" /> 2 · Enqueue
            </h4>
            <pre className="fc-scroll-thin mt-1.5 overflow-auto rounded bg-[var(--fc-surface-2)] p-2 font-mono text-[10px]">
{`POST /api/agent/commands
{ "tool": "...", "args": {...} }`}
            </pre>
            <p className="mt-1.5 text-[11px] text-[var(--fc-fg-muted)]">
              Returns 202 with the command id. Commands expire after five minutes.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--fc-line)] p-3">
            <h4 className="flex items-center gap-1.5 text-[12px] font-bold">
              <DownloadCloud className="size-3.5" /> 3 · Settle
            </h4>
            <pre className="fc-scroll-thin mt-1.5 overflow-auto rounded bg-[var(--fc-surface-2)] p-2 font-mono text-[10px]">
{`POST /api/agent/commands/settle
{ id, status, result }`}
            </pre>
            <p className="mt-1.5 text-[11px] text-[var(--fc-fg-muted)]">
              The operator tab writes the result back; read it with{" "}
              <code className="font-mono text-[10px]">?all=1</code>.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--fc-fg-subtle)]">
              Working curl example
            </span>
            <CopyButton value={curlEnqueue} label="Copy curl" />
          </div>
          <pre className="fc-scroll-thin overflow-auto font-mono text-[10.5px] leading-relaxed">
{curlEnqueue}
          </pre>
          <p className="mt-1.5 text-[11px] text-[var(--fc-fg-subtle)]">
            If <code className="font-mono">AGENT_TOKEN</code> is set on the server, every request must
            carry the bearer header. Without it the routes are open — fine on localhost, not on a
            public domain.
          </p>
        </div>
      </div>

      <div className="fc-card p-4 sm:p-5">
        <SectionTitle
          title="Drain the queue"
          description="Leave one tab open and Bill becomes remotely operable: cron jobs, n8n workflows, MCP clients or a chat ops bot can drive the workspace. Keep it to a single operator tab — two open tabs would both drain the same queue."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-2 rounded-lg border border-[var(--fc-line)] px-3 py-2.5 text-[12.5px]">
            <span>
              <span className="block font-semibold">Execute queued commands</span>
              <span className="block text-[11px] text-[var(--fc-fg-subtle)]">
                Polls every 4s · {remote.executed} executed this visit
              </span>
            </span>
            <input
              type="checkbox"
              checked={remoteState.enabled}
              onChange={(event) => {
                setRemote({ enabled: event.target.checked });
                audit({
                  kind: "remote",
                  action: "drain",
                  detail: event.target.checked ? "Queue draining enabled." : "Queue draining disabled.",
                  ok: true,
                });
              }}
              className="size-4 accent-[var(--color-brand-500)]"
            />
          </label>

          <div className="field">
            <label htmlFor="remote-token">
              <KeyRound className="mr-1 inline size-3" /> Local bearer token
            </label>
            <div className="flex gap-1.5">
              <input
                id="remote-token"
                value={remoteState.token}
                onChange={(event) => setRemote({ token: event.target.value })}
                placeholder="generate one"
                spellCheck={false}
                className="font-mono text-[11px]"
              />
              <button type="button" onClick={() => setRemote({ token: newToken() })} className="btn btn-sm">
                Generate
              </button>
              <CopyButton value={remoteState.token} label="Copy" />
            </div>
            <span className="hint">
              Convenience only — the server checks <code className="font-mono">AGENT_TOKEN</code> from
              its environment, not this field.
            </span>
          </div>
        </div>

        <div
          className={cn(
            "mt-3 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-[11.5px]",
            remote.lastError
              ? "border-[var(--color-signal-500)]/30 bg-[var(--color-signal-500)]/10"
              : remoteState.enabled
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
          )}
        >
          {remote.lastError ? (
            <AlertTriangle className="size-3.5 text-[var(--color-signal-500)]" />
          ) : remoteState.enabled ? (
            <Wifi className="size-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="size-3.5 text-[var(--fc-fg-subtle)]" />
          )}
          <span>
            {remote.lastError
              ? remote.lastError
              : remoteState.enabled
                ? remote.polling
                  ? "Draining the queue."
                  : "Waiting for the next poll."
                : "Draining is off; commands will sit in the queue until they expire."}
          </span>
          {remote.lastPollAt && (
            <span className="text-[var(--fc-fg-subtle)]">last poll {timeAgo(remote.lastPollAt)}</span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="fc-card p-4 sm:p-5">
          <SectionTitle title="Post a command by hand" description="Same endpoint an external client would use." />
          <div className="space-y-3">
            <div className="field">
              <label htmlFor="cmd-tool">Tool</label>
              <select
                id="cmd-tool"
                value={tool}
                onChange={(event) => {
                  setTool(event.target.value);
                  const next = getTool(event.target.value);
                  setArgsText(JSON.stringify(next?.examples?.[0]?.args ?? {}, null, 2));
                }}
              >
                {TOOLS.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} ({item.risk})
                  </option>
                ))}
              </select>
              {selected && <span className="hint">{selected.description}</span>}
            </div>
            <div className="field">
              <label htmlFor="cmd-args">Arguments (JSON)</label>
              <textarea
                id="cmd-args"
                value={argsText}
                onChange={(event) => setArgsText(event.target.value)}
                rows={5}
                spellCheck={false}
                className="font-mono text-[11.5px]"
              />
            </div>
            <button type="button" onClick={() => void enqueue()} disabled={posting} className="btn btn-primary btn-sm">
              {posting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Queue command
            </button>
            {response && (
              <p
                className={cn(
                  "flex items-start gap-1.5 text-[11.5px]",
                  response.ok ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--color-signal-500)]",
                )}
              >
                {response.ok ? <CheckCircle2 className="mt-0.5 size-3.5" /> : <AlertTriangle className="mt-0.5 size-3.5" />}
                {response.message}
              </p>
            )}
          </div>
        </div>

        <div className="fc-card p-4 sm:p-5">
          <SectionTitle
            title="Queue state"
            description="Server memory, five-minute TTL. A restart empties it in both directions."
            actions={
              <button type="button" onClick={() => void refresh()} className="btn btn-sm btn-ghost">
                <RefreshCw className={cn("size-3.5", loadingQueue && "animate-spin")} /> Refresh
              </button>
            }
          />
          {commands.length === 0 ? (
            <EmptyHint>Queue is empty.</EmptyHint>
          ) : (
            <ul className="space-y-2">
              {commands.slice(0, 12).map((command) => (
                <li
                  key={command.id}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-2 text-[11.5px]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-[11px] font-semibold">{command.tool}</code>
                    <span
                      className={cn(
                        "chip",
                        command.status === "done"
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          : command.status === "failed"
                            ? "border-[var(--color-signal-500)]/40 text-[var(--color-signal-500)]"
                            : "",
                      )}
                    >
                      {command.status}
                    </span>
                    <span className="text-[var(--fc-fg-subtle)]">{timeAgo(command.createdAt)}</span>
                  </div>
                  {command.result && (
                    <p className="mt-1 text-[var(--fc-fg-muted)]">{command.result}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
