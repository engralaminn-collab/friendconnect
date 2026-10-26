import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../db/client";
import { notifications } from "../db/schema";
import { newId } from "../auth/tokens";
import { notFound } from "../http/errors";
import { REALTIME_EVENTS, publishToUsers } from "../realtime/publisher";

export async function listNotifications(userId: string, unreadOnly = false, limit = 50) {
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) conditions.push(isNull(notifications.readAt));
  return getDb()
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function createNotification(
  userId: string,
  kind: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const id = newId("ntf");
  await getDb().insert(notifications).values({
    id,
    userId,
    kind,
    title,
    body,
    data: data ?? undefined,
  });
  publishToUsers([userId], REALTIME_EVENTS.notification, { id, kind, title, body, data });
  return id;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .limit(1);
  if (!rows.length) throw notFound("Notification not found");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: string) {
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
