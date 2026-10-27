import { describe, expect, it } from "vitest";
import { getTool, TOOLS } from "@/lib/agent/registry";
import { validateArgs } from "@/lib/agent/schema";
import { makeWorkspace } from "./helpers/agent-workspace";
import type { ToolResult } from "@/lib/agent/types";

async function run(
  name: string,
  args: Record<string, unknown>,
  ws = makeWorkspace(),
): Promise<{ result: ToolResult; ws: ReturnType<typeof makeWorkspace> }> {
  const tool = getTool(name);
  if (!tool) throw new Error(`missing tool ${name}`);
  const validation = validateArgs(tool.schema, args);
  if (!validation.ok) throw new Error(validation.errors.join("; "));
  const result = await tool.run(
    { workspace: ws, now: () => new Date("2026-10-26T09:00:00Z") },
    validation.args,
  );
  return { result, ws };
}

function seedWorkspace() {
  const ws = makeWorkspace();
  ws.gateways = [
    {
      id: "gw1",
      name: "HTTP SMS",
      provider: "httpsms",
      description: "Send SMS over plain HTTP",
      baseUrl: "https://api.httpsms.com",
      authHeader: "x-api-key",
      connected: false,
      capabilities: ["sms"],
      monthlyVolume: 0,
      settings: {},
    },
  ] as never;
  ws.plugins = [
    { id: "pl1", name: "CSV importer", slug: "csv-importer", installed: false },
  ] as never;
  ws.notifications = [
    { id: "n1", title: "One", read: false },
    { id: "n2", title: "Two", read: true },
  ] as never;
  return ws;
}

describe("extended tool batch", () => {
  it("keeps the registry contract intact at the new size", () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(50);
    const groups = new Set(TOOLS.map((tool) => tool.group));
    expect(Array.from(groups).sort()).toEqual(
      ["crm", "education", "knowledge", "marketing", "messaging", "operations", "studios"].sort(),
    );
  });

  it("creates a student and rejects a duplicate email", async () => {
    const ws = makeWorkspace();
    const first = await run(
      "create_student",
      { name: "Samuel Okafor", email: "samuel@example.test", country: "Nigeria", budget: 18000 },
      ws,
    );
    expect(first.result.ok).toBe(true);
    expect(ws.students[0].status).toBe("enquiry");

    const second = await run("create_student", { name: "Samuel again", email: "samuel@example.test" }, ws);
    expect(second.result.ok).toBe(false);
    expect(ws.students).toHaveLength(1);
  });

  it("posts to the feed and creates an event", async () => {
    const ws = makeWorkspace();
    const post = await run("create_post", { body: "Shipped the operator today", topic: "Product" }, ws);
    expect(post.result.ok).toBe(true);
    expect(ws.posts[0].author).toBe("Bill Agent");

    const event = await run("create_event", { title: "Visa briefing", type: "webinar", attendees: 40 }, ws);
    expect(event.result.ok).toBe(true);
    expect(ws.events[0].type).toBe("webinar");
    expect(new Date(ws.events[0].date).getTime()).toBeGreaterThan(Date.now());
  });

  it("logs a call with derived quality from the MOS", async () => {
    const { result, ws } = await run("log_call", {
      contactName: "Jane Okafor",
      direction: "outgoing",
      durationSec: 320,
      mos: 4.2,
    });
    expect(result.ok).toBe(true);
    expect(ws.calls[0].durationSec).toBe(320);
    expect(ws.calls[0].quality.mos).toBe(4.2);
    expect(ws.calls[0].quality.codec).toContain("opus");
  });

  it("connects and re-points a gateway, and lists the alternatives when it cannot", async () => {
    const ws = seedWorkspace();
    const connected = await run("update_gateway", { query: "HTTP SMS", connected: true }, ws);
    expect(connected.result.ok).toBe(true);
    expect(ws.gateways[0].connected).toBe(true);

    const repointed = await run("update_gateway", { query: "gw1", baseUrl: "https://sms.example" }, ws);
    expect(repointed.result.ok).toBe(true);
    expect(ws.gateways[0].baseUrl).toBe("https://sms.example");

    const missing = await run("update_gateway", { query: "carrier pigeon" }, ws);
    expect(missing.result.ok).toBe(false);
    expect(missing.result.summary).toContain("HTTP SMS");
  });

  it("toggles a plugin and pins a note", async () => {
    const ws = seedWorkspace();
    const plugin = await run("toggle_plugin", { query: "csv" }, ws);
    expect(plugin.result.ok).toBe(true);
    expect(ws.plugins[0].installed).toBe(true);

    await run("create_note", { title: "Northwind SSO" }, ws);
    const pinned = await run("pin_note", { query: "northwind" }, ws);
    expect(pinned.result.ok).toBe(true);
    expect(ws.notes[0].pinned).toBe(true);
  });

  it("updates a wiki page and refuses an empty patch", async () => {
    const ws = makeWorkspace();
    await run("create_wiki_page", { title: "Onboarding", summary: "First week", body: "..." }, ws);
    const updated = await run("update_wiki_page", { query: "onboarding", category: "People" }, ws);
    expect(updated.result.ok).toBe(true);
    expect(ws.wikiPages[0].category).toBe("People");

    const empty = await run("update_wiki_page", { query: "onboarding" }, ws);
    expect(empty.result.ok).toBe(false);
  });

  it("saves a diagram with start and end caps", async () => {
    const { result, ws } = await run("save_diagram", {
      name: "Enquiry to enrolment",
      steps: ["Enquiry", "Counselling", "Application", "Offer", "Visa"],
    });
    expect(result.ok).toBe(true);
    const diagram = ws.diagrams[0];
    expect(diagram.nodes).toHaveLength(7);
    expect(diagram.nodes[0].type).toBe("start");
    expect(diagram.nodes[diagram.nodes.length - 1].type).toBe("end");
    expect(diagram.edges).toHaveLength(6);
  });

  it("refuses a diagram with no steps", async () => {
    const { result } = await run("save_diagram", { name: "Empty" });
    expect(result.ok).toBe(false);
  });

  it("marks notifications read and toggles kid-safe mode", async () => {
    const ws = seedWorkspace();
    const cleared = await run("mark_notifications_read", {}, ws);
    expect(cleared.result.ok).toBe(true);
    expect(ws.notifications.every((notification) => notification.read)).toBe(true);

    const kidSafe = await run("set_kid_safe", { on: true }, ws);
    expect(kidSafe.result.ok).toBe(true);
    expect(ws.safety.kidSafe).toBe(true);
  });
});
