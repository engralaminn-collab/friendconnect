/**
 * Opaque token generation and hashing. Raw tokens travel only inside
 * HttpOnly cookies or one-time email links; only their SHA-256 hashes are
 * stored, so a database leak cannot replay sessions.
 */
import { createHash, randomBytes } from "node:crypto";

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a 36-char UUID. The optional prefix argument is accepted for
 * readability at call sites but intentionally not embedded: all id columns
 * are varchar(36), and prefixes would overflow them.
 */
export function newId(_prefix = ""): string {
  return cryptoRandomUuid();
}

export function cryptoRandomUuid(): string {
  return randomBytes(16).toString("hex").replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    "$1-$2-$3-$4-$5",
  );
}
