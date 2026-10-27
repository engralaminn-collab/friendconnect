"use client";

/* ============================================================
   Bill Agent — the client-side runner
   ------------------------------------------------------------
   Composes the four moving parts:
     registry  → which tool, with which schema
     provider  → who decides
     runtime   → how many steps, when to stop
     stores    → what it is allowed to touch, and the audit trail
   ============================================================ */

import * as React from "react";
import { uid } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useAgentStore } from "@/lib/agent/agentStore";
import { getTool, openAiToolSpecs } from "@/lib/agent/registry";
import { validateArgs } from "@/lib/agent/schema";
import { callProvider, getProvider } from "@/lib/agent/providers";
import { offlineDecide } from "@/lib/agent/offline";
import { DEFAULT_SYSTEM_PROMPT, runAgent, type ExecutionOutcome } from "@/lib/agent/runtime";
import type {
  ChatTurn,
  PendingToolCall,
  RunStep,
  ToolDefinition,
  ToolResult,
} from "@/lib/agent/types";

export interface ApprovalRequest {
  call: PendingToolCall;
  tool: ToolDefinition;
}

export interface AgentRunner {
  busy: boolean;
  liveSteps: RunStep[];
  approval: ApprovalRequest | null;
  resolveApproval: (approved: boolean) => void;
  runTask: (task: string) => Promise<void>;
  runToolDirect: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
  stopRequested: boolean;
  requestStop: () => void;
}

export function useAgentRun(): AgentRunner {
  const [busy, setBusy] = React.useState(false);
  const [liveSteps, setLiveSteps] = React.useState<RunStep[]>([]);
  const [approval, setApproval] = React.useState<ApprovalRequest | null>(null);
  const [stopRequested, setStopRequested] = React.useState(false);

  const approvalResolver = React.useRef<((approved: boolean) => void) | null>(null);
  const stopRef = React.useRef(false);
  const stepsRef = React.useRef<RunStep[]>([]);

  const resolveApproval = React.useCallback((approved: boolean) => {
    approvalResolver.current?.(approved);
    approvalResolver.current = null;
    setApproval(null);
  }, []);

  const requestStop = React.useCallback(() => {
    stopRef.current = true;
    setStopRequested(true);
    // Release any blocking approval prompt so the loop can unwind.
    approvalResolver.current?.(false);
    approvalResolver.current = null;
    setApproval(null);
  }, []);

  const askApproval = React.useCallback((request: ApprovalRequest) => {
    return new Promise<boolean>((resolve) => {
      approvalResolver.current = resolve;
      setApproval(request);
    });
  }, []);

  const executeTool = React.useCallback(
    async (
      call: PendingToolCall,
      options: { requireApproval: boolean },
    ): Promise<ExecutionOutcome> => {
      const agent = useAgentStore.getState();
      const tool = getTool(call.name);
      if (!tool) {
        return {
          ok: false,
          approved: true,
          summary: `Unknown tool “${call.name}”. Read /api/agent/manifest for the catalogue.`,
        };
      }

      const validation = validateArgs(tool.schema, call.args);
      if (!validation.ok) {
        const summary = `Invalid arguments for ${tool.name}: ${validation.errors.join("; ")}`;
        useAgentStore.getState().audit({
          kind: "tool",
          action: tool.name,
          detail: summary,
          risk: tool.risk,
          ok: false,
        });
        return { ok: false, approved: true, summary };
      }

      const settings = agent.settings;
      const needsApproval =
        tool.risk === "destructive" ||
        (options.requireApproval && settings.autonomy === "ask" && tool.risk !== "read");

      if (needsApproval) {
        const approved = await askApproval({ call, tool });
        useAgentStore.getState().audit({
          kind: "approval",
          action: tool.name,
          detail: approved ? "Approved by the operator." : "Rejected by the operator.",
          risk: tool.risk,
          ok: approved,
        });
        if (!approved) {
          return {
            ok: false,
            approved: false,
            summary: `${tool.title} was not approved, so nothing changed.`,
          };
        }
      }

      if (settings.dryRun && tool.risk !== "read") {
        const summary = `Dry run: ${tool.title} would run with ${JSON.stringify(validation.args)}. Nothing was written.`;
        useAgentStore.getState().audit({
          kind: "tool",
          action: tool.name,
          detail: summary,
          risk: tool.risk,
          ok: true,
        });
        return { ok: true, approved: true, summary, data: { dryRun: true, args: validation.args } };
      }

      const startedAt = new Date().toISOString();
      try {
        const result = await tool.run(
          { workspace: useStore.getState(), now: () => new Date() },
          validation.args,
        );
        useAgentStore.getState().audit({
          kind: "tool",
          action: tool.name,
          detail: `${result.summary} · ${startedAt}`,
          risk: tool.risk,
          ok: result.ok,
        });
        return { ok: result.ok, approved: true, summary: result.summary, data: result.data };
      } catch (error) {
        const summary = error instanceof Error ? error.message : String(error);
        useAgentStore.getState().audit({
          kind: "tool",
          action: tool.name,
          detail: `Threw: ${summary}`,
          risk: tool.risk,
          ok: false,
        });
        return { ok: false, approved: true, summary };
      }
    },
    [askApproval],
  );

  const runToolDirect = React.useCallback(
    async (name: string, args: Record<string, unknown>): Promise<ToolResult> => {
      const outcome = await executeTool({ id: uid("call"), name, args }, { requireApproval: false });
      return { ok: outcome.ok, summary: outcome.summary, data: outcome.data };
    },
    [executeTool],
  );

  const decide = React.useCallback(async (turns: ChatTurn[]) => {
    const agent = useAgentStore.getState();
    const providerId = agent.activeProviderId;
    if (providerId === "offline") {
      return offlineDecide(turns);
    }
    const config = agent.providers[providerId];
    if (!config) throw new Error(`Provider ${providerId} is not configured.`);
    const preset = getProvider(providerId);
    if (!preset) throw new Error(`Provider ${providerId} is not in the catalogue.`);
    if (!config.model.trim()) throw new Error(`Choose a model for ${preset.name} first.`);

    const reply = await callProvider(providerId, config, turns, {
      tools: openAiToolSpecs(),
      timeoutMs: Math.min(agent.settings.maxMs, 120_000),
      temperature: agent.settings.temperature,
    });

    // Some local servers ignore the tools field; make the intent explicit.
    if (reply.toolCalls.length === 0 && /^[{(]/.test(reply.content.trim())) {
      try {
        const parsed = JSON.parse(reply.content) as { tool?: string; args?: unknown };
        if (parsed.tool && getTool(parsed.tool)) {
          return {
            content: "",
            toolCalls: [
              {
                id: uid("call"),
                name: parsed.tool,
                args:
                  typeof parsed.args === "object" && parsed.args !== null
                    ? (parsed.args as Record<string, unknown>)
                    : {},
              },
            ],
          };
        }
      } catch {
        // Not JSON — fall through and treat it as prose.
      }
    }

    return { content: reply.content, toolCalls: reply.toolCalls };
  }, []);

  const runTask = React.useCallback(
    async (task: string) => {
      const trimmed = task.trim();
      if (!trimmed || busy) return;
      const agentStore = useAgentStore.getState();
      setBusy(true);
      setStopRequested(false);
      stopRef.current = false;
      stepsRef.current = [];
      setLiveSteps([]);
      agentStore.pushMessage({ role: "user", content: trimmed });

      const providerId = agentStore.activeProviderId;
      const config = agentStore.providers[providerId];
      const model = providerId === "offline" ? "offline-grammar" : config?.model ?? "—";
      const startedAt = new Date().toISOString();
      const runId = uid("run");

      try {
        const result = await runAgent({
          task: trimmed,
          system: DEFAULT_SYSTEM_PROMPT,
          settings: {
            maxSteps: agentStore.settings.maxSteps,
            maxMs: agentStore.settings.maxMs,
          },
          decide,
          execute: async (call) => {
            if (stopRef.current) {
              return { ok: false, approved: false, summary: "Stopped by the operator." };
            }
            const outcome = await executeTool(call, { requireApproval: true });
            const step: RunStep = {
              index: stepsRef.current.length,
              at: new Date().toISOString(),
              tool: call.name,
              args: call.args,
              ok: outcome.ok,
              summary: outcome.summary,
              ms: 0,
              approved: outcome.approved,
            };
            stepsRef.current = [...stepsRef.current, step];
            setLiveSteps(stepsRef.current);
            return outcome;
          },
        });

        const tools = result.steps.map((step) => ({
          name: step.tool,
          summary: step.summary,
          ok: step.ok,
          approved: step.approved,
        }));

        useAgentStore.getState().pushMessage({
          role: "assistant",
          content: result.answer,
          tools,
          runStatus: result.status,
        });
        useAgentStore.getState().logRun({
          id: runId,
          task: trimmed,
          startedAt,
          finishedAt: new Date().toISOString(),
          status: result.status,
          providerId,
          model,
          offline: providerId === "offline",
          answer: result.answer,
          steps: result.steps,
        });
        useAgentStore.getState().audit({
          kind: "run",
          action: providerId === "offline" ? "offline run" : `${providerId}/${model}`,
          detail: `${task.length > 160 ? `${task.slice(0, 160)}…` : task} → ${result.status} after ${result.steps.length} step(s).`,
          ok: result.status === "completed",
          runId,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        useAgentStore.getState().pushMessage({
          role: "assistant",
          content: `I could not run that: ${message}`,
          runStatus: "error",
        });
        useAgentStore.getState().logRun({
          id: runId,
          task: trimmed,
          startedAt,
          finishedAt: new Date().toISOString(),
          status: "error",
          providerId,
          model,
          offline: providerId === "offline",
          answer: message,
          steps: stepsRef.current,
          error: message,
        });
        useAgentStore.getState().audit({
          kind: "run",
          action: providerId === "offline" ? "offline run" : providerId,
          detail: message,
          ok: false,
          runId,
        });
      } finally {
        setBusy(false);
        setStopRequested(false);
      }
    },
    [busy, decide, executeTool],
  );

  return {
    busy,
    liveSteps,
    approval,
    resolveApproval,
    runTask,
    runToolDirect,
    stopRequested,
    requestStop,
  };
}

/* ------------------------------------------------------------------ */
/* Remote queue drain                                                  */
/* ------------------------------------------------------------------ */

export interface RemoteQueueState {
  polling: boolean;
  lastPollAt?: string;
  lastError?: string;
  executed: number;
}

/**
 * Drains /api/agent/commands while the operator tab is open. This is what
 * makes the HTTP control surface real: an external caller posts a tool
 * call, the browser executes it against live workspace state and settles
 * the command with the actual result.
 */
export function useRemoteQueue(
  enabled: boolean,
  execute: (name: string, args: Record<string, unknown>) => Promise<ToolResult>,
) {
  const [state, setState] = React.useState<RemoteQueueState>({ polling: false, executed: 0 });
  const executeRef = React.useRef(execute);
  React.useEffect(() => {
    executeRef.current = execute;
  }, [execute]);

  React.useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ ...prev, polling: false }));
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cursor = new Date().toISOString();

    const poll = async () => {
      if (cancelled) return;
      setState((prev) => ({ ...prev, polling: true }));
      try {
        const response = await fetch(
          `/api/agent/commands?since=${encodeURIComponent(cursor)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error(`Queue endpoint answered ${response.status}`);
        const payload = (await response.json()) as { commands?: Array<{ id: string; tool: string; args: Record<string, unknown> }> };
        cursor = new Date().toISOString();
        let executed = 0;
        for (const command of payload.commands ?? []) {
          const result = await executeRef.current(command.tool, command.args ?? {});
          executed += 1;
          await fetch("/api/agent/commands/settle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: command.id,
              status: result.ok ? "done" : "failed",
              result: result.summary,
            }),
          });
        }
        setState((prev) => ({
          polling: true,
          lastPollAt: new Date().toISOString(),
          lastError: undefined,
          executed: prev.executed + executed,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          polling: true,
          lastPollAt: new Date().toISOString(),
          lastError: error instanceof Error ? error.message : String(error),
        }));
      } finally {
        if (!cancelled) timer = setTimeout(poll, 4_000);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);

  return state;
}

/* ------------------------------------------------------------------ */
/* Automation rhythm                                                   */
/* ------------------------------------------------------------------ */

/**
 * Fires due automations once per page load. Deliberately client-side:
 * there is no server cron to drift, and a closed tab pauses the schedule
 * instead of silently running unattended writes.
 */
export function useAutomationScheduler(
  execute: (name: string, args: Record<string, unknown>) => Promise<ToolResult>,
) {
  const [fired, setFired] = React.useState<string[]>([]);
  const executedRef = React.useRef(false);
  const executeRef = React.useRef(execute);
  React.useEffect(() => {
    executeRef.current = execute;
  }, [execute]);

  React.useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    const store = useAgentStore.getState();
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const due = store.automations.filter((automation) => {
      if (!automation.enabled) return false;
      const last = automation.lastRunAt ? new Date(automation.lastRunAt).getTime() : 0;
      if (automation.trigger === "manual") return false;
      if (automation.trigger === "on-open") return true;
      if (automation.trigger === "daily") return last < startOfToday.getTime();
      if (automation.trigger === "weekly") return now - last > 7 * 86_400_000;
      return false;
    });

    if (due.length === 0) return;

    void (async () => {
      for (const automation of due) {
        const result = await executeRef.current(automation.tool, automation.args);
        useAgentStore.getState().updateAutomation(automation.id, {
          lastRunAt: new Date().toISOString(),
          lastResult: result.summary,
          runCount: automation.runCount + 1,
        });
        useAgentStore.getState().audit({
          kind: "automation",
          action: `scheduled:${automation.trigger}`,
          detail: `${automation.name}: ${result.summary}`,
          ok: result.ok,
        });
        setFired((prev) => [...prev, automation.name]);
      }
    })();
  }, []);

  return fired;
}
