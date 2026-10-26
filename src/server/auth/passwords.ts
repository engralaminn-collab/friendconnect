/**
 * Password hashing with scrypt (RFC 7914), a recognised memory-hard KDF built
 * into Node.js — no native dependencies. Format: `scrypt$N$r$p$saltB64$hashB64`.
 */
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) =>
      err ? reject(err) : resolve(derived as Buffer),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const derived = await scryptAsync(password, salt, KEY_LEN, {
    N,
    r: R,
    p: P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  const expected = Buffer.from(hashB64, "base64");
  let derived: Buffer;
  try {
    derived = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length, {
      N: n,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
