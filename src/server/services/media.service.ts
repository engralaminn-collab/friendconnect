/**
 * Media upload/download orchestration: byte validation, content sniffing,
 * private storage persistence, metadata and access authorization.
 */
import { createHash } from "node:crypto";
import { and, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  media,
  messageAttachments,
  messages,
  conversationMembers,
  type MediaRow,
} from "../db/schema";
import { env } from "../config/env";
import { buildObjectKey, getStorage } from "../storage/drivers";
import { sniffMediaType, type MediaKind } from "../storage/magic";
import { newId } from "../auth/tokens";
import { forbidden, notFound, payloadTooLarge, unsupportedMediaType } from "../http/errors";

export interface UploadInput {
  filename: string;
  declaredMime: string;
  bytes: Buffer;
  /** Caller-declared category for voice notes; still validated against bytes. */
  expectedKind?: MediaKind;
  durationSec?: number;
  width?: number;
  height?: number;
}

export async function storeUploadedMedia(ownerId: string, input: UploadInput): Promise<MediaRow> {
  const maxBytes = env.MEDIA_MAX_UPLOAD_MB * 1024 * 1024;
  if (input.bytes.length === 0) throw unsupportedMediaType("Empty file");
  if (input.bytes.length > maxBytes) {
    throw payloadTooLarge(`File exceeds the ${env.MEDIA_MAX_UPLOAD_MB}MB limit`);
  }
  const sniffed = sniffMediaType(input.bytes, input.declaredMime || "");
  if (!sniffed) throw unsupportedMediaType("File content is not an allowed media type");

  let kind = sniffed.kind;
  // Voice notes are audio/webm or audio/mp4 recordings flagged by the client.
  if (input.expectedKind === "voice" && sniffed.kind === "audio") kind = "voice";
  if (input.expectedKind && !["audio", "voice"].includes(input.expectedKind) && input.expectedKind !== kind) {
    throw unsupportedMediaType(`Declared kind ${input.expectedKind} does not match content`);
  }

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const storage = getStorage();
  const objectKey = buildObjectKey(kind, sniffed.ext);
  await storage.put(input.bytes, { mime: sniffed.mime, objectKey });

  const id = newId("media");
  const row: typeof media.$inferInsert = {
    id,
    ownerId,
    driver: storage.name,
    bucket: storage.name === "s3" ? env.S3_BUCKET : null,
    objectKey,
    filename: input.filename.slice(0, 255),
    mime: sniffed.mime,
    kind,
    sizeBytes: input.bytes.length,
    sha256,
    width: input.width ?? null,
    height: input.height ?? null,
    durationSec: input.durationSec ?? null,
    status: "ready",
  };
  await getDb().insert(media).values(row);
  const inserted = await getDb().select().from(media).where(eq(media.id, id)).limit(1);
  return inserted[0];
}

/** True when the user owns the media or belongs to a conversation using it. */
export async function canAccessMedia(userId: string, mediaId: string): Promise<boolean> {
  const db = getDb();
  const owned = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.ownerId, userId)))
    .limit(1);
  if (owned.length) return true;

  const convRows = await db
    .select({ conversationId: messages.conversationId })
    .from(messageAttachments)
    .innerJoin(messages, eq(messages.id, messageAttachments.messageId))
    .where(eq(messageAttachments.mediaId, mediaId));
  const convIds = [...new Set(convRows.map((r) => r.conversationId))];
  if (!convIds.length) return false;
  const member = await db
    .select({ id: conversationMembers.conversationId })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.userId, userId),
        inArray(conversationMembers.conversationId, convIds),
      ),
    )
    .limit(1);
  return member.length > 0;
}

export async function getAuthorizedMedia(
  userId: string,
  mediaId: string,
): Promise<{ row: MediaRow; bytes?: Buffer; presignedUrl?: string | null }> {
  const rows = await getDb().select().from(media).where(eq(media.id, mediaId)).limit(1);
  const row = rows[0];
  if (!row || row.status === "deleted") throw notFound("Media not found");
  if (!(await canAccessMedia(userId, mediaId))) throw forbidden("Not authorized for this media");

  const storage = getStorage();
  if (row.driver === "s3") {
    const presignedUrl = await storage.presignedGetUrl(row.objectKey);
    if (presignedUrl) return { row, presignedUrl };
  }
  const bytes = await storage.get(row.objectKey);
  return { row, bytes };
}

export async function markAbandonedMediaOlderThan(ms: number): Promise<number> {
  const cutoff = new Date(Date.now() - ms);
  const db = getDb();
  const pending = await db
    .select({ id: media.id, objectKey: media.objectKey })
    .from(media)
    .where(and(eq(media.status, "pending"), lt(media.createdAt, cutoff)));
  let removed = 0;
  for (const item of pending) {
    await getStorage().delete(item.objectKey).catch(() => undefined);
    await db.delete(media).where(eq(media.id, item.id));
    removed++;
  }
  return removed;
}
