/**
 * Voice/video call sessions and participants. Signaling payloads (SDP/ICE)
 * are exchanged ephemerally over Socket.IO; only durable call state is stored.
 */
import {
  boolean,
  datetime,
  index,
  mysqlTable,
  uniqueIndex,
  varchar,
  int,
} from "drizzle-orm/mysql-core";
import { users } from "./identity";
import { conversations } from "./conversations";

const now = () => new Date();

export const callSessions = mysqlTable(
  "call_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    conversationId: varchar("conversation_id", { length: 36 }).references(
      () => conversations.id,
      { onDelete: "set null" },
    ),
    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    kind: varchar("kind", { length: 8 }).notNull(),
    /** ringing | active | ended | declined | missed | failed */
    state: varchar("state", { length: 12 }).notNull().default("ringing"),
    startedAt: datetime("started_at", { fsp: 3 }).notNull().$defaultFn(now),
    answeredAt: datetime("answered_at", { fsp: 3 }),
    endedAt: datetime("ended_at", { fsp: 3 }),
    durationSec: int("duration_sec").notNull().default(0),
    recording: boolean("recording").notNull().default(false),
    endReason: varchar("end_reason", { length: 32 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    convIdx: index("call_sessions_conv_idx").on(t.conversationId),
    creatorIdx: index("call_sessions_creator_idx").on(t.createdBy),
    stateIdx: index("call_sessions_state_idx").on(t.state),
  }),
);

export const callParticipants = mysqlTable(
  "call_participants",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    callId: varchar("call_id", { length: 36 })
      .notNull()
      .references(() => callSessions.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** invited | ringing | active | left | declined */
    state: varchar("state", { length: 12 }).notNull().default("invited"),
    joinedAt: datetime("joined_at", { fsp: 3 }),
    leftAt: datetime("left_at", { fsp: 3 }),
    muted: boolean("muted").notNull().default(false),
    cameraOn: boolean("camera_on").notNull().default(true),
    sharing: boolean("sharing").notNull().default(false),
  },
  (t) => ({
    callUserUq: uniqueIndex("call_participants_call_user_uq").on(t.callId, t.userId),
    callIdx: index("call_participants_call_idx").on(t.callId),
  }),
);

export type CallSessionRow = typeof callSessions.$inferSelect;
export type CallParticipantRow = typeof callParticipants.$inferSelect;
