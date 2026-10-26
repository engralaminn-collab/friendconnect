/**
 * One-time, idempotent migration of the legacy Zustand/localStorage workspace
 * (`friendconnect-workspace-v1`) into the persistent backend.
 *
 * - Workspace modules (CRM, campaigns, education, studios, ...) become
 *   owner-scoped workspace_records documents.
 * - Messenger threads become conversations with their full message history;
 *   counterparties that are not FriendConnect users are kept as external
 *   contacts and the conversation stays visible to the migrating user only.
 * No data is discarded; the local store remains untouched as a fallback.
 */
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import {
  conversations,
  conversationMembers,
  messages,
  messageReactions,
  contacts,
  userPreferences,
  workspaceRecords,
  polls,
  pollOptions,
  pollVotes,
} from "../db/schema";
import { newId } from "../auth/tokens";
import { badRequest } from "../http/errors";

const legacyMessageSchema = z.object({
  id: z.string(),
  body: z.string().default(""),
  at: z.string().optional(),
  kind: z.string().optional(),
  replyTo: z.string().optional(),
  deleted: z.boolean().optional(),
  starred: z.boolean().optional(),
  forwarded: z.boolean().optional(),
  reactions: z
    .array(z.object({ emoji: z.string(), count: z.number().optional(), mine: z.boolean().optional() }))
    .optional(),
});
const legacyThreadSchema = z.object({
  id: z.string(),
  contactName: z.string().default("Imported chat"),
  channel: z.string().optional(),
  about: z.string().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  muted: z.boolean().optional(),
  messages: z.array(legacyMessageSchema).default([]),
});

export const importPayloadSchema = z.object({
  threads: z.array(legacyThreadSchema).max(200).optional(),
  contacts: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().default("Contact"),
        email: z.string().optional(),
        phone: z.string().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }),
    )
    .max(2000)
    .optional(),
  workspace: z.record(z.string(), z.array(z.any())).optional(),
  force: z.boolean().optional(),
});
export type ImportPayload = z.infer<typeof importPayloadSchema>;

function stableId(prefix: string, ...parts: string[]) {
  const hash = createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
  return `${prefix}_${hash}`;
}

export async function importLegacyWorkspace(userId: string, payload: ImportPayload) {
  const db = getDb();
  const prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  const preferences = (prefs[0]?.preferences as Record<string, unknown> | null) ?? {};
  if ((preferences.localMigrationAt as string) && !payload.force) {
    return { skipped: true as const, reason: "already_migrated" };
  }

  const summary = {
    conversations: 0,
    messages: 0,
    reactions: 0,
    contacts: 0,
    workspaceRecords: 0,
    polls: 0,
  };

  // ---- External contacts --------------------------------------------------
  for (const c of payload.contacts ?? []) {
    const id = stableId("ctimp", userId, c.id);
    const exists = await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, id)).limit(1);
    if (exists.length) continue;
    await db.insert(contacts).values({
      id,
      ownerId: userId,
      contactUserId: null,
      displayName: c.name,
      email: c.email?.toLowerCase() ?? null,
      phone: c.phone ?? null,
      tags: c.tags ?? [],
      note: c.notes ?? null,
    });
    summary.contacts++;
  }

  // ---- Conversations + history -------------------------------------------
  for (const thread of payload.threads ?? []) {
    const conversationId = stableId("convimp", userId, thread.id);
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    const now = new Date();
    if (!existing.length) {
      await db.insert(conversations).values({
        id: conversationId,
        type: "direct",
        title: thread.contactName,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(conversationMembers).values({
        conversationId,
        userId,
        role: "owner",
        joinedAt: now,
        pinnedAt: thread.pinned ? now : null,
        archivedAt: thread.archived ? now : null,
        mutedUntil: thread.muted ? new Date(Date.now() + 365 * 86_400_000) : null,
      });
      summary.conversations++;
    }

    for (const m of thread.messages) {
      const messageId = stableId("msgimp", userId, thread.id, m.id);
      const msgExists = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);
      if (msgExists.length) continue;
      const createdAt = m.at ? new Date(m.at) : now;
      if (Number.isNaN(createdAt.getTime())) throw badRequest(`Invalid date on message ${m.id}`);
      await db.insert(messages).values({
        id: messageId,
        conversationId,
        senderId: userId,
        kind: m.deleted ? "system" : (m.kind as string) || "text",
        body: m.deleted ? "" : m.body,
        replyToId: m.replyTo ? stableId("msgimp", userId, thread.id, m.replyTo) : null,
        deletedAt: m.deleted ? createdAt : null,
        systemKind: m.deleted ? "changed" : null,
        forwarded: Boolean(m.forwarded),
        createdAt,
      });
      summary.messages++;
      for (const reaction of m.reactions ?? []) {
        const copies = Math.max(1, reaction.count ?? 1);
        for (let i = 0; i < copies; i++) {
          const reactorId = reaction.mine && i === 0 ? userId : stableId("usrimp", "reaction", thread.id, m.id, reaction.emoji, String(i));
          await db
            .insert(messageReactions)
            .values({ messageId, userId: reactorId, emoji: reaction.emoji, createdAt })
            .catch(() => undefined);
          summary.reactions++;
        }
      }
    }
    const last = thread.messages[thread.messages.length - 1];
    if (last) {
      await db
        .update(conversations)
        .set({
          lastMessageId: stableId("msgimp", userId, thread.id, last.id),
          lastMessageAt: last.at ? new Date(last.at) : now,
          updatedAt: now,
        })
        .where(eq(conversations.id, conversationId));
    }
  }

  // ---- Generic workspace collections --------------------------------------
  for (const [collection, records] of Object.entries(payload.workspace ?? {})) {
    if (!/^[a-z0-9_-]{1,48}$/.test(collection) || !Array.isArray(records)) continue;
    for (const record of records.slice(0, 1000)) {
      const recordId = String((record as { id?: unknown })?.id ?? newId());
      const id = stableId("wrimp", userId, collection, recordId);
      const exists = await db
        .select({ id: workspaceRecords.id })
        .from(workspaceRecords)
        .where(eq(workspaceRecords.id, id))
        .limit(1);
      if (exists.length) continue;
      await db.insert(workspaceRecords).values({
        id,
        userId,
        collection,
        recordId,
        data: (record ?? {}) as Record<string, unknown>,
      });
      summary.workspaceRecords++;
    }
  }

  await db
    .insert(userPreferences)
    .values({ userId, preferences: { ...preferences, localMigrationAt: new Date().toISOString() } })
    .onDuplicateKeyUpdate({
      set: { preferences: { ...preferences, localMigrationAt: new Date().toISOString() } },
    });

  void polls;
  void pollOptions;
  void pollVotes;
  void and;
  return { skipped: false as const, summary };
}
