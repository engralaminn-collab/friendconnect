/* ============================================================
   Bill Agent — bounded runtime
   ------------------------------------------------------------
   One loop, four independent stop conditions, no hidden state:
     · goal        the model answers without asking for a tool
     · steps       hard ceiling on tool calls
     · repeat      the same tool + arguments twice is a bug, not a plan
     · clock       wall-clock budget for the whole run
   Approval happens inside `execute`, so a rejected call halts the
   run with status "rejected" instead of silently continuing.
   ============================================================ */

import type {
  ChatTurn,
  PendingToolCall,
  RunStatus,
  RunStep,
} from "./types";

export const DEFAULT_MAX_STEPS = 8;
export const DEFAULT_MAX_MS = 120_000;

export interface Decision {
  content: string;
  toolCalls: PendingToolCall[];
}

export interface ExecutionOutcome {
  ok: boolean;
  summary: string;
  approved: boolean;
  /** Serialised payload handed back to the model. */
  data?: unknown;
}

export interface RuntimeSettings {
  maxSteps: number;
  maxMs: number;
}

export interface RuntimeInput {
  task: string;
  /** Prepended as the system turn. */
  system: string;
  settings: RuntimeSettings;
  decide: (turns: ChatTurn[], step: number) => Promise<Decision>;
  execute: (call: PendingToolCall, step: number) => Promise<ExecutionOutcome>;
  now?: () => number;
  onTurn?: (turns: ChatTurn[]) => void;
}

export interface RuntimeOutput {
  status: RunStatus;
  answer: string;
  steps: RunStep[];
  turns: ChatTurn[];
}

export function toolSignature(call: PendingToolCall): string {
  const stable = Object.keys(call.args ?? {})
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = (call.args ?? {})[key];
      return acc;
    }, {});
  return `${call.name}:${JSON.stringify(stable)}`;
}

export function clip(value: unknown, limit = 1_500): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

export async function runAgent(input: RuntimeInput): Promise<RuntimeOutput> {
  const now = input.now ?? (() => Date.now());
  const started = now();
  const maxSteps = Math.max(1, input.settings.maxSteps || DEFAULT_MAX_STEPS);
  const maxMs = Math.max(1_000, input.settings.maxMs || DEFAULT_MAX_MS);

  const turns: ChatTurn[] = [
    { role: "system", content: input.system },
    { role: "user", content: input.task },
  ];
  const steps: RunStep[] = [];
  const seen = new Map<string, number>();
  let lastContent = "";

  const finish = (status: RunStatus, answer: string): RuntimeOutput => ({
    status,
    answer,
    steps,
    turns,
  });

  for (let step = 0; step < maxSteps; step += 1) {
    if (now() - started > maxMs) {
      return finish(
        "time-budget",
        lastContent ||
          `Stopped after ${steps.length} step(s): the ${Math.round(maxMs / 1000)}s wall-clock budget ran out.`,
      );
    }

    let decision: Decision;
    try {
      decision = await input.decide(turns, step);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      turns.push({ role: "assistant", content: `I could not continue: ${message}` });
      return finish("error", message);
    }

    lastContent = decision.content || lastContent;

    if (!decision.toolCalls || decision.toolCalls.length === 0) {
      turns.push({ role: "assistant", content: decision.content });
      input.onTurn?.(turns);
      return finish("completed", decision.content);
    }

    turns.push({
      role: "assistant",
      content: decision.content,
      toolCalls: decision.toolCalls,
    });
    input.onTurn?.(turns);

    for (const call of decision.toolCalls) {
      const signature = toolSignature(call);
      const count = (seen.get(signature) ?? 0) + 1;
      seen.set(signature, count);
      if (count > 1) {
        const summary = `Repeated call detected (${call.name} with identical arguments).`;
        steps.push({
          index: steps.length,
          at: new Date(now()).toISOString(),
          tool: call.name,
          args: call.args,
          ok: false,
          summary,
          ms: 0,
          approved: true,
        });
        turns.push({
          role: "tool",
          content: summary,
          toolCallId: call.id,
          name: call.name,
        });
        return finish("repeat-guard", summary);
      }

      const callStarted = now();
      let outcome: ExecutionOutcome;
      try {
        outcome = await input.execute(call, step);
      } catch (error) {
        outcome = {
          ok: false,
          approved: true,
          summary: error instanceof Error ? error.message : String(error),
        };
      }
      const ms = now() - callStarted;

      steps.push({
        index: steps.length,
        at: new Date(now()).toISOString(),
        tool: call.name,
        args: call.args,
        ok: outcome.ok,
        summary: outcome.summary,
        ms,
        approved: outcome.approved,
      });

      const payload = outcome.data === undefined ? "" : `\n${clip(outcome.data)}`;
      turns.push({
        role: "tool",
        content: `${outcome.summary}${payload}`,
        toolCallId: call.id,
        name: call.name,
      });
      input.onTurn?.(turns);

      if (!outcome.approved) {
        return finish("rejected", `Stopped: ${call.name} was not approved. ${outcome.summary}`);
      }
      if (now() - started > maxMs) {
        return finish(
          "time-budget",
          `Stopped after ${steps.length} step(s): the wall-clock budget ran out.`,
        );
      }
    }
  }

  return finish(
    "step-budget",
    lastContent || `Stopped after ${maxSteps} step(s) without a final answer.`,
  );
}

export const DEFAULT_SYSTEM_PROMPT = [
  "You are Bill, the operator of the FriendConnect workspace.",
  "You act on the workspace only through the tools you are given. Never claim a change you did not make.",
  "Call one tool at a time unless the calls are genuinely independent.",
  "After the tools return, answer in at most three short sentences: what changed, and what the operator should look at next.",
  "If a tool fails, read the error, fix the arguments once, and only then report the failure.",
  "Never invent a contact, deal, student or thread that a tool did not return.",
  "Amounts are GBP. Dates are ISO 8601.",
].join(" ");
