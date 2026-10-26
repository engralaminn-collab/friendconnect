/**
 * Conversations, memberships and read cursors.
 */
import {
  datetime,
  index,
  mysqlTable,
  primaryKey,
  varchar,
  int,
} from "drizzle-orm/mysql-core";
import { users } from "./identity";

const now = () => new Date();

export const conversations = mysqlTable(
  "conversations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    type: varchar("type", { length: 8 }).notNull().default("direct"),
    title: varchar("title", { length: 120 }),
    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** No FK: circular reference with messages; kept consistent in services. */
    lastMessageId: varchar("last_message_id", { length: 36 }),
    lastMessageAt: datetime("last_message_at", { fsp: 3 }),
    /** Disappearing-message timer in seconds; 0 disables it. */
    disappearingSec: int("disappearing_sec").notNull().default(0),
    wallpaper: varchar("wallpaper", { length: 64 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    lastIdx: index("conversations_last_idx").on(t.lastMessageAt),
    creatorIdx: index("conversations_creator_idx").on(t.createdBy),
  }),
);

export const conversationMembers = mysqlTable(
  "conversation_members",
  {
    conversationId: varchar("conversation_id", { length: 36 })
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 12 }).notNull().default("member"),
    joinedAt: datetime("joined_at", { fsp: 3 }).notNull().$defaultFn(now),
    addedBy: varchar("added_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    lastReadAt: datetime("last_read_at", { fsp: 3 }),
    archivedAt: datetime("archived_at", { fsp: 3 }),
    mutedUntil: datetime("muted_until", { fsp: 3 }),
    /** Per-user pinning of the conversation in the list. */
    pinnedAt: datetime("pinned_at", { fsp: 3 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.conversationId, t.userId] }),
    userIdx: index("conversation_members_user_idx").on(t.userId),
    convIdx: index("conversation_members_conv_idx").on(t.conversationId),
    pinnedIdx: index("conversation_members_pinned_idx").on(t.userId, t.pinnedAt),
  }),
);

/** Explicit per-member read cursor (message id the member has read through). */
export const readCursors = mysqlTable(
  "read_cursors",
  {
    conversationId: varchar("conversation_id", { length: 36 })
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessageId: varchar("last_message_id", { length: 36 }).notNull(),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.conversationId, t.userId] }),
  }),
);

export type ConversationRow = typeof conversations.$inferSelect;
export type ConversationMemberRow = typeof conversationMembers.$inferSelect;
