import { describe, it, expect } from "vitest";
import { createJar, registerFresh, createDirectConversation } from "./helpers/http";

const up = await (await import("./helpers/http")).serverIsUp();

describe.skipIf(!up)("19 · notifications", () => {
  it("requires authentication", async () => {
    const anon = createJar();
    expect((await anon.json("/api/notifications")).status).toBe(401);
  });

  it("creates a notification for the recipient of a new message and supports read state", async () => {
    const alice = createJar();
    const bob = createJar();
    await registerFresh(alice, "ntf-a");
    const b = await registerFresh(bob, "ntf-b");
    const conv = await createDirectConversation(alice, b.id);

    const before = await bob.json("/api/notifications");
    expect(before.status).toBe(200);
    expect(Array.isArray(before.body.data.notifications)).toBe(true);

    await alice.json(`/api/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "you have a notification", clientNonce: `ntf_${Date.now()}` }),
    });

    const after = await bob.json("/api/notifications");
    const mine = after.body.data.notifications as Array<{
      id: string;
      readAt: string | null;
      kind: string;
      body: string;
    }>;
    const target = mine.find((n: { body: string }) => n.body.includes("you have a notification"));
    expect(target).toBeTruthy();
    expect(target?.readAt).toBeNull();
    expect(target?.kind).toBe("message");

    const marked = await bob.json(`/api/notifications/${target!.id}/read`, { method: "POST" });
    expect(marked.status).toBe(200);
    const reread = await bob.json("/api/notifications");
    const updated = reread.body.data.notifications.find(
      (n: { id: string }) => n.id === target!.id,
    );
    expect(updated.readAt).toBeTruthy();
  });

  it("marks all notifications read in one call", async () => {
    const jar = createJar();
    await registerFresh(jar, "ntf-all");
    const res = await jar.json("/api/notifications", { method: "POST" });
    expect(res.status).toBe(200);
    expect(res.body.data.allRead).toBe(true);
  });
});
