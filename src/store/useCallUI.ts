"use client";

/**
 * UI state for the globally-mounted call overlay. Both the messenger page and
 * the incoming-call layer render through this store so a call can be started
 * or answered from anywhere in the application.
 */
import { create } from "zustand";
import type { RemoteCallEngine } from "@/lib/webrtc/remote-engine";
import type { ID } from "@/lib/types";

interface ActiveCall {
  engine: RemoteCallEngine;
  kind: "audio" | "video";
  contactName: string;
  contactHue: number;
  conversationId: string;
  contactId?: ID;
  direction: "incoming" | "outgoing";
}

interface CallUIState {
  active: ActiveCall | null;
  start: (call: ActiveCall) => void;
  close: () => void;
}

export const useCallUI = create<CallUIState>()((set) => ({
  active: null,
  start: (call) => set({ active: call }),
  close: () => set({ active: null }),
}));
