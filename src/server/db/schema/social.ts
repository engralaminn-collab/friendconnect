/**
 * Social graph: contacts and contact requests.
 */
import {
  datetime,
  index,
  json,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
  boolean,
} from "drizzle-orm/mysql-core";
import { users } from "./identity";

const now = () => new Date();

export const contacts = mysqlTable(
  "contacts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    ownerId: varchar("owner_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Null when the contact is not (yet) a FriendConnect user. */
    contactUserId: varchar("contact_user_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }),
    phone: varchar("phone", { length: 32 }),
    tags: json("tags").$type<string[]>().notNull().$defaultFn(() => []),
    starred: boolean("starred").notNull().default(false),
    note: text("note"),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    ownerUserUq: uniqueIndex("contacts_owner_user_uq").on(t.ownerId, t.contactUserId),
    ownerIdx: index("contacts_owner_idx").on(t.ownerId),
    emailIdx: index("contacts_email_idx").on(t.ownerId, t.email),
  }),
);

export const contactRequests = mysqlTable(
  "contact_requests",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    fromUserId: varchar("from_user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: varchar("to_user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: varchar("message", { length: 500 }),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    respondedAt: datetime("responded_at", { fsp: 3 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    pairIdx: index("contact_requests_pair_idx").on(t.fromUserId, t.toUserId),
    toIdx: index("contact_requests_to_idx").on(t.toUserId, t.status),
  }),
);

export type ContactRow = typeof contacts.$inferSelect;
export type ContactRequestRow = typeof contactRequests.$inferSelect;
