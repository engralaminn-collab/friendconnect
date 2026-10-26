"use client";

import * as React from "react";
import { getSocket, onConnectionChange } from "./socket";
import type { RealtimeEventName } from "./events";

/** Subscribe to a realtime event; handler identity changes re-bind safely. */
export function useSocketEvent<T = unknown>(event: RealtimeEventName, handler: (payload: T) => void) {
  const ref = React.useRef(handler);
  ref.current = handler;
  React.useEffect(() => {
    const socket = getSocket();
    const wrapped = (payload: T) => ref.current(payload);
    socket.on(event, wrapped);
    return () => {
      socket.off(event, wrapped);
    };
  }, [event]);
}

export function useRealtimeConnected(): boolean {
  const [connected, setConnected] = React.useState(false);
  React.useEffect(() => {
    const socket = getSocket();
    setConnected(socket.connected);
    return onConnectionChange(setConnected);
  }, []);
  return connected;
}

/** Emit a typing event with automatic stop after a short idle period. */
export function useTypingEmitter(conversationId: string | null) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  return React.useMemo(() => {
    if (!conversationId) return { start: () => {}, stop: () => {} };
    const socket = getSocket();
    return {
      start() {
        socket.emit("typing", { conversationId, typing: true });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          socket.emit("typing", { conversationId, typing: false });
        }, 4000);
      },
      stop() {
        if (timer.current) clearTimeout(timer.current);
        socket.emit("typing", { conversationId, typing: false });
      },
    };
  }, [conversationId]);
}
