import { datetime, index, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { users } from "./identity";

const now = () => new Date();

/** Append-only security/business audit trail. Never stores secrets. */
export const auditEvents = mysqlTable(
  "audit_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorId: varchar("actor_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 64 }).notNull(),
    resourceType: varchar("resource_type", { length: 48 }),
    resourceId: varchar("resource_id", { length: 64 }),
    ip: varchar("ip", { length: 45 }),
    userAgent: varchar("user_agent", { length: 300 }),
    metadata: json("metadata"),
    createdAt: datetime("created_at", { fsp: 3 }).notNull().$defaultFn(now),
  },
  (t) => ({
    actorIdx: index("audit_events_actor_idx").on(t.actorId),
    resourceIdx: index("audit_events_resource_idx").on(t.resourceType, t.resourceId),
    actionIdx: index("audit_events_action_idx").on(t.action),
  }),
);

export type AuditEventRow = typeof auditEvents.$inferSelect;
