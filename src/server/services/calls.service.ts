/**
 * Durable call state. The real-time SDP/ICE exchange happens over Socket.IO;
 * this service owns the persisted session/participant records and enforces
 * conversation membership for every operation.
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { callSessions, callParticipants, conversationMembers } from "../db/schema";
import { newId } from "../auth/tokens";
import { forbidden, notFound } from "../http/errors";
import { assertMembership } from "./conversations.service";
import { REALTIME_EVENTS, publishToUsers } from "../realtime/publisher";
import { env } from "../config/env";
import { createHash } from "node:crypto";

export const createCallSchema = z.object({
  conversationId: z.string().min(1).max(36),
  kind: z.enum(["audio", "video"]),
});

export async function createCall(
  userId: string,
  input: z.infer<typeof createCallSchema>,
) {
  await assertMembership(userId, input.conversationId);
  const db = getDb();
  const callId = newId("call");
  const now = new Date();
  const members = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, input.conversationId));

  await db.transaction(async (tx) => {
    await tx.insert(callSessions).values({
      id: callId,
      conversationId: input.conversationId,
      createdBy: userId,
      kind: input.kind,
      state: "ringing",
      startedAt: now,
      createdAt: now,
    });
    for (const m of members) {
      await tx.insert(callParticipants).values({
        id: newId("cp"),
        callId,
        userId: m.userId,
        state: m.userId === userId ? "active" : "invited",
        joinedAt: m.userId === userId ? now : null,
        muted: false,
        cameraOn: input.kind === "video",
        sharing: false,
      });
    }
  });

  const detail = await getCall(userId, callId);
  publishToUsers(
    members.map((m) => m.userId).filter((id) => id !== userId),
    REALTIME_EVENTS.callIncoming,
    detail,
  );
  return detail;
}

export async function joinCall(userId: string, callId: string) {
  const db = getDb();
  const callRows = await db.select().from(callSessions).where(eq(callSessions.id, callId)).limit(1);
  const call = callRows[0];
  if (!call) throw notFound("Call not found");
  if (call.conversationId) await assertMembership(userId, call.conversationId);
  const now = new Date();
  await db
    .insert(callParticipants)
    .values({ id: newId("cp"), callId, userId, state: "active", joinedAt: now })
    .onDuplicateKeyUpdate({
      set: { state: "active", joinedAt: now, leftAt: null },
    });
  if (call.state === "ringing") {
    await db.update(callSessions).set({ state: "active", answeredAt: now }).where(eq(callSessions.id, callId));
  }
  return getCall(userId, callId);
}

export async function leaveCall(userId: string, callId: string) {
  const db = getDb();
  const callRows = await db.select().from(callSessions).where(eq(callSessions.id, callId)).limit(1);
  const call = callRows[0];
  if (!call) throw notFound("Call not found");
  if (call.conversationId) await assertMembership(userId, call.conversationId);
  const now = new Date();
  await db
    .update(callParticipants)
    .set({ state: "left", leftAt: now, sharing: false })
    .where(and(eq(callParticipants.callId, callId), eq(callParticipants.userId, userId)));

  const active = await db
    .select({ id: callParticipants.id })
    .from(callParticipants)
    .where(
      and(
        eq(callParticipants.callId, callId),
        inArray(callParticipants.state, ["active", "ringing", "invited"]),
        isNull(callParticipants.leftAt),
      ),
    );
  if (!active.length) {
    const started = call.answeredAt ?? call.startedAt;
    const durationSec = Math.max(0, Math.round((now.getTime() - started.getTime()) / 1000));
    await db
      .update(callSessions)
      .set({ state: "ended", endedAt: now, durationSec, endReason: "all_left" })
      .where(eq(callSessions.id, callId));
  }
  return getCall(userId, callId);
}

export async function declineCall(userId: string, callId: string) {
  const db = getDb();
  const callRows = await db.select().from(callSessions).where(eq(callSessions.id, callId)).limit(1);
  const call = callRows[0];
  if (!call) throw notFound("Call not found");
  if (call.conversationId) await assertMembership(userId, call.conversationId);
  await db
    .insert(callParticipants)
    .values({ id: newId("cp"), callId, userId, state: "declined", joinedAt: null })
    .onDuplicateKeyUpdate({ set: { state: "declined", leftAt: new Date() } });
  const remaining = await db
    .select({ id: callParticipants.id })
    .from(callParticipants)
    .where(
      and(
        eq(callParticipants.callId, callId),
        inArray(callParticipants.state, ["invited", "ringing"]),
        isNull(callParticipants.leftAt),
      ),
    );
  if (!remaining.length) {
    await db
      .update(callSessions)
      .set({ state: "declined", endedAt: new Date(), endReason: "declined" })
      .where(eq(callSessions.id, callId));
  }
  return getCall(userId, callId);
}

export async function getCall(userId: string, callId: string) {
  const db = getDb();
  const callRows = await db.select().from(callSessions).where(eq(callSessions.id, callId)).limit(1);
  const call = callRows[0];
  if (!call) throw notFound("Call not found");
  if (call.conversationId) {
    const member = await db
      .select({ id: conversationMembers.userId })
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, call.conversationId),
          eq(conversationMembers.userId, userId),
        ),
      )
      .limit(1);
    if (!member.length) throw forbidden("Not a participant of this call");
  }
  const participants = await db
    .select()
    .from(callParticipants)
    .where(eq(callParticipants.callId, callId));
  return { call, participants };
}

export function iceConfig() {
  const iceServers: RTCIceServerLike[] = [];
  for (const url of env.STUN_URLS) iceServers.push({ urls: url });
  if (env.TURN_URLS.length) {
    iceServers.push({
      urls: env.TURN_URLS,
      username: env.TURN_USERNAME || undefined,
      credential: env.TURN_CREDENTIAL || ephemeralTurnCredential() || undefined,
    });
  }
  return { iceServers, sfu: env.LIVEKIT_URL ? { url: env.LIVEKIT_URL, configured: true } : null };
}

interface RTCIceServerLike {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/** RFC 5766-style ephemeral credential when a shared TURN secret is configured. */
function ephemeralTurnCredential(): string | null {
  if (!env.TURN_SHARED_SECRET) return null;
  const unixTs = Math.floor(Date.now() / 1000) + env.TURN_CREDENTIAL_TTL_SEC;
  const username = `${unixTs}:friendconnect`;
  return createHash("sha1").update(`${username}${env.TURN_SHARED_SECRET}`).digest("base64");
}
