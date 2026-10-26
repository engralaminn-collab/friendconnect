/**
 * Optional development seed: creates two demo users, a direct conversation and
 * a handful of messages so the messenger has content. Safe to re-run (upserts).
 */
import { eq } from "drizzle-orm";
import { getDb, closePool } from "../src/server/db/client";
import { users, profiles, userPreferences, conversations, conversationMembers, messages } from "../src/server/db/schema";
import { hashPassword } from "../src/server/auth/passwords";
import { newId } from "../src/server/auth/tokens";

async function ensureUser(email: string, name: string) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return existing[0];
  const id = newId("usr");
  const now = new Date();
  await db.insert(users).values({
    id,
    email,
    handle: email.split("@")[0],
    displayName: name,
    passwordHash: await hashPassword("Password123!"),
    status: "active",
    emailVerifiedAt: now,
    failedLoginCount: 0,
  });
  await db.insert(profiles).values({ userId: id, updatedAt: now }).catch(() => undefined);
  await db
    .insert(userPreferences)
    .values({ userId: id, preferences: { theme: "dark" } })
    .catch(() => undefined);
  return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
}

async function main() {
  const db = getDb();
  const alice = await ensureUser("alice@example.com", "Alice Demo");
  const bob = await ensureUser("bob@example.com", "Bob Demo");
  const existingConv = await db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, alice.id))
    .limit(1);
  if (!existingConv.length) {
    const convId = newId("conv");
    const now = new Date();
    await db.insert(conversations).values({
      id: convId,
      type: "direct",
      title: "Bob Demo",
      createdBy: alice.id,
      createdAt: now,
      updatedAt: now,
    });
    for (const [userId, role] of [
      [alice.id, "owner"],
      [bob.id, "member"],
    ] as const) {
      await db.insert(conversationMembers).values({ conversationId: convId, userId, role });
    }
    for (const [senderId, body, offsetMin] of [
      [alice.id, "Welcome to FriendConnect — this message is stored in MySQL.", 5],
      [bob.id, "Persisted, real-time and end-to-end authenticated. Nice.", 3],
      [alice.id, "Try sending a file or a voice note.", 1],
    ] as const) {
      const id = newId("msg");
      const at = new Date(Date.now() - offsetMin * 60_000);
      await db.insert(messages).values({
        id,
        conversationId: convId,
        senderId,
        kind: "text",
        body,
        createdAt: at,
      });
      await db
        .update(conversations)
        .set({ lastMessageId: id, lastMessageAt: at, updatedAt: at })
        .where(eq(conversations.id, convId));
    }
  }
  // eslint-disable-next-line no-console
  console.log("Seed complete. Log in with alice@example.com / Password123!");
  await closePool();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
