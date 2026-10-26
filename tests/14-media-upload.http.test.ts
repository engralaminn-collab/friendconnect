import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { createJar, registerFresh, createDirectConversation } from "./helpers/http";

const up = await (await import("./helpers/http")).serverIsUp();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe.skipIf(!up)("14 · private media upload & authorization", () => {
  it("uploads real bytes, sniffs the kind and serves them back byte-identical", async () => {
    const owner = createJar();
    await registerFresh(owner, "media-owner");
    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), "pixel.png");
    const upRes = await owner.req("/api/media/upload", { method: "POST", body: form });
    expect(upRes.status).toBe(201);
    const uploaded = await upRes.json();
    expect(uploaded.data.media.kind).toBe("image");
    const url = uploaded.data.media.url as string;
    expect(url.startsWith("/api/media/")).toBe(true);

    const dl = await owner.req(url);
    const bytes = Buffer.from(await dl.arrayBuffer());
    expect(dl.status).toBe(200);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      createHash("sha256").update(PNG).digest("hex"),
    );
  });

  it("rejects content that fails magic-byte sniffing with 415", async () => {
    const owner = createJar();
    await registerFresh(owner, "media-bad");
    const form = new FormData();
    form.append(
      "file",
      new Blob([Buffer.from(Array.from({ length: 48 }, () => Math.floor(Math.random() * 256)))], {
        type: "application/octet-stream",
      }),
      "garbage.bin",
    );
    const res = await owner.req("/api/media/upload", { method: "POST", body: form });
    expect(res.status).toBe(415);
  });

  it("blocks outsiders from media shared inside a conversation they don't belong to", async () => {
    const alice = createJar();
    const bob = createJar();
    const mallory = createJar();
    await registerFresh(alice, "media-a");
    const b = await registerFresh(bob, "media-b2");
    await registerFresh(mallory, "media-m");
    const conv = await createDirectConversation(alice, b.id);

    const form = new FormData();
    form.append("file", new Blob([PNG], { type: "image/png" }), "secret.png");
    const upRes = await alice.req("/api/media/upload", { method: "POST", body: form });
    const mediaId = (await upRes.json()).data.media.id as string;
    await alice.json(`/api/conversations/${conv.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaIds: [mediaId], clientNonce: `m_${Date.now()}` }),
    });

    const member = await bob.req(`/api/media/${mediaId}`);
    expect([200, 307]).toContain(member.status);
    const outsider = await mallory.req(`/api/media/${mediaId}`);
    expect(outsider.status).toBe(403);
  });
});
