import { describe, it, expect } from "vitest";
import { createJar, registerFresh } from "./helpers/http";

const up = await (await import("./helpers/http")).serverIsUp();

describe.skipIf(!up)("18 · workspace document store", () => {
  const collection = `vt-notes-${Date.now()}`;

  it("upserts, lists and deletes scoped records", async () => {
    const jar = createJar();
    await registerFresh(jar, "ws");

    const upsert = await jar.json(`/api/workspace/${collection}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recordId: "rec-1", data: { title: "First", order: 1 } }),
    });
    expect([200, 201]).toContain(upsert.status);

    await jar.json(`/api/workspace/${collection}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ records: [{ recordId: "rec-2", data: { title: "Second" } }] }),
    });

    const list = await jar.json(`/api/workspace/${collection}`);
    expect(list.status).toBe(200);
    const ids = list.body.data.records.map((r: { recordId: string }) => r.recordId).sort();
    expect(ids).toEqual(["rec-1", "rec-2"]);

    const del = await jar.json(`/api/workspace/${collection}?recordId=rec-1`, { method: "DELETE" });
    expect(del.body.data.deleted).toBe(true);
    const after = await jar.json(`/api/workspace/${collection}`);
    expect(after.body.data.records.map((r: { recordId: string }) => r.recordId)).toEqual(["rec-2"]);
  });

  it("isolates collections per user", async () => {
    const a = createJar();
    const b = createJar();
    await registerFresh(a, "ws-a");
    await registerFresh(b, "ws-b");
    await a.json(`/api/workspace/${collection}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recordId: "owned-by-a", data: { secret: true } }),
    });
    const listB = await b.json(`/api/workspace/${collection}`);
    expect(listB.body.data.records.some((r: { recordId: string }) => r.recordId === "owned-by-a")).toBe(false);
  });

  it("exports the caller's workspace without leaking other users' rows", async () => {
    const jar = createJar();
    await registerFresh(jar, "ws-export");
    const exported = await jar.json("/api/workspace/export");
    expect(exported.status).toBe(200);
    expect(exported.body.data).toHaveProperty("collections");
    expect(typeof exported.body.data.exportedAt).toBe("string");
    // User B's export must never contain user A's record id.
    const b = createJar();
    await registerFresh(b, "ws-export-b");
    const exportB = await b.json("/api/workspace/export");
    expect(JSON.stringify(exportB.body.data.collections)).not.toContain("owned-by-a");
    const anon = createJar();
    expect((await anon.json("/api/workspace/export")).status).toBe(401);
  });
});
