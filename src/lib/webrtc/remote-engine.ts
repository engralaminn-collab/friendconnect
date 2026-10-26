"use client";

/**
 * Adapter that presents the same surface as the local CallEngine
 * (CallSnapshot + overlay controls) while driving a real cross-device call
 * through CallManager: authenticated Socket.IO signaling, real SDP/ICE and
 * live peer statistics. No loopback, no synthetic peer.
 */
import { CallManager, getCallManager, type CallManagerState } from "@/lib/realtime/call-manager";
import { estimateMos, type CallSnapshot, type CallState } from "../webrtc";

const ZERO_QUALITY: CallSnapshot["quality"] = {
  rttMs: 0,
  jitterMs: 0,
  lossPct: 0,
  bitrateKbps: 0,
  mos: 0,
  codec: "—",
  packetsSent: 0,
  packetsReceived: 0,
  bytesSent: 0,
  bytesReceived: 0,
};

const PHASE_MAP: Record<CallManagerState["phase"], CallState> = {
  idle: "idle",
  ringing: "ringing",
  outgoing: "dialling",
  connecting: "connecting",
  active: "active",
  ended: "ended",
  declined: "ended",
  failed: "failed",
};

export class RemoteCallEngine {
  private manager: CallManager;
  private unsubscribe: (() => void) | null = null;
  private listeners = new Set<(s: CallSnapshot) => void>();
  private snapshot: CallSnapshot = {
    state: "idle",
    localStream: null,
    remoteStream: null,
    muted: false,
    cameraOff: false,
    sharing: false,
    speakerOn: true,
    elapsedSec: 0,
    quality: { ...ZERO_QUALITY },
  };
  private statsTimer: ReturnType<typeof setInterval> | null = null;

  constructor(manager?: CallManager) {
    this.manager = manager ?? getCallManager();
  }

  get current(): CallSnapshot {
    return this.snapshot;
  }

  subscribe(fn: (s: CallSnapshot) => void): () => void {
    this.listeners.add(fn);
    fn(this.snapshot);
    if (!this.unsubscribe) {
      this.unsubscribe = this.manager.subscribe((state, local, remote) => {
        this.snapshot = {
          ...this.snapshot,
          state: PHASE_MAP[state.phase],
          localStream: local,
          remoteStream: remote,
          muted: state.muted,
          cameraOff: !state.cameraOn,
          sharing: state.sharing,
          elapsedSec: state.elapsedSec,
          error: state.error ?? undefined,
        };
        this.emit();
        if (state.phase === "active" && !this.statsTimer) this.startStats();
        if (["ended", "failed", "declined"].includes(state.phase)) this.stopStats();
      });
    }
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const l of this.listeners) l(this.snapshot);
  }

  private startStats() {
    const tick = async () => {
      const stats = await this.manager.collectStats();
      if (!stats) return;
      this.snapshot = {
        ...this.snapshot,
        quality: { ...stats, mos: estimateMos(stats.rttMs, stats.jitterMs, stats.lossPct) },
      };
      this.emit();
    };
    void tick();
    this.statsTimer = setInterval(() => void tick(), 2000);
  }

  private stopStats() {
    if (this.statsTimer) clearInterval(this.statsTimer);
    this.statsTimer = null;
  }

  /** Outgoing call to a real peer in another session. */
  async start(conversationId: string, peerId: string, kind: "audio" | "video") {
    await this.manager.start(conversationId, peerId, kind);
  }

  /** Callee accepts an incoming ring. */
  async accept(callId: string, peerId: string, kind: "audio" | "video") {
    await this.manager.accept(callId, peerId, kind);
  }

  decline(callId: string) {
    this.manager.decline(callId);
  }

  toggleMute() {
    void this.manager.toggleMute();
  }

  toggleCamera() {
    void this.manager.toggleCamera();
  }

  toggleSpeaker() {
    this.snapshot = { ...this.snapshot, speakerOn: !this.snapshot.speakerOn };
    this.emit();
  }

  async switchCamera() {
    const videoTrack = this.snapshot.localStream?.getVideoTracks()[0];
    if (!videoTrack) return;
    try {
      const current = videoTrack.getSettings().facingMode;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: current === "user" ? "environment" : "user" },
      });
      const next = stream.getVideoTracks()[0];
      videoTrack.stop();
      this.snapshot.localStream?.removeTrack(videoTrack);
      this.snapshot.localStream?.addTrack(next);
      this.emit();
    } catch {
      /* Single-camera devices simply no-op. */
    }
  }

  async startScreenShare() {
    await this.manager.shareScreen();
  }

  hangUp() {
    void this.manager.hangup();
    this.stopStats();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
