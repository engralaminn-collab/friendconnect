import { describe, it, expect } from "vitest";
import { REALTIME_EVENTS as CLIENT_EVENTS } from "@/lib/realtime/events";
import { REALTIME_EVENTS as SERVER_EVENTS } from "@/server/realtime/publisher";

describe("09 · realtime event contract (client ↔ server)", () => {
  it("exposes every event the server publishes under the same wire name", () => {
    for (const [key, value] of Object.entries(SERVER_EVENTS)) {
      expect((CLIENT_EVENTS as Record<string, string>)[key], `missing client event ${key}`).toBe(value);
    }
  });

  it("has no client-only event names unknown to the server", () => {
    const serverValues = new Set(Object.values(SERVER_EVENTS));
    for (const value of Object.values(CLIENT_EVENTS)) {
      expect(serverValues.has(value)).toBe(true);
    }
  });

  it("covers the full messaging lifecycle", () => {
    const required = [
      "messageNew",
      "messageUpdate",
      "messageDelete",
      "messageReceipt",
      "typing",
      "presence",
      "conversationNew",
      "notification",
      "callIncoming",
      "callSdp",
      "callIce",
      "callHangup",
    ];
    for (const key of required) {
      expect(CLIENT_EVENTS).toHaveProperty(key);
    }
  });
});
