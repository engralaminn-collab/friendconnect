import { datetime, index, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { users } from "./identity";

const now = () => new Date();

export const notifications = mysqlTable(
  "notifications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 40 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: varchar("body", { length: 500 }),
    data: json("data"),
    readAt: datetime("read_at", { fsp: 3 }),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    userReadIdx: index("notifications_user_read_idx").on(t.userId, t.readAt),
  }),
);

export type NotificationRow = typeof notifications.$inferSelect;
