import { describe, it, expect } from "vitest";
import { createJar, registerFresh, createDirectConversation } from "./helpers/http";

const up = await (await import("./helpers/http")).serverIsUp();

describe.skipIf(!up)("13 · conversations & messages over HTTP", () => {
  it("creates a conversation and exchanges persisted messages", async () => {
    const alice = createJar();
    const bob = createJar();
    const a = await registerFresh(alice, "cm-a");
    const b = await registerFresh(bob, "cm-b");
    const conv = await createDirectConversation(alice, b.id);

    const sent = await alice.json(`/api/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "persisted hello", clientNonce: `n_${Date.now()}_a` }),
    });
    expect(sent.status).toBe(201);
    const messageId = sent.body.data.message.id;
    expect(messageId).toMatch(/^[0-9a-f-]{36}$/);

    const list = await bob.json(`/api/conversations/${conv.id}/messages?limit=10`);
    expect(list.body.data.items.some((m: { id: string }) => m.id === messageId)).toBe(true);
    expect(a.id).not.toBe(b.id);
  });

  it("is idempotent under clientNonce replay", async () => {
    const alice = createJar();
    const bob = createJar();
    await registerFresh(alice, "idem-a");
    const b = await registerFresh(bob, "idem-b");
    const conv = await createDirectConversation(alice, b.id);
    const nonce = `idem_${Date.now()}`;
    const payload = JSON.stringify({ body: "replay me", clientNonce: nonce });
    const first = await alice.json(`/api/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });
    const second = await alice.json(`/api/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });
    expect(second.body.data.message.id).toBe(first.body.data.message.id);
  });

  it("enforces edit authorization (sender allowed, other member 403)", async () => {
    const alice = createJar();
    const bob = createJar();
    await registerFresh(alice, "edit-a");
    const b = await registerFresh(bob, "edit-b");
    const conv = await createDirectConversation(alice, b.id);
    const msg = await alice.json(`/api/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "original", clientNonce: `e_${Date.now()}` }),
    });
    const id = msg.body.data.message.id;
    const forbidden = await bob.json(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "hijacked" }),
    });
    expect(forbidden.status).toBe(403);
    const allowed = await alice.json(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "edited text" }),
    });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.message.body).toBe("edited text");
    expect(allowed.body.data.message.edited).toBe(true);
  });

  it("hides conversations from outsiders with 404", async () => {
    const alice = createJar();
    const bob = createJar();
    const mallory = createJar();
    await registerFresh(alice, "out-a");
    const b = await registerFresh(bob, "out-b");
    await registerFresh(mallory, "out-m");
    const conv = await createDirectConversation(alice, b.id);
    const res = await mallory.json(`/api/conversations/${conv.id}`);
    expect([403, 404]).toContain(res.status);
  });

  it("records read receipts and resets unread counts", async () => {
    const alice = createJar();
    const bob = createJar();
    await registerFresh(alice, "rr-a");
    const b = await registerFresh(bob, "rr-b");
    const conv = await createDirectConversation(alice, b.id);
    await alice.json(`/api/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "read me", clientNonce: `r_${Date.now()}` }),
    });
    const read = await bob.json(`/api/conversations/${conv.id}/read`, { method: "POST" });
    expect(read.status).toBe(200);
    const conversations = await bob.json("/api/conversations");
    const mine = conversations.body.data.conversations.find(
      (c: { id: string }) => c.id === conv.id,
    );
    expect(mine.unreadCount).toBe(0);
  });
});
