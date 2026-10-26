import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/passwords";

describe("01 · password hashing (scrypt)", () => {
  it("hashes into the documented scrypt envelope", async () => {
    const hash = await hashPassword("Password123!");
    const parts = hash.split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    expect(parts[1]).toBe("16384");
  });

  it("verifies the correct password and rejects wrong ones", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("never stores the plaintext and produces unique salts", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toContain("same-input");
    expect(a).not.toBe(b);
  });

  it("fails safely on malformed/empty stored hashes", async () => {
    await expect(verifyPassword("x", null)).resolves.toBe(false);
    await expect(verifyPassword("x", "not-a-valid-hash")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$1$1$1$bad$$$")).resolves.toBe(false);
  });
});
