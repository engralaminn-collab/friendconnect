/**
 * Authentication and account-management business logic.
 * Local email/password flow; external providers are represented by
 * auth_identities and can be added without changing the session model.
 */
import { and, eq, isNull, gt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import {
  users,
  profiles,
  sessions,
  verificationTokens,
  passwordResetTokens,
  userPreferences,
} from "../db/schema";
import { hashPassword, verifyPassword } from "../auth/passwords";
import { generateOpaqueToken, hashToken, newId } from "../auth/tokens";
import { createSession, revokeSessionByToken, type SessionMeta } from "../auth/session";
import { recordAudit } from "../auth/audit";
import { env } from "../config/env";
import { ApiError, conflict, forbidden, notFound, unauthorized } from "../http/errors";
import { sendEmail } from "./email.service";

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  displayName: z.string().min(1).max(120),
  handle: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Handle may only contain letters, numbers, . _ -")
    .optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

const PUBLIC_USER = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  handle: users.handle,
  status: users.status,
  emailVerifiedAt: users.emailVerifiedAt,
  createdAt: users.createdAt,
};

async function issueEmailVerification(userId: string, email: string) {
  const token = generateOpaqueToken(24);
  await getDb().insert(verificationTokens).values({
    id: newId(),
    userId,
    purpose: "email_verify",
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.EMAIL_VERIFY_TTL_HOURS * 3600_000),
  });
  const url = `${env.APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify your FriendConnect email",
    text: `Welcome to FriendConnect. Confirm your email: ${url}`,
  });
  return token;
}

export async function register(input: RegisterInput, meta: SessionMeta) {
  const email = input.email.toLowerCase().trim();
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    // Do not disclose whether the email is registered.
    throw conflict("The account could not be created with the provided details.");
  }
  if (input.handle) {
    const handleTaken = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.handle, input.handle))
      .limit(1);
    if (handleTaken.length) throw conflict("That handle is already taken.");
  }
  const userId = newId("usr");
  const now = new Date();
  const passwordHash = await hashPassword(input.password);
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      email,
      handle: input.handle ?? null,
      displayName: input.displayName.trim(),
      passwordHash,
      status: "active",
      failedLoginCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(profiles).values({ userId, updatedAt: now });
    await tx.insert(userPreferences).values({
      userId,
      preferences: { theme: "dark", notifications: true },
      updatedAt: now,
    });
  });
  const verifyToken = await issueEmailVerification(userId, email).catch(() => null);
  await recordAudit({
    actorId: userId,
    action: "auth.register",
    resourceType: "user",
    resourceId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  const session = await createSession(userId, meta);
  return { userId, session, verifyToken };
}

export async function login(input: LoginInput, meta: SessionMeta) {
  const email = input.email.toLowerCase().trim();
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  // Constant-ish path: always run a hash comparison to reduce user enumeration.
  const valid = await verifyPassword(
    input.password,
    user?.passwordHash ?? "$scrypt$dummy$placeholder$AAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAA",
  );
  if (!user || !valid || user.status !== "active" || user.deletedAt) {
    if (user) {
      const count = user.failedLoginCount + 1;
      const lockedUntil =
        count >= env.AUTH_LOCK_THRESHOLD
          ? new Date(Date.now() + env.AUTH_LOCK_WINDOW_MIN * 60_000)
          : user.lockedUntil;
      await db
        .update(users)
        .set({ failedLoginCount: count, lockedUntil, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
    await recordAudit({
      actorId: user?.id,
      action: "auth.login_failed",
      resourceType: "user",
      resourceId: user?.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    throw unauthorized("Invalid email or password.");
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new ApiError(423, "locked", "Account temporarily locked. Try again later.");
  }
  await db
    .update(users)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  const session = await createSession(user.id, meta);
  await recordAudit({
    actorId: user.id,
    action: "auth.login",
    resourceType: "user",
    resourceId: user.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { user: await publicUser(user.id), session };
}

export async function logout(rawToken: string | undefined, meta: SessionMeta) {
  if (!rawToken) return;
  const hash = hashToken(rawToken);
  const row = await getDb()
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(eq(sessions.tokenHash, hash))
    .limit(1);
  await revokeSessionByToken(rawToken);
  if (row[0]) {
    await recordAudit({
      actorId: row[0].userId,
      action: "auth.logout",
      resourceType: "session",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }
}

export async function publicUser(userId: string) {
  const rows = await getDb()
    .select(PUBLIC_USER)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user) throw notFound("User not found");
  const profile = await getDb()
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return { ...user, profile: profile[0] ?? null };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const db = getDb();
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]?.passwordHash) throw badCredential();
  const ok = await verifyPassword(currentPassword, user[0].passwordHash);
  if (!ok) throw badCredential();
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await recordAudit({ actorId: userId, action: "auth.password_change", resourceType: "user" });
}

function badCredential() {
  return new ApiError(400, "bad_credentials", "Current password is incorrect.");
}

export async function requestPasswordReset(email: string) {
  const normalized = email.toLowerCase().trim();
  const db = getDb();
  const user = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (!user.length) return { emailed: false }; // do not reveal account existence
  const token = generateOpaqueToken(24);
  await db.insert(passwordResetTokens).values({
    id: newId(),
    userId: user[0].id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_HOURS * 3600_000),
  });
  const url = `${env.APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: normalized,
    subject: "Reset your FriendConnect password",
    text: `Reset your password using this link (valid ${env.PASSWORD_RESET_TTL_HOURS}h): ${url}`,
  });
  return { emailed: true, devToken: env.SMTP_URL ? undefined : token };
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const db = getDb();
  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.consumedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const reset = rows[0];
  if (!reset) throw forbidden("Reset link is invalid or expired.");
  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, reset.userId));
    await tx
      .update(passwordResetTokens)
      .set({ consumedAt: new Date() })
      .where(eq(passwordResetTokens.id, reset.id));
    // Revoke all existing sessions after a password reset.
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, reset.userId), isNull(sessions.revokedAt)));
  });
  await recordAudit({ actorId: reset.userId, action: "auth.password_reset", resourceType: "user" });
}

export async function verifyEmailToken(token: string) {
  const db = getDb();
  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        isNull(verificationTokens.consumedAt),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const tokenRow = rows[0];
  if (!tokenRow) throw forbidden("Verification link is invalid or expired.");
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, tokenRow.userId));
    await tx
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(eq(verificationTokens.id, tokenRow.id));
  });
}
