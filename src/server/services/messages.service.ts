/**
 * Message lifecycle: idempotent sends, edits, soft deletion, reactions,
 * polls, delivery/read receipts, pins, saved messages and reports.
 *
 * Messages are always committed to MySQL before any realtime event is emitted.
 */
import { and, asc, desc, eq, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import {
  messages,
  messageAttachments,
  messageReactions,
  messageReceipts,
  pinnedMessages,
  savedMessages,
  polls,
  pollOptions,
  pollVotes,
  messageReports,
  conversations,
  conversationMembers,
  notifications,
  media,
} from "../db/schema";
import { newId } from "../auth/tokens";
import { conflict, forbidden, notFound } from "../http/errors";
import { assertMembership } from "./conversations.service";
import { hydrateMessages } from "./message-hydrate";
import { REALTIME_EVENTS, publishToConversation, publishToUsers } from "../realtime/publisher";
import type { MessageDto } from "./serializers";

export const sendMessageSchema = z.object({
  body: z.string().max(8000).default(""),
  kind: z
    .enum(["text", "image", "video", "audio", "voice", "document", "location", "poll", "contact"])
    .default("text"),
  clientNonce: z.string().min(4).max(64).optional(),
  replyToId: z.string().max(36).optional(),
  mediaIds: z.array(z.string().min(1)).max(10).optional(),
  location: z
    .object({ lat: z.number(), lng: z.number(), address: z.string().max(300).optional() })
    .optional(),
  contactCard: z
    .object({ name: z.string().max(120), phone: z.string().max(32), company: z.string().max(120).optional() })
    .optional(),
  poll: z
    .object({
      question: z.string().min(1).max(500),
      options: z.array(z.string().min(1).max(255)).min(2).max(10),
    })
    .optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const editMessageSchema = z.object({ body: z.string().min(1).max(8000) });
export const reactionSchema = z.object({
  emoji: z.string().min(1).max(32).regex(/^[^\p{C}]+$/u),
});
export const pollVoteSchema = z.object({ optionId: z.string().min(1).max(36) });
export const reportSchema = z.object({
  reason: z.string().min(2).max(120),
  detail: z.string().max(2000).optional(),
});
export const saveMessageSchema = z.object({
  note: z.string().max(1000).optional(),
  tag: z.enum(["important", "reference", "todo", "attachment"]).default("reference"),
});

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export async function listMessages(
  userId: string,
  conversationId: string,
  opts: { limit: number; cursor?: string },
): Promise<Page<MessageDto>> {
  await assertMembership(userId, conversationId);
  const db = getDb();
  const conditions = [eq(messages.conversationId, conversationId)];
  if (opts.cursor) {
    const decoded = decodeCursor(opts.cursor);
    if (decoded) {
      conditions.push(
        sql`(${messages.createdAt}, ${messages.id}) < (${decoded.createdAt}, ${decoded.id})`,
      );
    }
  }
  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(opts.limit + 1);
  const hasMore = rows.length > opts.limit;
  const page = rows.slice(0, opts.limit).reverse();
  const items = await hydrateMessages(userId, page);
  const last = page[0];
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

function encodeCursor(date: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: date.toISOString(), id })).toString("base64url");
}
function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const obj = JSON.parse(Buffer.from(cursor, "base64url").toString());
    return { createdAt: new Date(obj.t), id: obj.id };
  } catch {
    return null;
  }
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  input: SendMessageInput,
): Promise<MessageDto> {
  const member = await assertMembership(userId, conversationId);
  const db = getDb();

  // Idempotency: retries with the same client nonce return the stored message.
  if (input.clientNonce) {
    const existing = await db
      .select()
      .from(messages)
      .where(
        and(eq(messages.senderId, userId), eq(messages.clientNonce, input.clientNonce)),
      )
      .limit(1);
    if (existing.length) {
      const hydrated = await hydrateMessages(userId, existing);
      return hydrated[0];
    }
  }
  if (!input.body && (!input.mediaIds?.length) && !input.poll && input.kind === "text") {
    throw conflict("Message must contain text, media or a poll.");
  }
  if (input.replyToId) {
    const parent = await db
      .select({ id: messages.id, conversationId: messages.conversationId })
      .from(messages)
      .where(eq(messages.id, input.replyToId))
      .limit(1);
    if (!parent.length || parent[0].conversationId !== conversationId) {
      throw notFound("Replied message not found in this conversation");
    }
  }
  let mediaRows: typeof media.$inferSelect[] = [];
  if (input.mediaIds?.length) {
    mediaRows = await db.select().from(media).where(inArray(media.id, input.mediaIds));
    if (mediaRows.length !== input.mediaIds.length) throw notFound("One or more media items not found");
    for (const m of mediaRows) {
      if (m.ownerId !== userId) throw forbidden("You can only attach media you uploaded");
      const used = await db
        .select({ id: messageAttachments.id })
        .from(messageAttachments)
        .where(eq(messageAttachments.mediaId, m.id))
        .limit(1);
      if (used.length) throw conflict("Media can only be attached once");
    }
  }

  const messageId = newId("msg");
  const now = new Date();
  let pollId: string | null = null;
  if (input.poll) {
    pollId = newId("poll");
  }

  await db.transaction(async (tx) => {
    await tx.insert(messages).values({
      id: messageId,
      conversationId,
      senderId: userId,
      kind: input.poll ? "poll" : input.kind,
      body: input.body,
      replyToId: input.replyToId ?? null,
      clientNonce: input.clientNonce ?? null,
      systemKind: null,
      createdAt: now,
    });
    for (const [i, m] of mediaRows.entries()) {
      await tx.insert(messageAttachments).values({
        id: newId("att"),
        messageId,
        mediaId: m.id,
        caption: null,
        position: i,
        createdAt: now,
      });
    }
    if (input.poll && pollId) {
      await tx.insert(polls).values({ id: pollId, messageId, question: input.poll.question, createdAt: now });
      for (const [i, label] of input.poll.options.entries()) {
        await tx.insert(pollOptions).values({ id: newId("po"), pollId, label, position: i });
      }
    }
    await tx
      .update(conversations)
      .set({ lastMessageId: messageId, lastMessageAt: now, updatedAt: now })
      .where(eq(conversations.id, conversationId));
  });

  // Notifications for other members (best effort, outside the write transaction).
  const otherMembers = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(
      and(eq(conversationMembers.conversationId, conversationId), ne(conversationMembers.userId, userId)),
    );
  const preview = input.body || (input.poll ? `Poll: ${input.poll.question}` : "New attachment");
  await Promise.all(
    otherMembers.map((m) =>
      db.insert(notifications).values({
        id: newId("ntf"),
        userId: m.userId,
        kind: "message",
        title: "New message",
        body: preview.slice(0, 480),
        data: { conversationId, messageId },
      }),
    ),
  );

  const hydrated = await hydrateMessages(userId, [
    (await db.select().from(messages).where(eq(messages.id, messageId)).limit(1))[0],
  ]);
  const dto = hydrated[0];
  publishToConversation(conversationId, REALTIME_EVENTS.messageNew, { conversationId, message: dto });
  publishToUsers(
    otherMembers.map((m) => m.userId),
    REALTIME_EVENTS.notification,
    { conversationId, messageId, preview },
  );
  void member;
  return dto;
}

export async function editMessage(userId: string, messageId: string, body: string) {
  const db = getDb();
  const rows = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  const msg = rows[0];
  if (!msg) throw notFound("Message not found");
  if (msg.senderId !== userId) throw forbidden("Only the sender can edit this message");
  if (msg.deletedAt) throw conflict("Deleted messages cannot be edited");
  await db
    .update(messages)
    .set({ body, editedAt: new Date() })
    .where(eq(messages.id, messageId));
  const updated = await hydrateMessages(userId, [
    (await db.select().from(messages).where(eq(messages.id, messageId)).limit(1))[0],
  ]);
  publishToConversation(msg.conversationId, REALTIME_EVENTS.messageUpdate, {
    conversationId: msg.conversationId,
    message: updated[0],
  });
  return updated[0];
}

export async function deleteMessage(userId: string, messageId: string) {
  const db = getDb();
  const rows = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  const msg = rows[0];
  if (!msg) throw notFound("Message not found");
  const memberRows = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, msg.conversationId),
        eq(conversationMembers.userId, userId),
      ),
    )
    .limit(1);
  const member = memberRows[0];
  if (msg.senderId !== userId && member?.role === "member") {
    throw forbidden("Only the sender or a conversation admin can delete this message");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(messages)
      .set({ deletedAt: new Date(), body: "", kind: "system", systemKind: "changed" })
      .where(eq(messages.id, messageId));
    await tx.delete(messageAttachments).where(eq(messageAttachments.messageId, messageId));
  });
  publishToConversation(msg.conversationId, REALTIME_EVENTS.messageDelete, {
    conversationId: msg.conversationId,
    messageId,
  });
}

export async function react(userId: string, messageId: string, emoji: string) {
  const db = getDb();
  const msg = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg.length || msg[0].deletedAt) throw notFound("Message not found");
  await assertMembership(userId, msg[0].conversationId);
  await db
    .insert(messageReactions)
    .values({ messageId, userId, emoji })
    .onDuplicateKeyUpdate({ set: { emoji } });
  const hydrated = await hydrateMessages(userId, msg);
  publishToConversation(msg[0].conversationId, REALTIME_EVENTS.reactionUpdate, {
    conversationId: msg[0].conversationId,
    messageId,
    reactions: hydrated[0].reactions,
  });
  return hydrated[0].reactions;
}

export async function unreact(userId: string, messageId: string, emoji: string) {
  const db = getDb();
  const msg = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg.length) throw notFound("Message not found");
  await assertMembership(userId, msg[0].conversationId);
  await db
    .delete(messageReactions)
    .where(
      and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji),
      ),
    );
  const hydrated = await hydrateMessages(userId, msg);
  publishToConversation(msg[0].conversationId, REALTIME_EVENTS.reactionUpdate, {
    conversationId: msg[0].conversationId,
    messageId,
    reactions: hydrated[0].reactions,
  });
  return hydrated[0].reactions;
}

export async function votePoll(userId: string, messageId: string, optionId: string) {
  const db = getDb();
  const msg = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg.length || msg[0].kind !== "poll") throw notFound("Poll not found");
  await assertMembership(userId, msg[0].conversationId);
  const pollRows = await db.select().from(polls).where(eq(polls.messageId, messageId)).limit(1);
  const poll = pollRows[0];
  if (!poll) throw notFound("Poll not found");
  const option = await db
    .select()
    .from(pollOptions)
    .where(and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, poll.id)))
    .limit(1);
  if (!option.length) throw notFound("Poll option not found");

  await db.transaction(async (tx) => {
    await tx.delete(pollVotes).where(and(eq(pollVotes.pollId, poll.id), eq(pollVotes.userId, userId)));
    await tx.insert(pollVotes).values({ optionId, pollId: poll.id, userId });
  });
  const hydrated = await hydrateMessages(userId, msg);
  publishToConversation(msg[0].conversationId, REALTIME_EVENTS.pollUpdate, {
    conversationId: msg[0].conversationId,
    messageId,
    poll: hydrated[0].poll,
  });
  return hydrated[0].poll;
}

/**
 * Recipient client acknowledges delivery. Creates `delivered` receipts without
 * touching read state. Never called by the sender.
 */
export async function acknowledgeDelivery(
  userId: string,
  conversationId: string,
  upToMessageId?: string,
) {
  await assertMembership(userId, conversationId);
  const db = getDb();
  const conditions = [
    eq(messages.conversationId, conversationId),
    ne(messages.senderId, userId),
    isNull(messages.deletedAt),
  ];
  if (upToMessageId) {
    const bound = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, upToMessageId))
      .limit(1);
    if (bound.length) conditions.push(lte(messages.createdAt, bound[0].createdAt));
  }
  const pending = await db
    .select({ id: messages.id })
    .from(messages)
    .where(and(...conditions))
    .orderBy(asc(messages.createdAt));
  const now = new Date();
  for (const m of pending) {
    await db
      .insert(messageReceipts)
      .values({
        id: newId("rc"),
        messageId: m.id,
        userId,
        state: "delivered",
        deliveredAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({ set: { updatedAt: now } });
  }
  publishToConversation(conversationId, REALTIME_EVENTS.messageReceipt, {
    conversationId,
    userId,
    state: "delivered",
    messageIds: pending.map((m) => m.id),
  });
  return { acknowledged: pending.length };
}

export async function pinMessage(userId: string, messageId: string) {
  const db = getDb();
  const msg = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg.length) throw notFound("Message not found");
  await assertMembership(userId, msg[0].conversationId);
  await db
    .insert(pinnedMessages)
    .values({ conversationId: msg[0].conversationId, messageId, pinnedBy: userId })
    .onDuplicateKeyUpdate({ set: { pinnedBy: userId, pinnedAt: new Date() } });
}

export async function unpinMessage(userId: string, messageId: string) {
  const db = getDb();
  const msg = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg.length) throw notFound("Message not found");
  await assertMembership(userId, msg[0].conversationId);
  await db
    .delete(pinnedMessages)
    .where(
      and(
        eq(pinnedMessages.conversationId, msg[0].conversationId),
        eq(pinnedMessages.messageId, messageId),
      ),
    );
}

export async function saveMessage(
  userId: string,
  messageId: string,
  note: string | undefined,
  tag: "important" | "reference" | "todo" | "attachment",
) {
  const db = getDb();
  const msg = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg.length) throw notFound("Message not found");
  await assertMembership(userId, msg[0].conversationId);
  const conv = await db
    .select({ title: conversations.title, type: conversations.type })
    .from(conversations)
    .where(eq(conversations.id, msg[0].conversationId))
    .limit(1);
  const id = newId("sv");
  await db.insert(savedMessages).values({
    id,
    userId,
    messageId,
    conversationId: msg[0].conversationId,
    threadName: conv[0]?.title ?? msg[0].conversationId,
    author: msg[0].senderId ?? "system",
    body: msg[0].body,
    note: note ?? null,
    tag,
  });
  return id;
}

export async function listSavedMessages(userId: string) {
  return getDb().select().from(savedMessages).where(eq(savedMessages.userId, userId)).orderBy(desc(savedMessages.createdAt));
}

export async function deleteSavedMessage(userId: string, savedId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: savedMessages.id })
    .from(savedMessages)
    .where(and(eq(savedMessages.id, savedId), eq(savedMessages.userId, userId)))
    .limit(1);
  if (!rows.length) throw notFound("Saved message not found");
  await db.delete(savedMessages).where(eq(savedMessages.id, savedId));
}

export async function reportMessage(
  userId: string,
  messageId: string,
  reason: string,
  detail?: string,
) {
  const db = getDb();
  const msg = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!msg.length) throw notFound("Message not found");
  await assertMembership(userId, msg[0].conversationId);
  const id = newId("rp");
  await db.insert(messageReports).values({
    id,
    reporterId: userId,
    messageId,
    reason,
    detail: detail ?? null,
    status: "received",
  });
  return id;
}
