/**
 * Server-side session lifecycle. Sessions are opaque random tokens; only their
 * SHA-256 hashes are stored. Every protected request derives its identity from
 * the validated session — never from a user id sent by the browser.
 */
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../db/client";
import { sessions, users, profiles, type UserRow } from "../db/schema";
import { env } from "../config/env";
import { generateOpaqueToken, hashToken, newId } from "./tokens";
import { sessionCookieName } from "./cookies";
import { ApiError, unauthorized } from "../http/errors";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  handle: string | null;
  status: string;
  emailVerifiedAt: Date | null;
  avatarMediaId: string | null;
}

export interface SessionMeta {
  ip?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
}

function ttlSec(): number {
  return env.SESSION_TTL_DAYS * 86_400;
}

export async function createSession(
  userId: string,
  meta: SessionMeta = {},
): Promise<{ rawToken: string; tokenHash: string; expiresAt: Date; sessionId: string }> {
  const rawToken = generateOpaqueToken(32);
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSec() * 1000);
  const sessionId = newId();
  await getDb().insert(sessions).values({
    id: sessionId,
    userId,
    tokenHash,
    ip: meta.ip ?? undefined,
    userAgent: meta.userAgent ? meta.userAgent.slice(0, 300) : undefined,
    deviceId: meta.deviceId ?? undefined,
    expiresAt,
    lastSeenAt: now,
    createdAt: now,
  });
  return { rawToken, tokenHash, expiresAt, sessionId };
}

interface ResolvedSession {
  user: AuthUser;
  sessionId: string;
}

async function resolveRawToken(rawToken: string): Promise<ResolvedSession | null> {
  const tokenHash = hashToken(rawToken);
  const db = getDb();
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
      user: users,
      avatarMediaId: profiles.avatarMediaId,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  if (row.user.status !== "active" || row.user.deletedAt) return null;

  // Rolling expiry: extend the session on activity.
  const newExpiry = new Date(Date.now() + ttlSec() * 1000);
  await db
    .update(sessions)
    .set({ lastSeenAt: new Date(), expiresAt: newExpiry })
    .where(eq(sessions.id, row.sessionId));

  return {
    sessionId: row.sessionId,
    user: toAuthUser(row.user, row.avatarMediaId ?? null),
  };
}

function toAuthUser(u: UserRow, avatarMediaId: string | null): AuthUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    handle: u.handle,
    status: u.status,
    emailVerifiedAt: u.emailVerifiedAt,
    avatarMediaId,
  };
}

/** Resolve the current user from the session cookie in a Route Handler. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // Dynamic import keeps `next/headers` (and its AsyncLocalStorage) out of the
  // Socket.IO custom-server startup graph; it only loads inside a Next request.
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (!token) return null;
  return (await resolveRawToken(token))?.user ?? null;
}

/** Like getCurrentUser but throws 401 when unauthenticated. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

/** Socket.IO entry point: authenticate from a raw cookie/header token. */
export async function authenticateSocketToken(
  rawToken: string | undefined,
): Promise<(ResolvedSession & { socketKey: string }) | null> {
  if (!rawToken) return null;
  const resolved = await resolveRawToken(rawToken);
  if (!resolved) return null;
  return { ...resolved, socketKey: hashToken(rawToken).slice(0, 16) };
}

export async function revokeSessionByToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await getDb()
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
}

export async function revokeSessionById(sessionId: string): Promise<void> {
  await getDb()
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string) {
  const db = getDb();
  const q = db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  void q;
  if (exceptSessionId) {
    const { and: andOp, ne } = await import("drizzle-orm");
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        andOp(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          ne(sessions.id, exceptSessionId),
        ),
      );
    return;
  }
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

export async function listUserSessions(userId: string) {
  return getDb()
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .orderBy(sessions.lastSeenAt);
}

export function assertUser(user: AuthUser | null): AuthUser {
  if (!user) throw new ApiError(401, "unauthorized", "Authentication required");
  return user;
}
