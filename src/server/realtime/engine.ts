/**
 * Authenticated Socket.IO engine.
 *
 * - Handshake is authenticated from the session cookie or an auth token, using
 *   the same database sessions as HTTP route handlers.
 * - Users join a personal room (`user:{id}`) and rooms for every conversation
 *   they belong to (`conv:{id}`); conversation events are re-checked against
 *   membership before any relay.
 * - Typing state is ephemeral with an automatic expiry — never stored.
 * - Call signaling (SDP/ICE) is relayed only between call participants.
 */
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { and, eq } from "drizzle-orm";
import { env } from "../config/env";
import { authenticateSocketToken } from "../auth/session";
import { sessionCookieName, parseCookieHeader } from "../auth/cookies";
import { getDb } from "../db/client";
import { conversationMembers, callParticipants } from "../db/schema";
import { REALTIME_EVENTS, registerIo } from "./publisher";
import { acknowledgeDelivery } from "../services/messages.service";
import { markConversationRead } from "../services/conversations.service";

interface SocketData {
  userId: string;
  sessionId: string;
  conversationIds: Set<string>;
}

type FcSocket = Socket<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>;

const TYPING_TTL_MS = 8_000;
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const presence = new Map<string, Set<string>>();

function corsOrigin(): string[] {
  const origins = [env.APP_URL, ...env.ALLOWED_ORIGINS, ...env.WEBSOCKET_CORS_ORIGINS].filter(Boolean);
  return [...new Set(origins)];
}

export function initRealtime(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: env.WEBSOCKET_PATH,
    cors: { origin: corsOrigin(), credentials: true },
    transports: ["websocket", "polling"],
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60_000, skipMiddlewares: false },
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookieHeader(cookieHeader);
      const token =
        cookies[sessionCookieName()] ||
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers["x-fc-session-token"] as string | undefined);
      const resolved = await authenticateSocketToken(token);
      if (!resolved) return next(new Error("unauthorized"));
      socket.data.userId = resolved.user.id;
      socket.data.sessionId = resolved.sessionId;
      socket.data.conversationIds = new Set();
      next();
    } catch (err) {
      next(err instanceof Error ? err : new Error("handshake_failed"));
    }
  });

  io.on("connection", (socket: FcSocket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    trackPresence(io, userId, socket.id);

    // Join all conversation rooms this user belongs to.
    void (async () => {
      const memberships = await getDb()
        .select({ conversationId: conversationMembers.conversationId })
        .from(conversationMembers)
        .where(eq(conversationMembers.userId, userId));
      for (const m of memberships) {
        socket.data.conversationIds.add(m.conversationId);
        socket.join(`conv:${m.conversationId}`);
      }
      io.to(`user:${userId}`).emit(REALTIME_EVENTS.presence, { userId, online: true });
    })();

    socket.on("conversation:subscribe", (payload: { conversationId?: string }, ack?: (r: unknown) => void) => {
      if (!payload?.conversationId || !socket.data.conversationIds.has(payload.conversationId)) {
        ack?.({ ok: false, error: "not_a_member" });
        return;
      }
      socket.join(`conv:${payload.conversationId}`);
      ack?.({ ok: true });
    });

    socket.on(
      "typing",
      (payload: { conversationId?: string; typing?: boolean }, ack?: (r: unknown) => void) => {
        const conversationId = payload?.conversationId;
        if (!conversationId || !socket.data.conversationIds.has(conversationId)) {
          ack?.({ ok: false, error: "not_a_member" });
          return;
        }
        const timerKey = `${conversationId}:${userId}`;
        clearTimeout(typingTimers.get(timerKey));
        io.to(`conv:${conversationId}`).emit(REALTIME_EVENTS.typing, {
          conversationId,
          userId,
          typing: payload.typing !== false,
        });
        if (payload.typing !== false) {
          typingTimers.set(
            timerKey,
            setTimeout(() => {
              io.to(`conv:${conversationId}`).emit(REALTIME_EVENTS.typing, {
                conversationId,
                userId,
                typing: false,
              });
              typingTimers.delete(timerKey);
            }, TYPING_TTL_MS),
          );
        }
        ack?.({ ok: true });
      },
    );

    socket.on(
      "message:delivered",
      async (payload: { conversationId?: string; upToMessageId?: string }, ack?: (r: unknown) => void) => {
        try {
          if (!payload?.conversationId || !socket.data.conversationIds.has(payload.conversationId)) {
            ack?.({ ok: false, error: "not_a_member" });
            return;
          }
          const result = await acknowledgeDelivery(userId, payload.conversationId, payload.upToMessageId);
          ack?.({ ok: true, ...result });
        } catch (err) {
          ack?.({ ok: false, error: err instanceof Error ? err.message : "failed" });
        }
      },
    );

    socket.on(
      "message:read",
      async (payload: { conversationId?: string }, ack?: (r: unknown) => void) => {
        try {
          if (!payload?.conversationId || !socket.data.conversationIds.has(payload.conversationId)) {
            ack?.({ ok: false, error: "not_a_member" });
            return;
          }
          const messageIds = await markConversationRead(userId, payload.conversationId);
          io.to(`conv:${payload.conversationId}`).emit(REALTIME_EVENTS.messageReceipt, {
            conversationId: payload.conversationId,
            userId,
            state: "read",
            messageIds,
          });
          ack?.({ ok: true, messageIds });
        } catch (err) {
          ack?.({ ok: false, error: err instanceof Error ? err.message : "failed" });
        }
      },
    );

    // ---- Call signaling ----------------------------------------------------
    socket.on(
      "call:sdp",
      async (payload: { callId?: string; toUserId?: string; sdp?: unknown }, ack?: (r: unknown) => void) => {
        if (!payload?.callId || !payload.toUserId || !(await isCallParticipant(payload.callId, userId))) {
          ack?.({ ok: false, error: "not_allowed" });
          return;
        }
        io.to(`user:${payload.toUserId}`).emit(REALTIME_EVENTS.callSdp, {
          callId: payload.callId,
          fromUserId: userId,
          sdp: payload.sdp,
        });
        ack?.({ ok: true });
      },
    );

    socket.on(
      "call:ice",
      async (payload: { callId?: string; toUserId?: string; candidate?: unknown }, ack?: (r: unknown) => void) => {
        if (!payload?.callId || !payload.toUserId || !(await isCallParticipant(payload.callId, userId))) {
          ack?.({ ok: false, error: "not_allowed" });
          return;
        }
        io.to(`user:${payload.toUserId}`).emit(REALTIME_EVENTS.callIce, {
          callId: payload.callId,
          fromUserId: userId,
          candidate: payload.candidate,
        });
        ack?.({ ok: true });
      },
    );

    socket.on(
      "call:state",
      async (
        payload: { callId?: string; state?: { muted?: boolean; cameraOn?: boolean; sharing?: boolean } },
        ack?: (r: unknown) => void,
      ) => {
        if (!payload?.callId || !(await isCallParticipant(payload.callId, userId))) {
          ack?.({ ok: false, error: "not_allowed" });
          return;
        }
        const participants = await getDb()
          .select({ userId: callParticipants.userId })
          .from(callParticipants)
          .where(eq(callParticipants.callId, payload.callId));
        for (const p of participants) {
          if (p.userId === userId) continue;
          io.to(`user:${p.userId}`).emit(REALTIME_EVENTS.callState, {
            callId: payload.callId,
            fromUserId: userId,
            state: payload.state,
          });
        }
        ack?.({ ok: true });
      },
    );

    // ---- Call lifecycle relays -------------------------------------------
    const relayToCallPeers = async (
      eventName: string,
      payload: { callId?: string; [key: string]: unknown },
      ack?: (r: unknown) => void,
    ) => {
      if (!payload?.callId || !(await isCallParticipant(payload.callId, userId))) {
        ack?.({ ok: false, error: "not_allowed" });
        return;
      }
      const participants = await getDb()
        .select({ userId: callParticipants.userId, state: callParticipants.state })
        .from(callParticipants)
        .where(eq(callParticipants.callId, payload.callId));
      for (const p of participants) {
        if (p.userId === userId) continue;
        io.to(`user:${p.userId}`).emit(eventName, { ...payload, fromUserId: userId });
      }
      ack?.({ ok: true });
    };

    socket.on(REALTIME_EVENTS.callHangup, (payload, ack) => {
      void relayToCallPeers(REALTIME_EVENTS.callHangup, payload, ack);
    });
    socket.on(REALTIME_EVENTS.callAccept, (payload, ack) => {
      void relayToCallPeers(REALTIME_EVENTS.callAccept, payload, ack);
    });
    socket.on(REALTIME_EVENTS.callReject, (payload, ack) => {
      void relayToCallPeers(REALTIME_EVENTS.callReject, payload, ack);
    });

    socket.on("disconnect", () => {
      const set = presence.get(userId);
      set?.delete(socket.id);
      if (!set || set.size === 0) {
        presence.delete(userId);
        io.emit(REALTIME_EVENTS.presence, { userId, online: false });
      }
    });
  });

  registerIo(io);
  return io;
}

function trackPresence(io: Server, userId: string, socketId: string) {
  const set = presence.get(userId) ?? new Set<string>();
  const wasOnline = set.size > 0;
  set.add(socketId);
  presence.set(userId, set);
  if (!wasOnline) io.emit(REALTIME_EVENTS.presence, { userId, online: true });
}

async function isCallParticipant(callId: string, userId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: callParticipants.id })
    .from(callParticipants)
    .where(and(eq(callParticipants.callId, callId), eq(callParticipants.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export function onlineUserIds(): string[] {
  return [...presence.keys()];
}
