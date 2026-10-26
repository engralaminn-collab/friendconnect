/**
 * Session cookie configuration and helpers. Cookies are HttpOnly, SameSite=Lax
 * by default and Secure in production.
 */
import type { NextResponse } from "next/server";
import { env } from "../config/env";

export function cookieSecure(): boolean {
  if (env.COOKIE_SECURE === "true") return true;
  if (env.COOKIE_SECURE === "false") return false;
  return env.NODE_ENV === "production";
}

export function sessionCookieName(): string {
  return env.COOKIE_NAME;
}

export function sessionCookieOptions(maxAgeSec?: number) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: env.COOKIE_SAMESITE as "lax" | "strict" | "none",
    path: "/",
    ...(maxAgeSec ? { maxAge: maxAgeSec } : {}),
  };
}

export function setSessionCookie(res: NextResponse, rawToken: string, ttlSec: number) {
  res.cookies.set(sessionCookieName(), rawToken, {
    ...sessionCookieOptions(ttlSec),
    expires: new Date(Date.now() + ttlSec * 1000),
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(sessionCookieName(), "", {
    ...sessionCookieOptions(0),
    expires: new Date(0),
  });
}

/** Parse a raw Cookie header into a map (used by the Socket.IO handshake). */
export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}
