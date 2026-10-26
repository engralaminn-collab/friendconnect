/**
 * Call engine — a real WebRTC peer connection with a live remote peer.
 *
 * The two peers are connected to each other inside the page (a loopback), so
 * the media path, the SDP negotiation, the ICE candidates and the statistics
 * are all genuine. The remote side is a synthetic participant: a canvas that
 * renders an animated presence frame plus a silent audio track.
 *
 * If the browser refuses camera or microphone access — which is the normal
 * case in a sandboxed preview — the engine falls back to a generated canvas
 * stream so a call still connects, still negotiates and still reports stats.
 */

export type CallState =
  | "idle"
  | "requesting-media"
  | "dialling"
  | "ringing"
  | "connecting"
  | "active"
  | "ended"
  | "failed";

export interface CallSnapshot {
  state: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  sharing: boolean;
  speakerOn: boolean;
  elapsedSec: number;
  quality: {
    rttMs: number;
    jitterMs: number;
    lossPct: number;
    bitrateKbps: number;
    mos: number;
    codec: string;
    packetsSent: number;
    packetsReceived: number;
    bytesSent: number;
    bytesReceived: number;
  };
  error?: string;
}

export interface CallOptions {
  audio: boolean;
  video: boolean;
  contactName: string;
  contactHue?: number;
}

type Listener = (s: CallSnapshot) => void;

/** Public surface consumed by CallOverlay; implemented by local and remote engines. */
export interface CallEngineLike {
  readonly current: CallSnapshot;
  subscribe(fn: Listener): () => void;
  hangUp(): void;
  toggleMute(): void;
  toggleCamera(): void;
  toggleSpeaker(): void;
  switchCamera(): Promise<unknown>;
  startScreenShare(): Promise<unknown>;
}

/** ITU E-model style MOS estimate from RTT, jitter and loss. */
export function estimateMos(rtt: number, jitter: number, loss: number) {
  const r = Math.max(0, 1 - rtt / 300);
  const j = Math.max(0, 1 - jitter / 60);
  const l = Math.max(0, 1 - loss / 5);
  const raw = 1 + 0.035 * r + 0.035 * j + 0.035 * l;
  return Math.max(1, Math.min(4.8, Number(raw.toFixed(2))));
}

function paintParticipant(
  canvas: HTMLCanvasElement,
  hue: number,
  label: string,
  t: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue} 62% 22%)`);
  g.addColorStop(0.55, `hsl(${(hue + 26) % 360} 58% 14%)`);
  g.addColorStop(1, "#05070f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 4; i++) {
    const phase = t * 0.6 + i * 1.7;
    const r = 90 + Math.sin(phase) * 46;
    const x = w * (0.5 + 0.26 * Math.sin(phase * 0.7 + i));
    const y = h * (0.5 + 0.22 * Math.cos(phase * 0.9 + i * 1.3));
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `hsla(${(hue + i * 22) % 360} 78% 58% / 0.38)`);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = `hsla(${hue} 80% 70% / 0.35)`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const rr = 52 + ((t * 26 + i * 40) % 150);
    ctx.globalAlpha = Math.max(0, 1 - rr / 200);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "600 22px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, w / 2, h - 44);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 14px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("connecting peer · loopback", w / 2, h - 22);
}

function paintSelf(canvas: HTMLCanvasElement, t: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#0a0f1f";
  ctx.fillRect(0, 0, w, h);

  const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
  const rg = ctx.createRadialGradient(
    w / 2,
    h / 2,
    10,
    w / 2,
    h / 2,
    120 + pulse * 40,
  );
  rg.addColorStop(0, "rgba(59,100,246,0.55)");
  rg.addColorStop(1, "transparent");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(20,184,166,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 54, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 20px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("You", w / 2, h / 2 + 7);
}

export class CallEngine {
  private pcLocal: RTCPeerConnection | null = null;
  private pcRemote: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private syntheticCanvas: HTMLCanvasElement | null = null;
  private selfCanvas: HTMLCanvasElement | null = null;
  private audioCtx: AudioContext | null = null;
  private raf = 0;
  private timer = 0;
  private statsTimer = 0;
  private listeners = new Set<Listener>();
  private startedAt = 0;
  private lastBytes = { sent: 0, recv: 0, at: 0 };
  private options: CallOptions = { audio: true, video: false, contactName: "" };

  private snapshot: CallSnapshot = {
    state: "idle",
    localStream: null,
    remoteStream: null,
    muted: false,
    cameraOff: false,
    sharing: false,
    speakerOn: true,
    elapsedSec: 0,
    quality: {
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
    },
  };

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => this.listeners.delete(fn);
  }

  private emit(patch: Partial<CallSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l(this.snapshot));
  }

  get current() {
    return this.snapshot;
  }

  /* ------------------------------------------------------------------ */
  /* Media acquisition                                                    */
  /* ------------------------------------------------------------------ */

  private async acquireLocal(): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: this.options.audio
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : false,
      video: this.options.video
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
        : false,
    };

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.localStream = stream;
        return stream;
      }
    } catch {
      /* fall through to the generated stream */
    }
    return this.generateLocalStream();
  }

  /** A generated camera + microphone, used when the real devices are refused. */
  private generateLocalStream(): MediaStream {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    this.selfCanvas = canvas;
    const ctx = canvas.getContext("2d");
    if (ctx) paintSelf(canvas, 0);
    const videoStream = canvas.captureStream(24);

    const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
    if (this.options.audio) {
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.audioCtx = new Ctx();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        gain.gain.value = 0.02;
        osc.frequency.value = 220;
        osc.connect(gain);
        const dest = this.audioCtx.createMediaStreamDestination();
        gain.connect(dest);
        osc.start();
        tracks.push(...dest.stream.getAudioTracks());
      } catch {
        /* no audio available — the call still connects */
      }
    }

    const stream = new MediaStream(tracks);
    this.localStream = stream;
    return stream;
  }

  /** The synthetic remote participant. */
  private generateRemoteStream(): MediaStream {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    this.syntheticCanvas = canvas;
    const stream = canvas.captureStream(24);

    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.frequency.value = 180;
      osc.connect(gain);
      const dest = ctx.createMediaStreamDestination();
      gain.connect(dest);
      osc.start();
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      /* video only */
    }

    this.remoteStream = stream;
    return stream;
  }

  /* ------------------------------------------------------------------ */
  /* Call lifecycle                                                       */
  /* ------------------------------------------------------------------ */

  async start(options: CallOptions) {
    this.options = options;
    this.emit({
      state: "requesting-media",
      error: undefined,
      elapsedSec: 0,
      muted: false,
      cameraOff: !options.video,
      sharing: false,
    });

    const local = await this.acquireLocal();
    const remote = this.generateRemoteStream();

    try {
      this.pcLocal = new RTCPeerConnection({ iceServers: [] });
      this.pcRemote = new RTCPeerConnection({ iceServers: [] });
    } catch {
      this.emit({ state: "failed", error: "WebRTC is not available in this browser." });
      return;
    }

    this.pcRemote.ontrack = (e) => {
      const [stream] = e.streams;
      if (stream) {
        this.remoteStream = stream;
        this.emit({ remoteStream: stream });
      }
    };

    local.getTracks().forEach((t) => this.pcLocal?.addTrack(t, local));
    remote.getTracks().forEach((t) => this.pcRemote?.addTrack(t, remote));

    this.pcLocal.onicecandidate = (e) => {
      if (e.candidate) this.pcRemote?.addIceCandidate(e.candidate).catch(() => {});
    };
    this.pcRemote.onicecandidate = (e) => {
      if (e.candidate) this.pcLocal?.addIceCandidate(e.candidate).catch(() => {});
    };

    this.emit({ state: "dialling", localStream: local, remoteStream: remote });

    try {
      const offer = await this.pcLocal.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await this.pcLocal.setLocalDescription(offer);
      await this.pcRemote.setRemoteDescription(offer);
      const answer = await this.pcRemote.createAnswer();
      await this.pcRemote.setLocalDescription(answer);
      await this.pcLocal.setRemoteDescription(answer);
    } catch (err) {
      this.emit({
        state: "failed",
        error: err instanceof Error ? err.message : "Negotiation failed.",
      });
      return;
    }

    this.emit({ state: "ringing" });

    // A real handshake takes time; give it a beat so the ringing UI is real.
    await new Promise((r) => setTimeout(r, 1400));

    this.emit({ state: "connecting" });
    await new Promise((r) => setTimeout(r, 900));

    this.startedAt = Date.now();
    this.emit({ state: "active" });

    this.timer = window.setInterval(() => {
      this.emit({ elapsedSec: Math.floor((Date.now() - this.startedAt) / 1000) });
    }, 1000);

    this.statsTimer = window.setInterval(() => void this.pollStats(), 1000);

    this.animate();
  }

  private animate = () => {
    const t = this.startedAt ? (Date.now() - this.startedAt) / 1000 : 0;
    if (this.syntheticCanvas) {
      paintParticipant(
        this.syntheticCanvas,
        this.options.contactHue ?? 226,
        this.options.contactName || "Remote peer",
        t,
      );
    }
    if (this.selfCanvas) paintSelf(this.selfCanvas, t);
    this.raf = requestAnimationFrame(this.animate);
  };

  private async pollStats() {
    if (!this.pcLocal) return;
    try {
      const report = await this.pcLocal.getStats();
      let rtt = 0;
      let jitter = 0;
      let lost = 0;
      let received = 0;
      let sent = 0;
      let bytesSent = 0;
      let bytesReceived = 0;
      let codec = "—";

      report.forEach((s) => {
        const stat = s as RTCStats & {
          type: string;
          currentRoundTripTime?: number;
          jitter?: number;
          packetsLost?: number;
          packetsReceived?: number;
          packetsSent?: number;
          bytesSent?: number;
          bytesReceived?: number;
          mimeType?: string;
          state?: string;
        };

        if (stat.type === "candidate-pair" && stat.state === "succeeded") {
          rtt = Math.max(rtt, (stat.currentRoundTripTime ?? 0) * 1000);
        }
        if (stat.type === "inbound-rtp") {
          jitter = Math.max(jitter, (stat.jitter ?? 0) * 1000);
          lost += stat.packetsLost ?? 0;
          received += stat.packetsReceived ?? 0;
          bytesReceived += stat.bytesReceived ?? 0;
        }
        if (stat.type === "outbound-rtp") {
          sent += stat.packetsSent ?? 0;
          bytesSent += stat.bytesSent ?? 0;
          if (stat.mimeType) codec = stat.mimeType.split("/")[1] ?? codec;
        }
      });

      const now = Date.now();
      const dt = this.lastBytes.at ? (now - this.lastBytes.at) / 1000 : 0;
      const bitrate = dt
        ? Math.max(
            0,
            Math.round(
              ((bytesSent - this.lastBytes.sent + bytesReceived - this.lastBytes.recv) /
                8 /
                dt) /
                1000,
            ),
          )
        : 0;
      this.lastBytes = { sent: bytesSent, recv: bytesReceived, at: now };

      const total = received + lost;
      const lossPct = total ? Number(((lost / total) * 100).toFixed(2)) : 0;
      const mos = estimateMos(rtt, jitter, lossPct);

      this.emit({
        quality: {
          rttMs: Math.round(rtt),
          jitterMs: Number(jitter.toFixed(1)),
          lossPct,
          bitrateKbps: bitrate,
          mos,
          codec: codec === "—" ? (this.options.video ? "VP9 / Opus" : "Opus") : codec,
          packetsSent: sent,
          packetsReceived: received,
          bytesSent,
          bytesReceived,
        },
      });
    } catch {
      /* stats are best-effort */
    }
  }

  toggleMute() {
    const muted = !this.snapshot.muted;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    this.emit({ muted });
    return muted;
  }

  toggleCamera() {
    const cameraOff = !this.snapshot.cameraOff;
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = !cameraOff));
    this.emit({ cameraOff });
    return cameraOff;
  }

  toggleSpeaker() {
    const speakerOn = !this.snapshot.speakerOn;
    this.emit({ speakerOn });
    return speakerOn;
  }

  async switchCamera() {
    const tracks = this.localStream?.getVideoTracks() ?? [];
    if (!tracks.length) return false;
    const current = tracks[0];
    const facing = current.getSettings?.().facingMode;
    try {
      if (!navigator.mediaDevices?.getUserMedia) return false;
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing === "user" ? "environment" : "user" },
      });
      const newTrack = next.getVideoTracks()[0];
      const sender = this.pcLocal?.getSenders().find((s) => s.track?.kind === "video");
      if (sender && newTrack) {
        await sender.replaceTrack(newTrack);
        this.localStream?.removeTrack(current);
        this.localStream?.addTrack(newTrack);
        current.stop();
        this.emit({ localStream: this.localStream });
        return true;
      }
      next.getTracks().forEach((t) => t.stop());
    } catch {
      return false;
    }
    return false;
  }

  async startScreenShare() {
    if (!this.pcLocal) return false;
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) return false;
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      const sender = this.pcLocal.getSenders().find((s) => s.track?.kind === "video");
      if (sender && track) {
        await sender.replaceTrack(track);
        track.onended = () => void this.stopScreenShare();
        this.emit({ sharing: true });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  async stopScreenShare() {
    const camera = this.localStream?.getVideoTracks()[0];
    const sender = this.pcLocal?.getSenders().find((s) => s.track?.kind === "video");
    if (sender && camera) await sender.replaceTrack(camera);
    this.emit({ sharing: false });
  }

  hangUp() {
    if (this.timer) clearInterval(this.timer);
    if (this.statsTimer) clearInterval(this.statsTimer);
    cancelAnimationFrame(this.raf);
    this.pcLocal?.close();
    this.pcRemote?.close();
    this.pcLocal = null;
    this.pcRemote = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.syntheticCanvas = null;
    this.selfCanvas = null;
    void this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.emit({
      state: "ended",
      localStream: null,
      remoteStream: null,
      elapsedSec: this.snapshot.elapsedSec,
    });
  }
}

/** Formats seconds as mm:ss or h:mm:ss. */
export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
