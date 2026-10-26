"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  FlaskConical,
  Loader2,
  RotateCcw,
  Server,
  Wifi,
} from "lucide-react";
import { PROVIDERS, probeProvider, setupHint, type ProbeResult } from "@/lib/agent/providers";
import { useAgentStore } from "@/lib/agent/agentStore";
import { cn } from "@/lib/utils";
import { useToast } from "@/store/useUI";
import { CopyButton, SectionTitle } from "./widgets";

const KIND_ICON = {
  local: Server,
  cloud: Cloud,
  custom: FlaskConical,
} as const;

export function ProvidersPanel() {
  const providers = useAgentStore((state) => state.providers);
  const activeProviderId = useAgentStore((state) => state.activeProviderId);
  const setProvider = useAgentStore((state) => state.setProvider);
  const resetProvider = useAgentStore((state) => state.resetProvider);
  const setActiveProvider = useAgentStore((state) => state.setActiveProvider);
  const audit = useAgentStore((state) => state.audit);
  const toast = useToast();

  const [testing, setTesting] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<Record<string, ProbeResult>>({});
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({});
  const [filter, setFilter] = React.useState<"all" | "local" | "cloud">("all");

  const visible = PROVIDERS.filter((provider) => filter === "all" || provider.kind === filter);

  const test = async (id: string) => {
    const config = providers[id];
    if (!config) return;
    setTesting(id);
    const result = await probeProvider(id, config);
    setResults((prev) => ({ ...prev, [id]: result }));
    setTesting(null);
    audit({
      kind: "provider",
      action: id,
      detail: `${result.ok ? "Reachable" : "Unreachable"} · ${result.message}`,
      ok: result.ok,
    });
    if (result.ok) toast.success(`${id} reachable`, result.message);
    else toast.error(`${id} not reachable`, result.message.slice(0, 140));
  };

  return (
    <div className="space-y-6">
      <div className="fc-card p-4 sm:p-5">
        <SectionTitle
          title="Who decides"
          description="The operator works with no provider at all (deterministic grammar). Connect any OpenAI-compatible endpoint — local first — and it plans freely. Keys are stored in this browser's localStorage only and sent directly to the endpoint you choose."
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="field min-w-[240px] flex-1">
            <label htmlFor="active-provider">Active provider</label>
            <select
              id="active-provider"
              value={activeProviderId}
              onChange={(event) => {
                setActiveProvider(event.target.value);
                audit({
                  kind: "provider",
                  action: "switch",
                  detail: `Operator switched to ${event.target.value}.`,
                  ok: true,
                });
              }}
            >
              <option value="offline">Offline grammar — no model, no network</option>
              {PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                  {provider.openSource ? " · open" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "local", "cloud"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={cn("chip capitalize", filter === option && "chip-brand")}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        {activeProviderId === "offline" ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--fc-surface-2)] p-3 text-[12px] text-[var(--fc-fg-muted)]">
            <Cpu className="mt-0.5 size-3.5 shrink-0" />
            Offline mode uses a fixed grammar: add contact, create deal, move stage, tasks, notes,
            search, status, forecast, threads, posts and audits all work with no model configured.
            Ask “help” in the console to see the exact phrases.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((provider) => {
          const config = providers[provider.id] ?? {
            baseUrl: provider.defaultBaseUrl,
            apiKey: "",
            model: provider.suggestedModels[0] ?? "",
            enabled: false,
          };
          const result = results[provider.id];
          const Icon = KIND_ICON[provider.kind];
          const isActive = activeProviderId === provider.id;
          const hint = setupHint(provider.id);

          return (
            <article
              key={provider.id}
              className={cn(
                "fc-card flex flex-col p-4 sm:p-5",
                isActive && "border-[var(--color-brand-500)] ring-1 ring-[var(--color-brand-500)]/30",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-[var(--fc-fg-subtle)]" />
                    <h3 className="font-display text-[14px] font-bold">{provider.name}</h3>
                    {provider.openSource && <span className="chip chip-brand">open</span>}
                    {isActive && (
                      <span className="chip border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {provider.blurb}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--fc-fg-subtle)]">
                    {provider.kind} · {provider.licence} · {provider.wire} wire
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {provider.homepage && (
                    <a
                      href={provider.homepage}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="btn btn-sm btn-icon"
                      aria-label={`${provider.name} homepage`}
                      title="Homepage"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      resetProvider(provider.id);
                      setResults((prev) => {
                        const next = { ...prev };
                        delete next[provider.id];
                        return next;
                      });
                      toast.info(`${provider.name} reset to defaults`);
                    }}
                    className="btn btn-sm btn-icon"
                    aria-label={`Reset ${provider.name}`}
                    title="Reset to defaults"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="field sm:col-span-2">
                  <label htmlFor={`${provider.id}-base`}>Base URL</label>
                  <input
                    id={`${provider.id}-base`}
                    value={config.baseUrl}
                    onChange={(event) => setProvider(provider.id, { baseUrl: event.target.value })}
                    placeholder={provider.defaultBaseUrl}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${provider.id}-model`}>Model</label>
                  <input
                    id={`${provider.id}-model`}
                    value={config.model}
                    onChange={(event) => setProvider(provider.id, { model: event.target.value })}
                    list={`${provider.id}-models`}
                    placeholder={provider.suggestedModels[0]}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <datalist id={`${provider.id}-models`}>
                    {provider.suggestedModels.map((model) => (
                      <option key={model} value={model} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor={`${provider.id}-key`}>
                    API key {provider.requiresKey ? "" : "(optional)"}
                  </label>
                  <div className="relative">
                    <input
                      id={`${provider.id}-key`}
                      type={revealed[provider.id] ? "text" : "password"}
                      value={config.apiKey}
                      onChange={(event) => setProvider(provider.id, { apiKey: event.target.value })}
                      placeholder={provider.requiresKey ? "required" : "not needed for local"}
                      autoComplete="off"
                      spellCheck={false}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setRevealed((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
                      }
                      className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
                      aria-label={revealed[provider.id] ? "Hide key" : "Show key"}
                    >
                      {revealed[provider.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {hint && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--fc-surface-2)] px-2.5 py-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-[var(--fc-fg-muted)]">
                    {hint}
                  </code>
                  <CopyButton value={hint} label="Setup" />
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void test(provider.id)}
                  disabled={testing === provider.id}
                  className="btn btn-sm"
                >
                  {testing === provider.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wifi className="size-3.5" />
                  )}
                  Test connection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProvider(provider.id, { enabled: true });
                    setActiveProvider(provider.id);
                    audit({
                      kind: "provider",
                      action: provider.id,
                      detail: `Activated ${provider.name} with ${config.model || "no model"}.`,
                      ok: true,
                    });
                    toast.success(`${provider.name} is now the operator's model`, config.model);
                  }}
                  className={cn("btn btn-sm", isActive ? "btn-secondary" : "btn-primary")}
                >
                  {isActive ? <CheckCircle2 className="size-3.5" /> : null}
                  {isActive ? "In use" : "Use this"}
                </button>
                {provider.docs && (
                  <a
                    href={provider.docs}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn btn-sm btn-ghost"
                  >
                    Docs <ExternalLink className="size-3" />
                  </a>
                )}
              </div>

              {result && (
                <div
                  className={cn(
                    "mt-3 flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11.5px]",
                    result.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-[var(--color-signal-500)]/30 bg-[var(--color-signal-500)]/10 text-[var(--color-signal-600)] dark:text-[var(--color-signal-400)]",
                  )}
                >
                  {result.ok ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  )}
                  <span className="min-w-0">
                    {result.message}
                    <span className="block opacity-70">
                      {result.latencyMs}ms · {result.endpoint || "no endpoint"}
                    </span>
                    {result.ok && result.models.length > 0 && (
                      <span className="mt-1 block font-mono text-[10.5px] opacity-80">
                        {result.models.slice(0, 6).join(" · ")}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="fc-card p-4 sm:p-5">
        <SectionTitle
          title="Why local first"
          description="A self-hosted model keeps every contact, student and message inside your own network. It also costs nothing per token, which matters when an operator runs hundreds of small tool calls a day."
        />
        <div className="grid gap-3 text-[12.5px] text-[var(--fc-fg-muted)] sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
            <strong className="block text-[var(--fc-fg)]">Start Ollama in two lines</strong>
            <code className="mt-1 block font-mono text-[11px]">
              curl -fsSL https://ollama.com/install.sh | sh
              <br />
              OLLAMA_ORIGINS=&quot;*&quot; ollama serve
            </code>
            <code className="mt-1 block font-mono text-[11px]">ollama pull qwen2.5:14b</code>
          </div>
          <div className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
            <strong className="block text-[var(--fc-fg)]">Browser talk to a local port</strong>
            The browser calls your machine directly, so the server must allow this origin.
            Ollama: <code className="font-mono text-[11px]">OLLAMA_ORIGINS</code>. vLLM:
            <code className="font-mono text-[11px]"> --allowed-origins</code>. llama.cpp:{" "}
            <code className="font-mono text-[11px]">--api-key</code> plus a reverse proxy. If a test
            fails with “Failed to fetch”, it is almost always CORS or the port, not the model.
          </div>
        </div>
      </div>
    </div>
  );
}
