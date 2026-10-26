import { describe, expect, it } from "vitest";
import { offlineDecide, planOffline, summarizeToolTurns } from "@/lib/agent/offline";
import { getTool } from "@/lib/agent/registry";

function only(task: string) {
  const decision = planOffline(task);
  expect(decision.toolCalls.length).toBe(1);
  const [call] = decision.toolCalls;
  expect(getTool(call.name)).toBeDefined();
  return call;
}

describe("offline planner", () => {
  it("parses a contact with an email and a company", () => {
    const call = only("add contact Jane Okafor at Northwind, jane@northwind.dev");
    expect(call.name).toBe("create_contact");
    expect(call.args.email).toBe("jane@northwind.dev");
    expect(call.args.name).toBe("Jane Okafor");
    expect(String(call.args.company)).toContain("Northwind");
  });

  it("asks for an email instead of inventing one", () => {
    const decision = planOffline("add contact Jane Okafor");
    expect(decision.toolCalls).toHaveLength(0);
    expect(decision.content).toContain("email");
  });

  it("parses a deal value with a currency symbol and a stage", () => {
    const call = only("create deal Renewal worth £24,000 at proposal");
    expect(call.name).toBe("create_deal");
    expect(call.args.value).toBe(24000);
    expect(call.args.stage).toBe("proposal");
    expect(String(call.args.title).toLowerCase()).toContain("renewal");
  });

  it("parses a stage move into the stage enum the store expects", () => {
    const call = only("move Jane Okafor to negotiation");
    expect(call.name).toBe("move_contact_stage");
    expect(call.args.stage).toBe("negotiation");
    expect(call.args.query).toBe("Jane Okafor");
  });

  it("parses tasks, reminders and priorities", () => {
    expect(only("add task Chase the DPA signature, priority high").args.priority).toBe("high");
    expect(only("remind me to send the offer letter").name).toBe("create_task");
    expect(only("todo: book the visa appointment").args.title).toBe("book the visa appointment");
  });

  it("parses notes, activity logs and messages", () => {
    expect(only("note: Northwind wants SSO before signature").name).toBe("create_note");
    const log = only("log call with Jane Okafor: talked through pricing");
    expect(log.name).toBe("log_activity");
    expect(log.args.type).toBe("call");
    const send = only("send message to Jane Okafor: sending the proposal now");
    expect(send.name).toBe("send_message");
    expect(send.args.body).toBe("sending the proposal now");
  });

  it("parses a social post with hashtags", () => {
    const call = only("post to LinkedIn: We shipped a bounded agent loop #agents");
    expect(call.name).toBe("schedule_social_post");
    expect(call.args.platform).toBe("LinkedIn");
    expect(call.args.hashtags).toEqual(["agents"]);
  });

  it("parses an audit and supplies a title", () => {
    const call = only("audit https://example.com/pricing");
    expect(call.name).toBe("run_seo_audit");
    expect(call.args.url).toBe("https://example.com/pricing");
    expect(String(call.args.title).length).toBeGreaterThan(3);
  });

  it("routes list and status requests to reads", () => {
    expect(only("status").name).toBe("workspace_snapshot");
    expect(only("pipeline forecast").name).toBe("pipeline_forecast");
    expect(only("list unread threads").name).toBe("list_threads");
    expect(only("list students").name).toBe("list_students");
  });

  it("falls back to a workspace search instead of hallucinating an action", () => {
    const call = only("quantum flux capacitor");
    expect(call.name).toBe("search_workspace");
    expect(call.args.query).toBe("quantum flux capacitor");
  });

  it("answers help with the real grammar", () => {
    const decision = planOffline("help");
    expect(decision.toolCalls).toHaveLength(0);
    expect(decision.content).toContain("add contact");
    expect(decision.content).toContain("Providers");
  });
});

describe("offline responder", () => {
  it("summarises a single tool result", () => {
    const text = summarizeToolTurns([
      { role: "user", content: "add a task" },
      { role: "tool", name: "create_task", content: "Task created: X.\n{}" },
    ]);
    expect(text).toContain("Done.");
    expect(text).toContain("Task created");
  });

  it("summarises several steps in order", () => {
    const text = summarizeToolTurns([
      { role: "tool", name: "create_contact", content: "Created Jane." },
      { role: "tool", name: "create_deal", content: "Created Renewal." },
    ]);
    expect(text).toContain("2 steps");
    expect(text).toContain("create_contact");
    expect(text).toContain("create_deal");
  });

  it("does not re-plan once a tool has returned", () => {
    const decision = offlineDecide([
      { role: "user", content: "status" },
      { role: "assistant", content: "", toolCalls: [{ id: "1", name: "workspace_snapshot", args: {} }] },
      { role: "tool", name: "workspace_snapshot", content: "12 contacts." },
    ]);
    expect(decision.toolCalls).toHaveLength(0);
    expect(decision.content).toContain("12 contacts");
  });
});
