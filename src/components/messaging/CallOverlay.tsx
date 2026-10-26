"use client";

import * as React from "react";
import {
  Camera,
  CameraOff,
  FlipHorizontal2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Phone,
  Signal,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { CallEngine, formatDuration, type CallSnapshot } from "@/lib/webrtc";

function VideoFeed({
  stream,
  muted,
  mirrored,
  className,
  label,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
  label?: string;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    void el.play().catch(() => {});
  }, [stream]);

  if (!stream) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-[linear-gradient(135deg,#111a35,#080c1c)]",
          className,
        )}
      >
        <span className="text-[12px] text-white/45">no media</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={cn("h-full w-full object-cover", mirrored && "-scale-x-100")}
      />
      {label && (
        <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          {label}
        </span>
      )}
    </div>
  );
}

export function CallOverlay({
  engine,
  contactName,
  contactHue,
  onClose,
  onEnded,
}: {
  engine: CallEngine;
  contactName: string;
  contactHue: number;
  onClose: () => void;
  onEnded: (seconds: number) => void;
}) {
  const [snap, setSnap] = React.useState<CallSnapshot>(engine.current);
  const [showStats, setShowStats] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = engine.subscribe(setSnap);
    return () => {
      unsubscribe();
    };
  }, [engine]);

  const hangUp = () => {
    const secs = snap.elapsedSec;
    engine.hangUp();
    onEnded(secs);
    onClose();
  };

  const stateLabel: Record<string, string> = {
    "requesting-media": "Requesting microphone…",
    dialling: "Dialling…",
    ringing: "Ringing…",
    connecting: "Connecting…",
    active: "Connected",
    failed: "Call failed",
    ended: "Call ended",
  };

  const mos = snap.quality.mos;
  const mosTone =
    mos >= 4 ? "text-emerald-500" : mos >= 3 ? "text-[var(--color-signal-500)]" : "text-rose-500";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#06080f] text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4">
        <span
          className="grid size-10 place-items-center rounded-full text-[13px] font-bold"
          style={{
            background: `linear-gradient(135deg, hsl(${contactHue} 70% 52%), hsl(${(contactHue + 40) % 360} 72% 42%))`,
          }}
        >
          {contactName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{contactName}</div>
          <div className="text-[12px] text-white/55">
            {stateLabel[snap.state] ?? snap.state}
            {snap.state === "active" && ` · ${formatDuration(snap.elapsedSec)}`}
          </div>
        </div>

        <div className="hidden items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11.5px] sm:flex">
          <span className={cn("font-bold tabular-nums", mosTone)}>MOS {mos.toFixed(1)}</span>
          <span className="text-white/55 tabular-nums">{snap.quality.rttMs}ms RTT</span>
          <span className="text-white/55 tabular-nums">
            {snap.quality.jitterMs}ms jitter
          </span>
          <span className="text-white/55 tabular-nums">
            {snap.quality.lossPct}% loss
          </span>
          <span className="text-white/55 tabular-nums">
            {snap.quality.bitrateKbps} kbps
          </span>
        </div>

        <button
          onClick={() => setShowStats((v) => !v)}
          className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:text-white"
          title="Network diagnostics"
        >
          <Signal className="size-4" />
        </button>
        <button
          onClick={onClose}
          className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:text-white"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* Stage */}
      <div className="relative flex-1 px-5 pb-4">
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-black">
          <VideoFeed
            stream={snap.remoteStream}
            className="h-full w-full"
            label={contactName}
          />

          {/* Outgoing / ringing overlay */}
          {(snap.state === "dialling" ||
            snap.state === "ringing" ||
            snap.state === "connecting" ||
            snap.state === "requesting-media") && (
            <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
              <div className="text-center">
                <span
                  className="mx-auto grid size-24 place-items-center rounded-full text-2xl font-bold"
                  style={{
                    background: `linear-gradient(135deg, hsl(${contactHue} 70% 52%), hsl(${(contactHue + 40) % 360} 72% 42%))`,
                    animation: "pulse-ring 2s ease-in-out infinite",
                  }}
                >
                  {contactName.slice(0, 2).toUpperCase()}
                </span>
                <p className="mt-4 text-[17px] font-semibold">{contactName}</p>
                <p className="mt-1 text-[13px] text-white/60">
                  {stateLabel[snap.state]}
                </p>
                <div className="mt-4 flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full bg-white/60"
                      style={{ animation: `typing 1.2s ${i * 0.18}s infinite ease-in-out` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Local picture-in-picture */}
          {snap.state === "active" && (
            <div className="absolute bottom-4 right-4 h-36 w-56 overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl sm:h-44 sm:w-64">
              <VideoFeed
                stream={snap.localStream}
                muted
                mirrored={!snap.sharing}
                className="h-full w-full"
                label={snap.sharing ? "Your screen" : "You"}
              />
            </div>
          )}

          {/* Network diagnostics */}
          {showStats && snap.state === "active" && (
            <div className="absolute left-4 top-4 w-60 rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
                  Network
                </span>
                <Badge tone={mos >= 4 ? "success" : mos >= 3 ? "signal" : "danger"}>
                  {mosTone.replace("text-", "")} {mos.toFixed(1)}
                </Badge>
              </div>
              <dl className="space-y-1 text-[11.5px]">
                {[
                  ["Round trip", `${snap.quality.rttMs} ms`],
                  ["Jitter", `${snap.quality.jitterMs} ms`],
                  ["Packet loss", `${snap.quality.lossPct}%`],
                  ["Bitrate", `${snap.quality.bitrateKbps} kbps`],
                  ["Codec", snap.quality.codec],
                  ["Sent", `${(snap.quality.bytesSent / 1024).toFixed(0)} KB`],
                  ["Received", `${(snap.quality.bytesReceived / 1024).toFixed(0)} KB`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <dt className="text-white/45">{k}</dt>
                    <dd className="font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    mos >= 4
                      ? "bg-emerald-500"
                      : mos >= 3
                      ? "bg-[var(--color-signal-500)]"
                      : "bg-rose-500",
                  )}
                  style={{ width: `${(mos / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <footer className="flex items-center justify-center gap-3 px-5 py-5">
        <button
          onClick={() => engine.toggleMute()}
          className={cn(
            "grid size-12 place-items-center rounded-full transition-colors",
            snap.muted
              ? "bg-white text-[#06080f]"
              : "bg-white/10 text-white hover:bg-white/20",
          )}
          title={snap.muted ? "Unmute" : "Mute"}
        >
          {snap.muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>

        <button
          onClick={() => engine.toggleCamera()}
          className={cn(
            "grid size-12 place-items-center rounded-full transition-colors",
            snap.cameraOff
              ? "bg-white text-[#06080f]"
              : "bg-white/10 text-white hover:bg-white/20",
          )}
          title={snap.cameraOff ? "Camera on" : "Camera off"}
        >
          {snap.cameraOff ? (
            <CameraOff className="size-5" />
          ) : (
            <Camera className="size-5" />
          )}
        </button>

        <button
          onClick={() => engine.toggleSpeaker()}
          className={cn(
            "grid size-12 place-items-center rounded-full transition-colors",
            !snap.speakerOn
              ? "bg-white text-[#06080f]"
              : "bg-white/10 text-white hover:bg-white/20",
          )}
          title={snap.speakerOn ? "Mute output" : "Speaker on"}
        >
          {snap.speakerOn ? (
            <Volume2 className="size-5" />
          ) : (
            <VolumeX className="size-5" />
          )}
        </button>

        <button
          onClick={() => void engine.switchCamera()}
          className="grid size-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          title="Switch camera"
        >
          <FlipHorizontal2 className="size-5" />
        </button>

        <button
          onClick={() => void engine.startScreenShare()}
          className={cn(
            "grid size-12 place-items-center rounded-full transition-colors",
            snap.sharing
              ? "bg-[var(--color-accent-500)] text-white"
              : "bg-white/10 text-white hover:bg-white/20",
          )}
          title="Share screen"
        >
          <MonitorUp className="size-5" />
        </button>

        <button
          onClick={hangUp}
          className="grid size-14 place-items-center rounded-full bg-rose-500 text-white transition-transform hover:scale-105"
          title="End call"
        >
          <PhoneOff className="size-6" />
        </button>
      </footer>
    </div>
  );
}
