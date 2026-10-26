/**
 * Thin publishing bridge between services and the Socket.IO engine.
 *
 * Services emit domain events here without importing Socket.IO, which keeps
 * them testable in plain Node. The realtime engine registers its server during
 * startup; when no server exists (CLI scripts, unit tests) emits are no-ops.
 */
import type { Server } from "socket.io";

/**
 * The Socket.IO server may be created by the custom-server process (its own
 * bundled module graph) while Route Handlers run inside Next's webpack graph.
 * Both graphs execute in the same Node process, so we bridge the singleton via
 * globalThis instead of a module-level variable.
 */
const IO_GLOBAL_KEY = Symbol.for("friendconnect.io");
const globalStore = globalThis as unknown as Record<symbol, unknown>;

export function registerIo(server: Server): void {
  globalStore[IO_GLOBAL_KEY] = server;
}

export function getIo(): Server | null {
  return (globalStore[IO_GLOBAL_KEY] as Server | undefined) ?? null;
}

export function publishToUsers(userIds: string[], event: string, payload: unknown): void {
  const server = getIo();
  if (!server || userIds.length === 0) return;
  for (const userId of userIds) {
    server.to(`user:${userId}`).emit(event, payload);
  }
}

export function publishToConversation(
  conversationId: string,
  event: string,
  payload: unknown,
): void {
  const server = getIo();
  if (!server) return;
  server.to(`conv:${conversationId}`).emit(event, payload);
}

export const REALTIME_EVENTS = {
  messageNew: "message:new",
  messageUpdate: "message:update",
  messageDelete: "message:delete",
  messageReceipt: "message:receipt",
  reactionUpdate: "message:reaction",
  pollUpdate: "poll:update",
  typing: "typing",
  conversationUpdate: "conversation:update",
  conversationNew: "conversation:new",
  presence: "presence",
  notification: "notification:new",
  callIncoming: "call:incoming",
  callAccept: "call:accept",
  callReject: "call:reject",
  callSdp: "call:sdp",
  callIce: "call:ice",
  callState: "call:state",
  callHangup: "call:hangup",
} as const;
