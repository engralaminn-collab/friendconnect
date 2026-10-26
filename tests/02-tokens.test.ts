import { describe, it, expect } from "vitest";
import {
  newId,
  generateOpaqueToken,
  hashToken,
  cryptoRandomUuid,
} from "@/server/auth/tokens";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("02 · token & id generation", () => {
  it("newId always returns a plain 36-char UUID regardless of prefix argument", () => {
    expect(newId()).toMatch(UUID_RE);
    expect(newId("msg")).toMatch(UUID_RE);
    expect(newId("msg")).toHaveLength(36);
    expect(newId("msg").startsWith("msg")).toBe(false);
  });

  it("cryptoRandomUuid is RFC-4122 shaped and unique", () => {
    const ids = new Set(Array.from({ length: 200 }, () => cryptoRandomUuid()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(UUID_RE);
  });

  it("opaque tokens are high-entropy and hashes are deterministic SHA-256 hex", () => {
    const token = generateOpaqueToken();
    expect(token.length).toBeGreaterThan(40);
    const h1 = hashToken(token);
    const h2 = hashToken(token);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).not.toBe(hashToken(generateOpaqueToken()));
  });
});
