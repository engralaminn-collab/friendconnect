import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/server/services/auth.service";
import { sendMessageSchema, reactionSchema, reportSchema } from "@/server/services/messages.service";

describe("03 · Zod input validation", () => {
  it("accepts a well-formed registration", () => {
    const parsed = registerSchema.parse({
      email: "ada@example.com",
      password: "Password123!",
      displayName: "Ada Lovelace",
    });
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects invalid emails, short passwords and empty names", () => {
    expect(registerSchema.safeParse({ email: "nope", password: "Password123!", displayName: "X" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "a@b.co", password: "short", displayName: "X" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "a@b.co", password: "Password123!", displayName: "" }).success).toBe(false);
  });

  it("login requires both credentials", () => {
    expect(loginSchema.safeParse({ email: "a@b.co" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "Password123!" }).success).toBe(true);
  });

  it("message schema defaults to text and enforces limits", () => {
    const base = sendMessageSchema.parse({});
    expect(base.kind).toBe("text");
    expect(base.body).toBe("");
    expect(
      sendMessageSchema.safeParse({ body: "x".repeat(8001) }).success,
    ).toBe(false);
  });

  it("validates structured location and contact-card payloads", () => {
    const loc = sendMessageSchema.parse({
      kind: "location",
      location: { lat: 23.81, lng: 90.41, address: "Dhaka" },
    });
    expect(loc.location?.lat).toBe(23.81);
    expect(
      sendMessageSchema.safeParse({ kind: "location", location: { lat: 200, lng: 0 } }).success,
    ).toBe(false);
    const card = sendMessageSchema.parse({
      kind: "contact",
      contactCard: { name: "Bob", phone: "+8801700000000" },
    });
    expect(card.contactCard?.name).toBe("Bob");
  });

  it("polls need 2–10 non-empty options", () => {
    expect(
      sendMessageSchema.safeParse({ poll: { question: "Q", options: ["one"] } }).success,
    ).toBe(false);
    expect(
      sendMessageSchema.safeParse({ poll: { question: "Q", options: ["a", "b"] } }).success,
    ).toBe(true);
  });

  it("reactions reject control characters; reports need a real reason", () => {
    expect(reactionSchema.safeParse({ emoji: "👍" }).success).toBe(true);
    expect(reactionSchema.safeParse({ emoji: "x\u0000" }).success).toBe(false);
    expect(reportSchema.safeParse({ reason: "x" }).success).toBe(false);
    expect(reportSchema.safeParse({ reason: "spam", detail: "repeated links" }).success).toBe(true);
  });
});
