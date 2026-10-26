/**
 * Batched message hydration: attachments, reactions, polls and per-user
 * receipts are loaded in a fixed number of queries instead of N+1 selects.
 */
import { eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  messages,
  messageAttachments,
  media,
  messageReactions,
  polls,
  pollOptions,
  pollVotes,
  messageReceipts,
  type MessageRow,
} from "../db/schema";
import {
  attachmentDto,
  baseMessageDto,
  type MessageDto,
  type PollDto,
  type ReactionDto,
} from "./serializers";

type Db = MySql2Database<Record<string, unknown>>;

export async function hydrateMessages(
  userId: string,
  rows: MessageRow[],
  dbArg?: Db,
): Promise<MessageDto[]> {
  const db = (dbArg ?? (await import("../db/client")).getDb()) as Db;
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);

  const attachmentRows = await db
    .select({
      attachment: messageAttachments,
      media,
    })
    .from(messageAttachments)
    .innerJoin(media, eq(media.id, messageAttachments.mediaId))
    .where(inArray(messageAttachments.messageId, ids));

  const reactionRows = await db
    .select()
    .from(messageReactions)
    .where(inArray(messageReactions.messageId, ids));

  const pollRows = await db.select().from(polls).where(inArray(polls.messageId, ids));
  const pollById = new Map(pollRows.map((p) => [p.messageId, p]));
  const pollIds = pollRows.map((p) => p.id);
  const optionRows = pollIds.length
    ? await db.select().from(pollOptions).where(inArray(pollOptions.pollId, pollIds))
    : [];
  const voteRows = pollIds.length
    ? await db.select().from(pollVotes).where(inArray(pollVotes.pollId, pollIds))
    : [];

  const receiptRows = await db
    .select()
    .from(messageReceipts)
    .where(inArray(messageReceipts.messageId, ids));
  const myReceiptByMessage = new Map(
    receiptRows.filter((r) => r.userId === userId).map((r) => [r.messageId, r.state]),
  );
  const deliveredByMessage = new Map<string, Set<string>>();
  const readByMessage = new Map<string, Set<string>>();
  for (const r of receiptRows) {
    if (r.state === "read" || r.state === "delivered") {
      if (!deliveredByMessage.has(r.messageId)) deliveredByMessage.set(r.messageId, new Set());
      deliveredByMessage.get(r.messageId)!.add(r.userId);
    }
    if (r.state === "read") {
      if (!readByMessage.has(r.messageId)) readByMessage.set(r.messageId, new Set());
      readByMessage.get(r.messageId)!.add(r.userId);
    }
  }

  const attachmentsByMessage = new Map<string, MessageDto["attachments"]>();
  for (const row of attachmentRows) {
    const list = attachmentsByMessage.get(row.attachment.messageId) ?? [];
    list.push(
      attachmentDto(
        row.attachment.id,
        row.attachment.mediaId,
        row.attachment.caption,
        row.media,
      ),
    );
    attachmentsByMessage.set(row.attachment.messageId, list);
  }

  const reactionsByMessage = new Map<string, ReactionDto[]>();
  for (const r of reactionRows) {
    const list = reactionsByMessage.get(r.messageId) ?? [];
    const existing = list.find((x) => x.emoji === r.emoji);
    if (existing) {
      existing.userIds.push(r.userId);
      existing.count += 1;
      if (r.userId === userId) existing.mine = true;
    } else {
      list.push({
        emoji: r.emoji,
        count: 1,
        userIds: [r.userId],
        mine: r.userId === userId,
      });
    }
    reactionsByMessage.set(r.messageId, list);
  }

  const optionsByPoll = new Map<string, typeof optionRows>();
  for (const o of optionRows) {
    const list = optionsByPoll.get(o.pollId) ?? [];
    if (!list.includes(o)) list.push(o);
    optionsByPoll.set(o.pollId, list);
  }
  const myVotes = new Map(voteRows.filter((v) => v.userId === userId).map((v) => [v.pollId, v.optionId]));
  const voteCountByOption = new Map<string, number>();
  for (const v of voteRows) voteCountByOption.set(v.optionId, (voteCountByOption.get(v.optionId) ?? 0) + 1);

  const pollDtoByMessage = new Map<string, PollDto>();
  for (const [messageId, poll] of pollById) {
    const options = (optionsByPoll.get(poll.id) ?? [])
      .sort((a, b) => a.position - b.position)
      .map((o) => ({
        id: o.id,
        label: o.label,
        position: o.position,
        votes: voteCountByOption.get(o.id) ?? 0,
        mine: myVotes.get(poll.id) === o.id,
      }));
    pollDtoByMessage.set(messageId, {
      id: poll.id,
      question: poll.question,
      options,
      totalVotes: voteRows.filter((v) => v.pollId === poll.id).length,
      myOption: myVotes.get(poll.id) ?? null,
    });
  }

  return rows.map((row) => ({
    ...baseMessageDto(row),
    attachments: attachmentsByMessage.get(row.id) ?? [],
    reactions: reactionsByMessage.get(row.id) ?? [],
    poll: pollDtoByMessage.get(row.id) ?? null,
    myReceipt: (myReceiptByMessage.get(row.id) as "delivered" | "read" | undefined) ?? null,
    receiptSummary: {
      deliveredTo: [...(deliveredByMessage.get(row.id) ?? [])],
      readBy: [...(readByMessage.get(row.id) ?? [])],
    },
  }));
}

export { messages };
