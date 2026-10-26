"use client";

/**
 * Browser Socket.IO manager. Authenticates with the same HttpOnly session
 * cookie used by REST calls (same-origin deployment) and transparently
 * reconnects. Missed messages are always recoverable via REST, so socket
 * delivery is a fast path, never the only path.
 */
import { io, type Socket } from "socket.io-client";

const REALTIME_PATH = "/api/realtime";

let socket: Socket | null = null;
const connectionListeners = new Set<(connected: boolean) => void>();

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io({
    path: REALTIME_PATH,
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  socket.on("connect", () => notify(true));
  socket.on("disconnect", () => notify(false));
  socket.on("connect_error", (err) => {
    // Expected for anonymous users; the UI gates realtime features on auth.
    if (err.message !== "unauthorized") console.warn("[realtime]", err.message);
    notify(false);
  });
  return socket;
}

function notify(connected: boolean) {
  for (const listener of connectionListeners) listener(connected);
}

export function onConnectionChange(listener: (connected: boolean) => void): () => void {
  connectionListeners.add(listener);
  listener(Boolean(socket?.connected));
  return () => connectionListeners.delete(listener);
}

export function isConnected(): boolean {
  return Boolean(socket?.connected);
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
