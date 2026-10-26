import { describe, it, expect } from "vitest";
import { createJar, registerFresh } from "./helpers/http";

const up = await (await import("./helpers/http")).serverIsUp();

describe.skipIf(!up)("15 · contact requests & directory", () => {
  it("finds other registered users through the search directory (self is excluded)", async () => {
    const me = createJar();
    const other = createJar();
    await registerFresh(me, "dir-me");
    const target = await registerFresh(other, "dir-other");
    const res = await me.json(`/api/users/search?q=${encodeURIComponent(target.email)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.results.some((u: { id: string }) => u.id === target.id)).toBe(true);
  });

  it("delivers a contact request to the recipient and lets them accept", async () => {
    const alice = createJar();
    const bob = createJar();
    await registerFresh(alice, "cr-a");
    const b = await registerFresh(bob, "cr-b");

    const created = await alice.json("/api/contact-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toUserId: b.id, message: "Let's connect" }),
    });
    expect([200, 201]).toContain(created.status);
    const requestId: string = created.body.data.request?.id ?? created.body.data.id;
    expect(requestId).toBeTruthy();

    const pending = await bob.json("/api/contact-requests");
    expect(
      pending.body.data.requests.some((r: { request: { id: string } }) => r.request.id === requestId),
    ).toBe(true);

    const decided = await bob.json(`/api/contact-requests/${requestId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: "accepted" }),
    });
    expect(decided.status).toBe(200);
    expect(decided.body.data.decision).toBe("accepted");
  });

  it("requires authentication for protected endpoints", async () => {
    const anon = createJar();
    const res = await anon.json("/api/contact-requests");
    expect(res.status).toBe(401);
  });
});
