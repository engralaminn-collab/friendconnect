/**
 * Persistence for the broad workspace modules (CRM, campaigns, education,
 * studios, knowledge, community). Records are owner-scoped JSON documents;
 * the messaging domain remains fully normalized in its own tables.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { workspaceRecords } from "../db/schema";
import { newId } from "../auth/tokens";
import { badRequest, notFound } from "../http/errors";

const COLLECTION_RE = /^[a-z0-9_-]{1,48}$/;

export const upsertRecordSchema = z.object({
  recordId: z.string().min(1).max(64),
  data: z.record(z.string(), z.unknown()),
});

export const bulkUpsertSchema = z.object({
  records: z
    .array(z.object({ recordId: z.string().min(1).max(64), data: z.record(z.string(), z.unknown()) }))
    .min(1)
    .max(500),
});

function assertCollection(collection: string) {
  if (!COLLECTION_RE.test(collection)) {
    throw badRequest("Invalid collection name");
  }
}

export async function listCollection(userId: string, collection: string) {
  assertCollection(collection);
  return getDb()
    .select()
    .from(workspaceRecords)
    .where(
      and(
        eq(workspaceRecords.userId, userId),
        eq(workspaceRecords.collection, collection),
      ),
    )
    .orderBy(desc(workspaceRecords.updatedAt));
}

export async function upsertRecord(
  userId: string,
  collection: string,
  recordId: string,
  data: Record<string, unknown>,
) {
  assertCollection(collection);
  const db = getDb();
  const now = new Date();
  const existing = await db
    .select({ id: workspaceRecords.id, createdAt: workspaceRecords.createdAt })
    .from(workspaceRecords)
    .where(
      and(
        eq(workspaceRecords.userId, userId),
        eq(workspaceRecords.collection, collection),
        eq(workspaceRecords.recordId, recordId),
      ),
    )
    .limit(1);
  if (existing.length) {
    await db
      .update(workspaceRecords)
      .set({ data, updatedAt: now })
      .where(eq(workspaceRecords.id, existing[0].id));
    return { recordId, created: false };
  }
  await db.insert(workspaceRecords).values({
    id: newId("wr"),
    userId,
    collection,
    recordId,
    data,
    createdAt: now,
    updatedAt: now,
  });
  return { recordId, created: true };
}

export async function bulkUpsert(
  userId: string,
  collection: string,
  records: { recordId: string; data: Record<string, unknown> }[],
) {
  assertCollection(collection);
  let created = 0;
  for (const r of records) {
    const res = await upsertRecord(userId, collection, r.recordId, r.data);
    if (res.created) created++;
  }
  return { total: records.length, created, updated: records.length - created };
}

export async function deleteRecord(userId: string, collection: string, recordId: string) {
  assertCollection(collection);
  const db = getDb();
  const rows = await db
  .select({ id: workspaceRecords.id })
  .from(workspaceRecords)
  .where(
    and(
      eq(workspaceRecords.userId, userId),
      eq(workspaceRecords.collection, collection),
      eq(workspaceRecords.recordId, recordId),
    ),
  )
  .limit(1);
  if (!rows.length) throw notFound("Record not found");
  await db.delete(workspaceRecords).where(eq(workspaceRecords.id, rows[0].id));
}

export async function exportAll(userId: string) {
  const rows = await getDb()
    .select({ collection: workspaceRecords.collection, recordId: workspaceRecords.recordId, data: workspaceRecords.data, updatedAt: workspaceRecords.updatedAt })
    .from(workspaceRecords)
    .where(eq(workspaceRecords.userId, userId));
  const byCollection: Record<string, unknown[]> = {};
  for (const r of rows) {
    (byCollection[r.collection] ??= []).push({ recordId: r.recordId, data: r.data });
  }
  return byCollection;
}

export { inArray };
