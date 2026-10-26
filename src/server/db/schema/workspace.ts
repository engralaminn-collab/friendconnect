/**
 * Generic per-user document store for the broad workspace modules
 * (CRM, campaigns, education, studios, knowledge, community, ...).
 *
 * The messaging domain uses fully normalized tables; this table keeps the
 * remaining 30+ workspace modules persistent without 100+ bespoke tables,
 * while still enforcing owner isolation, unique record ids and indexed listing.
 */
import {
  datetime,
  index,
  json,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./identity";

const now = () => new Date();

export const workspaceRecords = mysqlTable(
  "workspace_records",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Collection name, e.g. "contacts-crm", "campaigns", "diagrams". */
    collection: varchar("collection", { length: 48 }).notNull(),
    recordId: varchar("record_id", { length: 64 }).notNull(),
    data: json("data").notNull(),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
    updatedAt: datetime("updated_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    recordUq: uniqueIndex("workspace_records_record_uq").on(
      t.userId,
      t.collection,
      t.recordId,
    ),
    collectionIdx: index("workspace_records_collection_idx").on(t.userId, t.collection),
  }),
);

export type WorkspaceRecordRow = typeof workspaceRecords.$inferSelect;
