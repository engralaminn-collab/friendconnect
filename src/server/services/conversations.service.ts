/**
 * Conversation lifecycle and membership authorization. Every query path
 * enforces membership at the database layer in addition to route guards.
 */
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import {
  conversations,
  conversationMembers,
  users,
  profiles,
  readCursors,
  messages,
  messageReceipts,
  type ConversationMemberRow,
} from "../db/schema";
import { newId } from "../auth/tokens";
import { conflict, notFound } from "../http/errors";
import { REALTIME_EVENTS, publishToUsers } from "../realtime/publisher";
import {
  conversationSummaryDto,
  memberStateDto,
  type ConversationDto,
  type ConversationMemberDto,
} from "./serializers";
import { hydrateMessages } from "./message-hydrate";

export const createConversationSchema = z.object({
  type: z.enum(["direct", "group"]).default("direct"),
  memberIds: z.array(z.string().min(1)).min(1).max(50),
  title: z.string().max(120).optional(),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const memberSettingsSchema = z.object({
  archived: z.boolean().optional(),
  muted: z.boolean().optional(),
  pinned: z.boolean().optional(),
  wallpaper: z.string().max(64).optional(),
  disappearingSec: z.number().int().min(0).max(7 * 86_400).optional(),
});
export type MemberSettingsInput = z.infer<typeof memberSettingsSchema>;

export async function assertMembership(
  userId: string,
  conversationId: string,
): Promise<ConversationMemberRow> {
  const rows = await getDb()
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .limit(1);
  if (!rows.length) throw notFound("Conversation not found");
  return rows[0];
}

export async function listConversations(userId: string): Promise<ConversationDto[]> {
  const db = getDb();
  const myMemberships = await db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));
  if (!myMemberships.length) return [];
  const convIds = myMemberships.map((m) => m.conversationId);

  const convRows = await db
    .select()
    .from(conversations)
    .where(inArray(conversations.id, convIds))
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));

  const allMembers = await db
    .select({
      member: conversationMembers,
      user: {
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        handle: users.handle,
      },
      avatarMediaId: profiles.avatarMediaId,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(inArray(conversationMembers.conversationId, convIds));

  const lastMessageIds = convRows.map((c) => c.lastMessageId).filter((id): id is string => Boolean(id));
  const lastMessageRows = lastMessageIds.length
    ? await db.select().from(messages).where(inArray(messages.id, lastMessageIds))
    : [];
  const hydratedLast = await hydrateMessages(userId, lastMessageRows);
  const lastById = new Map(hydratedLast.map((m) => [m.id, m]));

  // Unread counts: messages newer than the member's lastReadAt, excluding own.
  const unreadRows = await db
    .select({ conversationId: messages.conversationId, n: sql<number>`count(*)` })
    .from(messages)
    .innerJoin(
      conversationMembers,
      and(
        eq(conversationMembers.conversationId, messages.conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .where(
      and(
        inArray(messages.conversationId, convIds),
        ne(messages.senderId, userId),
        isNull(messages.deletedAt),
        sql`${messages.createdAt} > COALESCE(${conversationMembers.lastReadAt}, '1970-01-01')`,
      ),
    )
    .groupBy(messages.conversationId);
  const unreadByConv = new Map(unreadRows.map((r) => [r.conversationId, Number(r.n)]));

  const myMemberByConv = new Map(myMemberships.map((m) => [m.conversationId, m]));

  return convRows.map((conv) => {
    const memberList = allMembers
      .filter((m) => m.member.conversationId === conv.id)
      .map<ConversationMemberDto>((m) => ({
        userId: m.user.id,
        displayName: m.user.displayName,
        handle: m.user.handle,
        email: m.user.email,
        role: m.member.role,
        avatarMediaId: m.avatarMediaId ?? null,
        lastReadAt: m.member.lastReadAt ? m.member.lastReadAt.toISOString() : null,
      }));
    const myMember = myMemberByConv.get(conv.id)!;
    return {
      ...conversationSummaryDto(conv),
      title: displayTitle(conv, memberList, userId),
      members: memberList,
      memberState: memberStateDto(myMember),
      unreadCount: unreadByConv.get(conv.id) ?? 0,
      lastMessage: conv.lastMessageId ? (lastById.get(conv.lastMessageId) ?? null) : null,
    };
  });
}

function displayTitle(
  conv: typeof conversations.$inferSelect,
  members: ConversationMemberDto[],
  currentUserId: string,
): string | null {
  if (conv.title) return conv.title;
  if (conv.type === "direct") {
    return members.find((m) => m.userId !== currentUserId)?.displayName ?? "Direct chat";
  }
  return members.map((m) => m.displayName).join(", ").slice(0, 120);
}

export async function createConversation(
  userId: string,
  input: CreateConversationInput,
): Promise<ConversationDto> {
  const db = getDb();
  const memberIds = [...new Set([userId, ...input.memberIds])];

  if (input.type === "direct") {
    const other = memberIds.find((id) => id !== userId);
    if (!other || memberIds.length !== 2) {
      throw conflict("Direct conversations must have exactly two participants.");
    }
    const target = await db.select({ id: users.id }).from(users).where(eq(users.id, other)).limit(1);
    if (!target.length) throw notFound("Invited user not found");
    const existing = await findDirectConversation(userId, other);
    if (existing) return getConversation(userId, existing.id);
  } else {
    const active = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, memberIds), eq(users.status, "active")));
    if (active.length !== memberIds.length) throw notFound("One or more invited users do not exist");
    if (!input.title) throw conflict("Group conversations require a title.");
  }

  const conversationId = newId("conv");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(conversations).values({
      id: conversationId,
      type: input.type,
      title: input.title ?? null,
      createdBy: userId,
      disappearingSec: 0,
      createdAt: now,
      updatedAt: now,
    });
    for (const memberId of memberIds) {
      await tx.insert(conversationMembers).values({
        conversationId,
        userId: memberId,
        role: memberId === userId ? "owner" : "member",
        addedBy: userId,
        joinedAt: now,
      });
    }
  });

  const dto = await getConversation(userId, conversationId);
  publishToUsers(
    memberIds.filter((id) => id !== userId),
    REALTIME_EVENTS.conversationNew,
    dto,
  );
  return dto;
}

async function findDirectConversation(a: string, b: string): Promise<{ id: string } | null> {
  const db = getDb();
  const rows = await db
    .select({ id: conversationMembers.conversationId })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
    .where(and(eq(conversations.type, "direct"), eq(conversationMembers.userId, a)));
  for (const row of rows) {
    const peers = await db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, row.id));
    const ids = peers.map((p) => p.userId).sort();
    if (ids.length === 2 && ids.includes(a) && ids.includes(b)) return { id: row.id };
  }
  return null;
}

export async function getConversation(userId: string, conversationId: string): Promise<ConversationDto> {
  await assertMembership(userId, conversationId);
  const db = getDb();
  const convRows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  const conv = convRows[0];
  if (!conv) throw notFound("Conversation not found");

  const memberRows = await db
    .select({
      member: conversationMembers,
      user: {
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        handle: users.handle,
      },
      avatarMediaId: profiles.avatarMediaId,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(conversationMembers.conversationId, conversationId));

  const myMember = memberRows.find((m) => m.user.id === userId)!.member;
  const members: ConversationMemberDto[] = memberRows.map((m) => ({
    userId: m.user.id,
    displayName: m.user.displayName,
    handle: m.user.handle,
    email: m.user.email,
    role: m.member.role,
    avatarMediaId: m.avatarMediaId ?? null,
    lastReadAt: m.member.lastReadAt ? m.member.lastReadAt.toISOString() : null,
  }));

  let lastMessage: Awaited<ReturnType<typeof hydrateMessages>>[number] | null = null;
  if (conv.lastMessageId) {
    const rows = await db.select().from(messages).where(eq(messages.id, conv.lastMessageId)).limit(1);
    if (rows.length) {
      const hydrated = await hydrateMessages(userId, rows);
      lastMessage = hydrated[0] ?? null;
    }
  }

  return {
    ...conversationSummaryDto(conv),
    title: displayTitle(conv, members, userId),
    members,
    memberState: memberStateDto(myMember),
    unreadCount: 0,
    lastMessage,
  };
}

export async function updateMemberSettings(
  userId: string,
  conversationId: string,
  patch: MemberSettingsInput,
) {
  const member = await assertMembership(userId, conversationId);
  const db = getDb();
  const memberPatch: Partial<typeof conversationMembers.$inferInsert> = {};
  if (patch.archived !== undefined) memberPatch.archivedAt = patch.archived ? new Date() : null;
  if (patch.pinned !== undefined) memberPatch.pinnedAt = patch.pinned ? new Date() : null;
  if (patch.muted !== undefined)
    memberPatch.mutedUntil = patch.muted ? new Date(Date.now() + 365 * 86_400_000) : null;
  if (Object.keys(memberPatch).length) {
    await db
      .update(conversationMembers)
      .set(memberPatch)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      );
  }
  const convPatch: Partial<typeof conversations.$inferInsert> = {};
  if (patch.wallpaper !== undefined) convPatch.wallpaper = patch.wallpaper;
  if (patch.disappearingSec !== undefined) {
    if (member.role === "member") throw conflict("Only conversation owners can change message timers.");
    convPatch.disappearingSec = patch.disappearingSec;
  }
  if (Object.keys(convPatch).length) {
    convPatch.updatedAt = new Date();
    await db.update(conversations).set(convPatch).where(eq(conversations.id, conversationId));
  }
  return getConversation(userId, conversationId);
}

/**
 * Mark a conversation read through its latest message: cursor, member timestamp
 * and per-message read receipts in one transaction. Returns affected message ids.
 */
export async function markConversationRead(
  userId: string,
  conversationId: string,
): Promise<string[]> {
  await assertMembership(userId, conversationId);
  const db = getDb();
  const latest = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), isNull(messages.deletedAt)))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(1);
  if (!latest.length) {
    await db
      .update(conversationMembers)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      );
    return [];
  }
  const lastMessageId = latest[0].id;
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(readCursors)
      .values({ conversationId, userId, lastMessageId, updatedAt: now })
      .onDuplicateKeyUpdate({ set: { lastMessageId, updatedAt: now } });
    await tx
      .update(conversationMembers)
      .set({ lastReadAt: now })
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      );
    // Record read receipts for every recipient message not yet read.
    const unread = await tx
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId),
          isNull(messages.deletedAt),
        ),
      );
    for (const m of unread) {
      await tx
        .insert(messageReceipts)
        .values({
          id: newId("rc"),
          messageId: m.id,
          userId,
          state: "read",
          readAt: now,
          deliveredAt: now,
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: { state: "read", readAt: now, updatedAt: now },
        });
    }
  });
  const affected = await db
    .select({ id: messages.id, senderId: messages.senderId })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, userId)));
  return affected.map((m) => m.id);
}

export async function getOtherMember(
  conversationId: string,
  userId: string,
): Promise<ConversationMemberDto | null> {
  const rows = await getDb()
    .select({
      user: {
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        handle: users.handle,
      },
      member: conversationMembers,
      avatarMediaId: profiles.avatarMediaId,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        ne(conversationMembers.userId, userId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user.id,
    displayName: row.user.displayName,
    handle: row.user.handle,
    email: row.user.email,
    role: row.member.role,
    avatarMediaId: row.avatarMediaId ?? null,
    lastReadAt: row.member.lastReadAt ? row.member.lastReadAt.toISOString() : null,
  };
}
