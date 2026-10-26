import { describe, expect, it } from "vitest";
import { getTool } from "@/lib/agent/registry";
import { validateArgs } from "@/lib/agent/schema";
import { makeContact, makeWorkspace } from "./helpers/agent-workspace";
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
  const result = await tool.run({ workspace: ws, now: () => new Date("2026-10-26T09:00:00Z") }, validation.args);
  return { result, ws };
}

describe("CRM tools", () => {
  it("creates a contact and refuses a duplicate email", async () => {
    const { result, ws } = await run("create_contact", makeContact());
    expect(result.ok).toBe(true);
    expect(ws.contacts).toHaveLength(1);
    expect(ws.contacts[0].name).toBe("Jane Okafor");

    const duplicate = await run("create_contact", makeContact(), ws);
    expect(duplicate.result.ok).toBe(false);
    expect(duplicate.result.summary).toContain("already uses");
    expect(ws.contacts).toHaveLength(1);
  });

  it("finds a contact by email fragment and moves the stage", async () => {
    const ws = makeWorkspace();
    await run("create_contact", makeContact(), ws);
    const moved = await run("move_contact_stage", { query: "jane@northwind", stage: "negotiation" }, ws);
    expect(moved.result.ok).toBe(true);
    expect(ws.contacts[0].stage).toBe("negotiation");
    expect(ws.activities[0].type).toBe("stage_change");
  });

  it("refuses a stage move when the contact does not exist", async () => {
    const { result } = await run("move_contact_stage", { query: "nobody", stage: "won" });
    expect(result.ok).toBe(false);
  });

  it("creates a deal with a stage-derived probability", async () => {
    const { result, ws } = await run("create_deal", { title: "Renewal", value: 24000, stage: "proposal" });
    expect(result.ok).toBe(true);
    expect(ws.deals[0].probability).toBe(45);
    expect(ws.deals[0].value).toBe(24000);
  });

  it("computes a weighted forecast from live deals", async () => {
    const ws = makeWorkspace();
    await run("create_deal", { title: "A", value: 10000, stage: "proposal" }, ws);
    await run("create_deal", { title: "B", value: 20000, stage: "won" }, ws);
    const { result } = await run("pipeline_forecast", {}, ws);
    expect(result.ok).toBe(true);
    const data = result.data as { openValue: number; weightedValue: number; byStage: Array<{ stage: string }> };
    expect(data.openValue).toBe(10000);
    expect(data.weightedValue).toBe(4500);
    expect(data.byStage.map((row) => row.stage)).toContain("won");
  });

  it("logs an activity and creates a task", async () => {
    const ws = makeWorkspace();
    await run("create_contact", makeContact(), ws);
    const logged = await run("log_activity", { type: "call", title: "Pricing call", contact: "Jane" }, ws);
    expect(logged.result.ok).toBe(true);
    expect(ws.activities[0].contactId).toBe(ws.contacts[0].id);

    const task = await run("create_task", { title: "Send the proposal", priority: "high" }, ws);
    expect(task.result.ok).toBe(true);
    expect(ws.tasks[0].priority).toBe("high");

    const completed = await run("complete_task", { query: "proposal" }, ws);
    expect(completed.result.ok).toBe(true);
    expect(ws.tasks[0].done).toBe(true);
  });
});

describe("marketing tools", () => {
  it("scores an SEO audit deterministically", async () => {
    const { result, ws } = await run("run_seo_audit", {
      url: "https://example.com/pricing",
      title: "FriendConnect pricing — plans for every consultancy",
      description:
        "Transparent pricing for consultancies, education agencies and community teams. Compare the Solo, Team and Scale plans and start in minutes.",
      keywords: ["pricing"],
      body: `Pricing ${"word ".repeat(140)}`,
    });
    expect(result.ok).toBe(true);
    expect(ws.seoAudits).toHaveLength(1);
    const data = result.data as { score: number; checks: Array<{ pass: boolean }> };
    expect(data.score).toBeGreaterThan(50);
    expect(data.checks).toHaveLength(8);
  });

  it("schedules a social post with hashtags stripped of #", async () => {
    const { result, ws } = await run("schedule_social_post", {
      platform: "LinkedIn",
      caption: "A bounded agent loop shipped today",
      hashtags: ["#agents", "shipping"],
      inHours: 2,
    });
    expect(result.ok).toBe(true);
    expect(ws.socialPosts[0].hashtags).toEqual(["agents", "shipping"]);
    expect(ws.socialPosts[0].status).toBe("scheduled");
  });

  it("creates an article with a slug and status", async () => {
    const { result, ws } = await run("create_article", { title: "Attribution Without Guesswork", status: "review" });
    expect(result.ok).toBe(true);
    expect(ws.articles[0].slug).toBe("attribution-without-guesswork");
    expect(ws.articles[0].status).toBe("review");
  });
});

describe("knowledge and messaging tools", () => {
  it("searches across collections", async () => {
    const ws = makeWorkspace();
    await run("create_contact", makeContact(), ws);
    await run("create_note", { title: "Northwind wants SSO", content: "Before signature." }, ws);
    const { result } = await run("search_workspace", { query: "northwind" }, ws);
    const data = result.data as { contacts: unknown[]; notes: unknown[] };
    expect(data.contacts).toHaveLength(1);
    expect(data.notes).toHaveLength(1);
  });

  it("returns a snapshot with the counts it can prove", async () => {
    const ws = makeWorkspace();
    await run("create_contact", makeContact(), ws);
    await run("create_deal", { title: "A", value: 500 }, ws);
    const { result } = await run("workspace_snapshot", {}, ws);
    const data = result.data as { contacts: number; openDeals: number; openPipeline: number };
    expect(data.contacts).toBe(1);
    expect(data.openDeals).toBe(1);
    expect(data.openPipeline).toBe(500);
  });

  it("opens a thread and sends into it", async () => {
    const ws = makeWorkspace();
    const started = await run(
      "start_thread",
      { contactName: "Jane Okafor", channel: "whatsapp", message: "Hello" },
      ws,
    );
    expect(started.result.ok).toBe(true);
    expect(ws.threads[0].messages).toHaveLength(1);

    const sent = await run("send_message", { thread: "Jane Okafor", body: "Following up" }, ws);
    expect(sent.result.ok).toBe(true);
    expect(ws.threads[0].messages).toHaveLength(2);
  });

  it("drafts an email from the CRM record without inventing a company", async () => {
    const ws = makeWorkspace();
    await run("create_contact", makeContact({ company: "Northwind" }), ws);
    const { result } = await run("draft_outreach_email", { contact: "jane", goal: "book a call" }, ws);
    const data = result.data as { to: string; subject: string; body: string };
    expect(data.to).toBe("jane@northwind.dev");
    expect(data.body).toContain("Northwind");
    expect(data.subject).toContain("Northwind");
  });
});
