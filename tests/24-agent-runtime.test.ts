import { describe, expect, it } from "vitest";
import { runAgent, toolSignature } from "@/lib/agent/runtime";
import type { ChatTurn, PendingToolCall } from "@/lib/agent/types";

const base = {
  task: "do the thing",
  system: "system",
  settings: { maxSteps: 4, maxMs: 60_000 },
};

function call(name: string, args: Record<string, unknown> = {}): PendingToolCall {
  return { id: `${name}-1`, name, args };
}

describe("bounded agent runtime", () => {
  it("completes on the first answer that needs no tool", async () => {
    const result = await runAgent({
      ...base,
      decide: async () => ({ content: "Nothing to do.", toolCalls: [] }),
      execute: async () => ({ ok: true, approved: true, summary: "unused" }),
    });
    expect(result.status).toBe("completed");
    expect(result.answer).toBe("Nothing to do.");
    expect(result.steps).toHaveLength(0);
  });

  it("runs a tool and then answers", async () => {
    let turn = 0;
    const result = await runAgent({
      ...base,
      decide: async (turns: ChatTurn[]) => {
        turn += 1;
        if (turn === 1) return { content: "Creating the task.", toolCalls: [call("create_task", { title: "X" })] };
        expect(turns.some((item) => item.role === "tool")).toBe(true);
        return { content: "Created.", toolCalls: [] };
      },
      execute: async () => ({ ok: true, approved: true, summary: "Task created: X." }),
    });
    expect(result.status).toBe("completed");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].tool).toBe("create_task");
    expect(result.answer).toBe("Created.");
  });

  it("stops at the step budget instead of looping forever", async () => {
    let n = 0;
    const result = await runAgent({
      ...base,
      settings: { maxSteps: 3, maxMs: 60_000 },
      decide: async () => ({ content: "", toolCalls: [call("create_task", { title: `t${(n += 1)}` })] }),
      execute: async () => ({ ok: true, approved: true, summary: "ok" }),
    });
    expect(result.status).toBe("step-budget");
    expect(result.steps).toHaveLength(3);
  });

  it("halts on an identical tool call with identical arguments", async () => {
    const result = await runAgent({
      ...base,
      settings: { maxSteps: 10, maxMs: 60_000 },
      decide: async () => ({ content: "", toolCalls: [call("workspace_snapshot", {})] }),
      execute: async () => ({ ok: true, approved: true, summary: "snapshot" }),
    });
    expect(result.status).toBe("repeat-guard");
    expect(result.steps).toHaveLength(2);
  });

  it("halts when the wall-clock budget is spent", async () => {
    let clock = 0;
    const result = await runAgent({
      task: "slow",
      system: "system",
      settings: { maxSteps: 10, maxMs: 1_000 },
      now: () => (clock += 600),
      decide: async () => ({ content: "", toolCalls: [call("list_tasks", { openOnly: true })] }),
      execute: async () => ({ ok: true, approved: true, summary: "listed" }),
    });
    expect(["time-budget", "repeat-guard"]).toContain(result.status);
    expect(result.steps.length).toBeLessThan(10);
  });

  it("stops when the operator rejects a tool", async () => {
    const result = await runAgent({
      ...base,
      decide: async () => ({ content: "", toolCalls: [call("delete_contact", { query: "jane" })] }),
      execute: async () => ({ ok: false, approved: false, summary: "Rejected." }),
    });
    expect(result.status).toBe("rejected");
    expect(result.answer).toContain("delete_contact");
  });

  it("turns a thrown tool into a failed step, not a crash", async () => {
    const result = await runAgent({
      ...base,
      settings: { maxSteps: 2, maxMs: 60_000 },
      decide: async () => ({ content: "", toolCalls: [call("list_contacts", { limit: 1 })] }),
      execute: async () => {
        throw new Error("boom");
      },
    });
    expect(result.steps[0].ok).toBe(false);
    expect(result.steps[0].summary).toContain("boom");
  });

  it("reports a model error without steps", async () => {
    const result = await runAgent({
      ...base,
      decide: async () => {
        throw new Error("provider unreachable");
      },
      execute: async () => ({ ok: true, approved: true, summary: "unused" }),
    });
    expect(result.status).toBe("error");
    expect(result.answer).toContain("provider unreachable");
  });

  it("builds a signature that ignores argument order", () => {
    const a = toolSignature({ id: "1", name: "create_task", args: { title: "X", priority: "high" } });
    const b = toolSignature({ id: "2", name: "create_task", args: { priority: "high", title: "X" } });
    expect(a).toBe(b);
    expect(a).not.toBe(toolSignature({ id: "3", name: "create_task", args: { title: "Y", priority: "high" } }));
  });
});
