import { describe, expect, it } from "vitest";
import { useStore } from "@/store/useStore";
import { getTool } from "@/lib/agent/registry";
import { validateArgs } from "@/lib/agent/schema";
import { offlineDecide } from "@/lib/agent/offline";
import { runAgent } from "@/lib/agent/runtime";

/**
 * The one test that uses the *real* zustand workspace store rather than the
 * in-memory stand-in. It proves the WorkspacePort shape matches the store the
 * UI actually renders, and that the offline plan drives it end to end.
 */
describe("operator against the real workspace store", () => {
  it("creates, finds and removes a contact through the store", async () => {
    const tool = getTool("create_contact")!;
    const args = validateArgs(tool.schema, {
      name: "Port Check",
      email: "port.check@example.test",
    });
    expect(args.ok).toBe(true);

    const before = useStore.getState().contacts.length;
    const created = await tool.run(
      { workspace: useStore.getState(), now: () => new Date() },
      args.args,
    );
    expect(created.ok).toBe(true);
    expect(useStore.getState().contacts.length).toBe(before + 1);

    const duplicate = await tool.run(
      { workspace: useStore.getState(), now: () => new Date() },
      args.args,
    );
    expect(duplicate.ok).toBe(false);

    const lookup = getTool("get_contact")!;
    const found = await lookup.run(
      { workspace: useStore.getState(), now: () => new Date() },
      { query: "port.check@example.test" },
    );
    expect(found.ok).toBe(true);

    // Clean up so the persisted store in a developer's browser stays clean.
    const id = (found.data as { contact: { id: string } }).contact.id;
    useStore.getState().removeContact(id);
    expect(useStore.getState().contacts.length).toBe(before);
  });

  it("runs a whole offline plan through the runtime and the store", async () => {
    const contactsBefore = useStore.getState().contacts.length;
    let step = 0;
    const result = await runAgent({
      task: "add task Portfolio smoke check, priority low",
      system: "test",
      settings: { maxSteps: 3, maxMs: 10_000 },
      decide: async (turns) => {
        step += 1;
        return offlineDecide(turns);
      },
      execute: async (call) => {
        const tool = getTool(call.name);
        if (!tool) return { ok: false, approved: true, summary: "unknown tool" };
        const validation = validateArgs(tool.schema, call.args);
        if (!validation.ok) return { ok: false, approved: true, summary: validation.errors.join("; ") };
        const out = await tool.run(
          { workspace: useStore.getState(), now: () => new Date() },
          validation.args,
        );
        return { ok: out.ok, approved: true, summary: out.summary, data: out.data };
      },
    });

    expect(result.status).toBe("completed");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].tool).toBe("create_task");
    expect(
      useStore.getState().tasks.some((task) => task.title === "Portfolio smoke check"),
    ).toBe(true);
    expect(useStore.getState().contacts.length).toBe(contactsBefore);
  });
});
