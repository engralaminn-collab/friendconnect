"use client";

/**
 * WebRTC call manager for independent users on separate devices.
 *
 * Signaling (SDP offer/answer, ICE candidates, state changes, hang-up) is
 * exchanged over the authenticated Socket.IO connection; media flows peer to
 * peer using the STUN/TURN servers returned by /api/calls/config. Durable call
 * state is recorded through the REST calls API.
 */
import { callsApi } from "@/lib/api/resources";
import type { IceConfig } from "@/lib/api/types";
import { getSocket } from "./socket";
import { REALTIME_EVENTS } from "./events";

export type CallPhase =
  | "idle"
  | "ringing"
  | "outgoing"
  | "connecting"
  | "active"
  | "ended"
  | "declined"
  | "failed";

export interface CallManagerState {
  phase: CallPhase;
  callId: string | null;
  peerId: string | null;
  muted: boolean;
  cameraOn: boolean;
  sharing: boolean;
  elapsedSec: number;
  error: string | null;
}

type Listener = (state: CallManagerState, local: MediaStream | null, remote: MediaStream | null) => void;

export class CallManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private iceConfig: IceConfig | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt: number | null = null;
  private listeners = new Set<Listener>();
  private state: CallManagerState = {
    phase: "idle",
    callId: null,
    peerId: null,
    muted: false,
    cameraOn: true,
    sharing: false,
    elapsedSec: 0,
    error: null,
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state, this.localStream, this.remoteStream);
    return () => this.listeners.delete(listener);
  }

  private emit(patch: Partial<CallManagerState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state, this.localStream, this.remoteStream);
  }

  private async ensureIce(): Promise<IceConfig> {
    if (!this.iceConfig) this.iceConfig = await callsApi.config();
    return this.iceConfig;
  }

  private async getUserMedia(video: boolean): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video });
    } catch (err) {
      // Permission denial / headless environments: surface an honest error.
      this.emit({ error: "Microphone/camera permission denied or unavailable." });
      throw err;
    }
  }

  private createPeer(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: this.iceConfig?.iceServers ?? [] });
    this.remoteStream = new MediaStream();
    for (const track of this.localStream?.getTracks() ?? []) {
      pc.addTrack(track, this.localStream!);
    }
    pc.ontrack = (event) => {
      for (const track of event.streams[0]?.getTracks() ?? []) {
        if (!this.remoteStream!.getTracks().some((t) => t.id === track.id)) {
          this.remoteStream!.addTrack(track);
        }
      }
      this.emit({});
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && this.state.callId) {
        getSocket().emit("call:ice", {
          callId: this.state.callId,
          toUserId: peerId,
          candidate: event.candidate,
        });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this.startedAt ??= Date.now();
        this.startTimer();
        this.emit({ phase: "active" });
      }
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        if (pc.connectionState === "failed") this.emit({ phase: "failed", error: "Peer connection failed" });
      }
    };
    return pc;
  }

  /** Outgoing call: create the call record, ring the peer, then negotiate. */
  async start(conversationId: string, peerId: string, kind: "audio" | "video") {
    this.iceConfig = await this.ensureIce();
    const detail = await callsApi.create(conversationId, kind);
    const callId = detail.call.id;
    this.emit({ callId, peerId, phase: "outgoing", cameraOn: kind === "video", error: null });
    this.localStream = await this.getUserMedia(kind === "video");
    this.pc = this.createPeer(peerId);
    this.bindSignaling();

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    getSocket().emit("call:sdp", { callId, toUserId: peerId, sdp: offer });
  }

  /** Callee accepts an incoming call and answers with its own SDP. */
  async accept(callId: string, peerId: string, kind: "audio" | "video") {
    this.iceConfig = await this.ensureIce();
    this.emit({ callId, peerId, phase: "connecting" });
    this.bindSignaling();
    this.localStream = await this.getUserMedia(kind === "video");
    this.pc = this.createPeer(peerId);
    await callsApi.join(callId);
    // Drain signals that arrived before the peer connection existed.
    const pending = ringingCalls.get(callId);
    if (pending?.sdp) await this.onRemoteSdp({ callId, fromUserId: peerId, sdp: pending.sdp });
    for (const candidate of pending?.ices ?? []) {
      await this.onRemoteIce({ callId, fromUserId: peerId, candidate });
    }
    ringingCalls.delete(callId);
  }

  decline(callId: string) {
    void callsApi.decline(callId);
    this.emit({ phase: "declined" });
    this.teardown();
  }

  private bindSignaling() {
    const socket = getSocket();
    socket.on(REALTIME_EVENTS.callSdp, this.onRemoteSdp);
    socket.on(REALTIME_EVENTS.callIce, this.onRemoteIce);
    socket.on(REALTIME_EVENTS.callHangup, this.onRemoteHangup);
    socket.on(REALTIME_EVENTS.callReject, this.onRemoteReject);
    socket.on(REALTIME_EVENTS.callState, this.onRemoteState);
  }

  private onRemoteSdp = async (payload: {
    callId: string;
    fromUserId: string;
    sdp: RTCSessionDescriptionInit;
  }) => {
    if (payload.callId !== this.state.callId || !this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    if (payload.sdp.type === "offer") {
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      getSocket().emit("call:sdp", {
        callId: payload.callId,
        toUserId: payload.fromUserId,
        sdp: answer,
      });
      this.emit({ phase: "connecting" });
    }
  };

  private onRemoteIce = async (payload: {
    callId: string;
    fromUserId: string;
    candidate: RTCIceCandidateInit;
  }) => {
    if (payload.callId !== this.state.callId || !this.pc) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch {
      /* Candidate may arrive before remote description; ignore safely. */
    }
  };

  private onRemoteHangup = () => {
    this.emit({ phase: "ended" });
    this.teardown();
  };

  private onRemoteReject = () => {
    this.emit({ phase: "declined" });
    this.teardown();
  };

  private onRemoteState = (payload: { state: { muted?: boolean; cameraOn?: boolean; sharing?: boolean } }) => {
    this.emit({
      muted: payload.state.muted ?? this.state.muted,
      cameraOn: payload.state.cameraOn ?? this.state.cameraOn,
      sharing: payload.state.sharing ?? this.state.sharing,
    });
  };

  async toggleMute() {
    const track = this.localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    this.emit({ muted: !track.enabled });
    this.broadcastState({ muted: !track.enabled });
  }

  async toggleCamera() {
    let track = this.localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      this.emit({ cameraOn: track.enabled });
      this.broadcastState({ cameraOn: track.enabled });
    }
  }

  async shareScreen() {
    if (!this.pc || !this.localStream) return;
    if (this.state.sharing) {
      this.emit({ sharing: false });
      this.broadcastState({ sharing: false });
      return;
    }
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = display.getVideoTracks()[0];
    const sender = this.pc.getSenders().find((s) => s.track?.kind === "video");
    await sender?.replaceTrack(screenTrack);
    screenTrack.onended = () => {
      const camera = this.localStream!.getVideoTracks()[0];
      void sender?.replaceTrack(camera ?? null);
      this.emit({ sharing: false });
    };
    this.emit({ sharing: true });
    this.broadcastState({ sharing: true });
  }

  private broadcastState(state: { muted?: boolean; cameraOn?: boolean; sharing?: boolean }) {
    if (!this.state.callId) return;
    getSocket().emit("call:state", { callId: this.state.callId, state });
  }

  private startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.startedAt) this.emit({ elapsedSec: Math.round((Date.now() - this.startedAt) / 1000) });
    }, 1000);
  }

  /** Real WebRTC statistics from the live peer connection. */
  async collectStats(): Promise<{
    rttMs: number;
    jitterMs: number;
    lossPct: number;
    bitrateKbps: number;
    codec: string;
    packetsSent: number;
    packetsReceived: number;
    bytesSent: number;
    bytesReceived: number;
  } | null> {
    if (!this.pc) return null;
    const report = await this.pc.getStats();
    let rttMs = 0;
    let jitterMs = 0;
    let packetsLost = 0;
    let packetsReceived = 0;
    let packetsSent = 0;
    let bytesSent = 0;
    let bytesReceived = 0;
    let codec = "—";
    const codecs = new Map<string, string>();
    for (const stat of report.values()) {
      if (stat.type === "codec" && stat.mimeType) codecs.set(stat.id, String(stat.mimeType).replace("audio/", "").replace("video/", ""));
      if (stat.type === "candidate-pair" && stat.nominated && stat.currentRoundTripTime) {
        rttMs = Math.round(stat.currentRoundTripTime * 1000);
      }
      if (stat.type === "inbound-rtp") {
        jitterMs = Math.max(jitterMs, Math.round((stat.jitter ?? 0) * 1000));
        packetsLost += stat.packetsLost ?? 0;
        packetsReceived += stat.packetsReceived ?? 0;
        bytesReceived += stat.bytesReceived ?? 0;
        if (stat.codecId && codecs.has(stat.codecId)) codec = codecs.get(stat.codecId)!;
      }
      if (stat.type === "outbound-rtp") {
        packetsSent += stat.packetsSent ?? 0;
        bytesSent += stat.bytesSent ?? 0;
        if (stat.codecId && codecs.has(stat.codecId)) codec = codecs.get(stat.codecId)!;
      }
    }
    const total = packetsReceived + packetsLost;
    const lossPct = total > 0 ? Number(((packetsLost / total) * 100).toFixed(1)) : 0;
    return {
      rttMs,
      jitterMs,
      lossPct,
      bitrateKbps: Math.round(((bytesSent + bytesReceived) * 8) / 1000 / Math.max(1, this.state.elapsedSec || 1)),
      codec,
      packetsSent,
      packetsReceived,
      bytesSent,
      bytesReceived,
    };
  }

  async hangup() {
    if (this.state.callId) {
      getSocket().emit("call:hangup" as never, { callId: this.state.callId });
      await callsApi.leave(this.state.callId).catch(() => undefined);
    }
    this.emit({ phase: "ended" });
    this.teardown();
  }

  private teardown() {
    const socket = getSocket();
    socket.off(REALTIME_EVENTS.callSdp, this.onRemoteSdp);
    socket.off(REALTIME_EVENTS.callIce, this.onRemoteIce);
    socket.off(REALTIME_EVENTS.callHangup, this.onRemoteHangup);
    socket.off(REALTIME_EVENTS.callReject, this.onRemoteReject);
    socket.off(REALTIME_EVENTS.callState, this.onRemoteState);
    this.pc?.close();
    this.pc = null;
    for (const track of this.localStream?.getTracks() ?? []) track.stop();
    this.localStream = null;
    this.remoteStream = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.startedAt = null;
  }
}

/** Early signals for calls that are ringing but not yet accepted. */
interface PendingCall {
  peerId: string;
  kind: "audio" | "video";
  sdp: RTCSessionDescriptionInit | null;
  ices: RTCIceCandidateInit[];
}
const ringingCalls = new Map<string, PendingCall>();
let globalArmed = false;

function armGlobalSignaling() {
  if (globalArmed) return;
  globalArmed = true;
  const socket = getSocket();
  socket.on(REALTIME_EVENTS.callSdp, (payload: { callId: string; sdp: RTCSessionDescriptionInit }) => {
    const pending = ringingCalls.get(payload.callId);
    if (pending && payload.sdp.type === "offer") pending.sdp = payload.sdp;
  });
  socket.on(
    REALTIME_EVENTS.callIce,
    (payload: { callId: string; candidate: RTCIceCandidateInit }) => {
      ringingCalls.get(payload.callId)?.ices.push(payload.candidate);
    },
  );
}

/** Register an incoming ring so early SDP/ICE are buffered until acceptance. */
export function registerIncomingCall(
  callId: string,
  peerId: string,
  kind: "audio" | "video",
): PendingCall {
  armGlobalSignaling();
  const pending: PendingCall = { peerId, kind, sdp: null, ices: [] };
  ringingCalls.set(callId, pending);
  return pending;
}

let manager: CallManager | null = null;
export function getCallManager(): CallManager {
  manager ??= new CallManager();
  armGlobalSignaling();
  return manager;
}
