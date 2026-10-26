"use client";

import * as React from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useSocketEvent } from "@/lib/realtime/useRealtime";
import { registerIncomingCall, getCallManager } from "@/lib/realtime/call-manager";
import { RemoteCallEngine } from "@/lib/webrtc/remote-engine";
import { useMessenger } from "@/store/useMessenger";
import type { CallDto } from "@/lib/api/types";

interface Ring {
  callId: string;
  peerId: string;
  conversationId: string;
  kind: "audio" | "video";
}

export interface AcceptedCall {
  engine: RemoteCallEngine;
  kind: "audio" | "video";
  conversationId: string;
  contactName: string;
}

/**
 * Listens for authenticated call:incoming events and lets the user accept or
 * decline a real cross-device call. Accepting hands a RemoteCallEngine to the
 * globally-mounted call layer.
 */
export function IncomingCallDialog({
  onAccept,
}: {
  onAccept: (call: AcceptedCall) => void;
}) {
  const [ring, setRing] = React.useState<Ring | null>(null);
  const [busy, setBusy] = React.useState(false);
  const threads = useMessenger((s) => s.threads);

  useSocketEvent<CallDto>("call:incoming", (detail) => {
    const call = detail.call;
    if (!call.conversationId) return;
    registerIncomingCall(call.id, call.createdBy, call.kind);
    setRing({
      callId: call.id,
      peerId: call.createdBy,
      conversationId: call.conversationId,
      kind: call.kind,
    });
  });

  const callerName =
    threads.find((t) => t.id === ring?.conversationId)?.contactName ?? "Unknown caller";

  const accept = async () => {
    if (!ring || busy) return;
    setBusy(true);
    try {
      const engine = new RemoteCallEngine(getCallManager());
      onAccept({
        engine,
        kind: ring.kind,
        conversationId: ring.conversationId,
        contactName: callerName,
      });
      await engine.accept(ring.callId, ring.peerId, ring.kind);
      setRing(null);
    } catch (err) {
      console.error("[calls] accept failed", err);
    } finally {
      setBusy(false);
    }
  };

  const decline = () => {
    if (!ring) return;
    new RemoteCallEngine(getCallManager()).decline(ring.callId);
    setRing(null);
  };

  if (!ring) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-[90] mx-auto w-[min(92vw,420px)] rounded-2xl border border-white/10 bg-[#0d1024]/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-300">
          {ring.kind === "video" ? <Video className="size-5" /> : <Phone className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{callerName}</p>
          <p className="text-[12px] text-white/55">Incoming {ring.kind} call · ringing…</p>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={decline}
          disabled={busy}
          className="btn btn-danger flex flex-1 items-center justify-center gap-2"
        >
          <PhoneOff className="size-4" /> Decline
        </button>
        <button
          onClick={() => void accept()}
          disabled={busy}
          className="btn btn-primary flex flex-1 items-center justify-center gap-2"
        >
          <Phone className="size-4" /> {busy ? "Connecting…" : "Accept"}
        </button>
      </div>
    </div>
  );
}
