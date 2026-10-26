import { describe, it, expect } from "vitest";
import { createJar, registerFresh } from "./helpers/http";

const up = await (await import("./helpers/http")).serverIsUp();

describe.skipIf(!up)("20 · legacy workspace migration endpoint", () => {
  const stamp = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  it("imports legacy threads/contacts/workspace and is idempotent on replay", async () => {
    const jar = createJar();
    await registerFresh(jar, "mig");

    const payload = () => ({
      threads: [
        {
          id: stamp(),
          contactName: "Legacy Chat",
          messages: [{ id: stamp(), body: "old" }],
        },
      ],
      contacts: [{ id: stamp(), name: "Legacy Contact", email: "legacy@example.com" }],
      workspace: {
        "kb-notes": [{ recordId: stamp(), data: { title: "old note" } }],
      },
    });

    const first = await jar.json("/api/migrate/local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    });
    expect(first.status).toBe(200);
    expect(first.body.ok).toBe(true);
    expect(first.body.data.skipped).toBe(false);
    expect(first.body.data.summary).toBeTruthy();

    // Same payload again: server-side idempotency marker reports skipped.
    const replay = await jar.json("/api/migrate/local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    });
    expect(replay.body.data.skipped).toBe(true);
  });

  it("rejects unauthenticated imports", async () => {
    const anon = createJar();
    const res = await anon.json("/api/migrate/local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threads: [], contacts: [] }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects malformed payloads with 400-class validation errors", async () => {
    const jar = createJar();
    await registerFresh(jar, "mig-bad");
    const res = await jar.json("/api/migrate/local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threads: "not-an-array" }),
    });
    expect([400, 422]).toContain(res.status);
  });
});
