import { describe, it, expect, beforeEach } from "vitest";
import { consume, resetForTests } from "@/server/auth/ratelimit";

describe("05 · rate limiting", () => {
  beforeEach(async () => {
    await resetForTests();
  });

  it("allows requests up to the budget and throws 429 beyond it", async () => {
    const id = `unit-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      await expect(consume("test-bucket", id, 3)).resolves.toBeUndefined();
    }
    await expect(consume("test-bucket", id, 3)).rejects.toMatchObject({ status: 429 });
  });

  it("keeps identifiers isolated from each other", async () => {
    await consume("iso-bucket", "user-a", 1);
    await expect(consume("iso-bucket", "user-a", 1)).rejects.toMatchObject({ status: 429 });
    await expect(consume("iso-bucket", "user-b", 1)).resolves.toBeUndefined();
  });

  it("resets cleanly so later test runs start fresh", async () => {
    await consume("reset-bucket", "user", 1);
    await resetForTests();
    await expect(consume("reset-bucket", "user", 1)).resolves.toBeUndefined();
  });
});
