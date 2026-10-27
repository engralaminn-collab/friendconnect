import { describe, expect, it } from "vitest";
import { planOffline } from "@/lib/agent/offline";
import { getTool } from "@/lib/agent/registry";
import { validateArgs } from "@/lib/agent/schema";

function plan(task: string) {
  const decision = planOffline(task);
  return decision.toolCalls;
}

describe("offline grammar — newer surfaces", () => {
  it("plans a student, an event, a feed post and a call", () => {
    expect(plan("add student Amara Okoye amara@example.com")[0]).toMatchObject({
      name: "create_student",
      args: { name: "Amara Okoye", email: "amara@example.com" },
    });
    expect(plan("schedule webinar: Visa routes for Nigerian applicants")[0]).toMatchObject({
      name: "create_event",
      args: { title: "Visa routes for Nigerian applicants", type: "webinar" },
    });
    expect(plan("post to the feed: We shipped the operator today")[0]).toMatchObject({
      name: "create_post",
      args: { body: "We shipped the operator today" },
    });
    expect(plan("log a call with Jane Okafor for 12 minutes")[0]).toMatchObject({
      name: "log_call",
      args: { contactName: "Jane Okafor", durationSec: 720 },
    });
  });

  it("plans gateway, kid-safe, notifications and a diagram", () => {
    expect(plan("connect gateway HTTP SMS")[0]).toMatchObject({
      name: "update_gateway",
      args: { query: "HTTP SMS", connected: true },
    });
    expect(plan("disconnect gateway http sms")[0]).toMatchObject({
      name: "update_gateway",
      args: { connected: false },
    });
    expect(plan("turn kid safe on")[0]).toMatchObject({ name: "set_kid_safe", args: { on: true } });
    expect(plan("mark notifications read")[0]).toMatchObject({ name: "mark_notifications_read" });
    expect(
      plan("create a diagram Enquiry to enrolment: Enquiry, Counselling, Application, Offer, Visa")[0],
    ).toMatchObject({
      name: "save_diagram",
      args: { steps: ["Enquiry", "Counselling", "Application", "Offer", "Visa"] },
    });
  });

  it("every offline plan passes the registry's own validation", () => {
    const tasks = [
      "add student Amara Okoye amara@example.com",
      "schedule webinar: Visa routes for Nigerian applicants",
      "post to the feed: We shipped the operator today",
      "log a call with Jane Okafor for 12 minutes",
      "connect gateway HTTP SMS",
      "turn kid safe off",
      "mark notifications read",
      "create a diagram Enquiry to enrolment: Enquiry, Counselling, Application",
    ];
    for (const task of tasks) {
      for (const call of plan(task)) {
        const tool = getTool(call.name);
        expect(tool, `tool for ${task}`).toBeTruthy();
        const validation = validateArgs(tool!.schema, call.args);
        expect(validation.ok, `${task} → ${call.name}: ${validation.errors.join("; ")}`).toBe(true);
      }
    }
  });
});
