/**
 * Private media objects stored in S3-compatible storage or a local
 * non-web-accessible directory.
 */
import {
  bigint,
  datetime,
  index,
  mysqlTable,
  varchar,
  int,
} from "drizzle-orm/mysql-core";
import { users } from "./identity";

const now = () => new Date();

export const media = mysqlTable(
  "media",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    ownerId: varchar("owner_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Storage driver actually used for this object. */
    driver: varchar("driver", { length: 8 }).notNull(),
    bucket: varchar("bucket", { length: 120 }),
    objectKey: varchar("object_key", { length: 500 }).notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    mime: varchar("mime", { length: 150 }).notNull(),
    /** Allowed media category, validated from real content sniffing. */
    kind: varchar("kind", { length: 12 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number", unsigned: true }).notNull(),
    sha256: varchar("sha256", { length: 64 }),
    width: int("width"),
    height: int("height"),
    durationSec: int("duration_sec"),
    /** pending -> ready -> (abandoned | deleted) */
    status: varchar("status", { length: 12 }).notNull().default("pending"),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    ownerIdx: index("media_owner_idx").on(t.ownerId),
    hashIdx: index("media_sha_idx").on(t.sha256),
    statusIdx: index("media_status_idx").on(t.status),
  }),
);

export type MediaRow = typeof media.$inferSelect;
