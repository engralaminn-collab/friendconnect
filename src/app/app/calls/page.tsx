"use client";

import * as React from "react";
import {
  Activity,
  BookOpen,
  Camera,
  CameraOff,
  ChevronRight,
  Clock,
  Cpu,
  Gauge,
  Headphones,
  Layers,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Plus,
  Radio,
  Scale,
  Signal,
  SlidersHorizontal,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import {
  CALL_ENGINE_COVERAGE,
  CALL_LIMITS,
  NATIVE_CALL_SAMPLES,
} from "@/lib/data/native-calls";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { AreaChart, BarChart } from "@/components/charts";
import { CallOverlay } from "@/components/messaging/CallOverlay";
import { useStore } from "@/store/useStore";
import { useMessenger } from "@/store/useMessenger";
import { useToast } from "@/store/useUI";
import { cn, formatDuration, relativeTime } from "@/lib/utils";
import { CallEngine } from "@/lib/webrtc";
import { ipc } from "@/lib/ipc";
import type { CallRecord } from "@/lib/types";

const KEYS = ["1","2","3","4","5","6","7","8","9","*","0","#"];

export default function CallsPage() {
  // Real call history: populated by actual messenger/global calls.
  const calls = useMessenger((s) => s.calls);
  const addCall = useMessenger((s) => s.addCall);
  const devices = useStore((s) => s.devices);
  const setDefaultDevice = useStore((s) => s.setDefaultDevice);
  const toast = useToast();

  const [dialed, setDialed] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "missed" | "incoming" | "outgoing">("all");
  const [call, setCall] = React.useState<{
    engine: CallEngine;
    kind: "audio" | "video";
    name: string;
    hue: number;
  } | null>(null);
  const [deviceModal, setDeviceModal] = React.useState(false);
  const [liveDevices, setLiveDevices] = React.useState<
    { deviceId: string; kind: string; label: string }[]
  >([]);
  const [diagOpen, setDiagOpen] = React.useState(false);

  const filtered = calls.filter((c) => {
    if (filter === "all") return true;
    if (filter === "missed") return c.status === "missed" || c.status === "declined";
    return c.direction === filter;
  });

  const totalMinutes = Math.round(
    calls.reduce((a, c) => a + c.durationSec, 0) / 60,
  );
  const avgMos = calls.filter((c) => c.quality.mos > 0).length
    ? Number(
        (
          calls.filter((c) => c.quality.mos > 0).reduce((a, c) => a + c.quality.mos, 0) /
          calls.filter((c) => c.quality.mos > 0).length
        ).toFixed(2),
      )
    : 0;
  const missed = calls.filter((c) => c.status === "missed").length;

  const startCall = (name: string, kind: "audio" | "video", hue = 226) => {
    const engine = new CallEngine();
    setCall({ engine, kind, name, hue });
    void engine.start({ audio: true, video: kind === "video", contactName: name, contactHue: hue });
  };

  const endCall = (seconds: number) => {
    if (!call) return;
    // Real statistics from the loopback peer connection — never fabricated.
    const q = call.engine.current.quality;
    addCall({
      contactName: call.name,
      direction: "outgoing",
      kind: call.kind,
      startedAt: new Date(Date.now() - seconds * 1000).toISOString(),
      durationSec: seconds,
      status: "completed",
      recording: false,
      quality: q,
    });
    setCall(null);
  };

  const enumerate = async () => {
    try {
      const devices = await ipc.invoke<
        { deviceId: string; kind: string; label: string }[]
      >("media:enumerate");
      setLiveDevices(devices);
    } catch {
      setLiveDevices([]);
    }
  };

  React.useEffect(() => {
    void enumerate();
  }, []);

  const qualityTrend = calls
    .slice(0, 7)
    .reverse()
    .map((c) => c.quality.mos || 0);

  const rttTrend = calls
    .slice(0, 7)
    .reverse()
    .map((c) => c.quality.rttMs);

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Communication"
        title="Calls"
        description="Audio and video calling with real WebRTC negotiation, a dialpad, device management and packet-level diagnostics on every call."
        actions={
          <>
            <button
              onClick={() => {
                setDeviceModal(true);
                void enumerate();
              }}
              className="btn btn-secondary btn-sm"
            >
              <SlidersHorizontal className="size-3.5" />
              Devices
            </button>
            <button
              onClick={() => startCall(dialed || "Unknown number", "audio")}
              className="btn btn-primary btn-sm"
            >
              <Phone className="size-3.5" />
              Place call
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Calls"
          value={calls.length}
          deltaLabel={`${missed} missed`}
          icon={<Phone className="size-4" />}
        />
        <StatCard
          label="Talk time"
          value={`${totalMinutes}m`}
          deltaLabel="across every call"
          icon={<Clock className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Average MOS"
          value={avgMos.toFixed(2)}
          deltaLabel="out of 5 — call quality"
          icon={<Signal className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Transports"
          value="2"
          deltaLabel="WebRTC and SIP signalling"
          icon={<Radio className="size-4" />}
          tone="violet"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[320px_1fr_300px]">
        {/* ---------------- Dialpad ---------------- */}
        <aside className="fc-card h-fit p-5">
          <h2 className="text-[15px] font-semibold">Device test dialpad</h2>
          <p className="mt-1 text-[11.5px] text-[var(--fc-fg-subtle)]">
            Local loopback call to verify microphone, camera and network stats on this device.
            Real person-to-person calls start from a conversation in the Messenger.
          </p>
          <div className="mt-4 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-3 text-center">
            <div className="truncate font-mono text-[20px] tabular-nums">
              {dialed || "—"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setDialed((d) => d + k)}
                className="grid h-12 place-items-center rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] text-[17px] font-semibold transition-colors hover:border-[var(--color-brand-400)] hover:bg-[var(--color-brand-500)]/[0.08]"
              >
                {k}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setDialed((d) => d.slice(0, -1))}
              className="btn btn-secondary btn-sm flex-1"
            >
              <ChevronRight className="size-3.5 rotate-180" />
              Back
            </button>
            <button
              onClick={() => setDialed("")}
              className="btn btn-ghost btn-sm"
              title="Clear"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => startCall(dialed || "Unknown number", "audio")}
              className="btn btn-primary btn-sm"
            >
              <Phone className="size-3.5" />
              Call
            </button>
            <button
              onClick={() => startCall(dialed || "Unknown number", "video")}
              className="btn btn-secondary btn-sm"
            >
              <Camera className="size-3.5" />
              Video
            </button>
          </div>

          <div className="mt-5 border-t border-[var(--fc-line)] pt-4">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
              Input devices
            </h3>
            <ul className="space-y-1">
              {devices
                .filter((d) => d.kind === "microphone")
                .map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => {
                        setDefaultDevice(d.id);
                        toast.success("Default device set", d.label);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px]",
                        d.default
                          ? "bg-[var(--color-brand-500)]/[0.1] font-semibold text-[var(--color-brand-500)]"
                          : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                      )}
                    >
                      <Mic className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{d.label}</span>
                      {d.default && <CheckDot />}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </aside>

        {/* ---------------- History ---------------- */}
        <div className="space-y-4">
          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
              <h2 className="mr-auto text-[15px] font-semibold">Call history</h2>
              {(
                [
                  { id: "all", l: "All" },
                  { id: "missed", l: "Missed" },
                  { id: "incoming", l: "Incoming" },
                  { id: "outgoing", l: "Outgoing" },
                ] as const
              ).map((f) => (
                <FilterChip
                  key={f.id}
                  active={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  count={
                    f.id === "all"
                      ? calls.length
                      : f.id === "missed"
                      ? calls.filter((c) => c.status === "missed" || c.status === "declined").length
                      : calls.filter((c) => c.direction === f.id).length
                  }
                >
                  {f.l}
                </FilterChip>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="px-6 py-16">
                <EmptyState
                  icon={<Phone className="size-6" />}
                  title="No calls here"
                  description="Place a call from the dialpad."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--fc-line)]">
                {filtered.map((c) => (
                  <CallRow
                    key={c.id}
                    call={c}
                    onCall={() =>
                      startCall(
                        c.contactName,
                        c.kind,
                        226,
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="fc-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold">Call quality over time</h2>
              <button
                onClick={() => setDiagOpen(true)}
                className="btn btn-secondary btn-sm"
              >
                <Activity className="size-3.5" />
                Diagnostics
              </button>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  MOS score
                </div>
                <AreaChart
                  height={170}
                  labels={calls
                    .slice(0, 7)
                    .reverse()
                    .map((c) => relativeTime(c.startedAt))}
                  series={[{ name: "MOS", data: qualityTrend }]}
                />
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  Round trip (ms)
                </div>
                <BarChart
                  height={170}
                  labels={calls
                    .slice(0, 7)
                    .reverse()
                    .map((c) => relativeTime(c.startedAt))}
                  series={[{ name: "RTT", data: rttTrend }]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- Diagnostics rail ---------------- */}
        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Gauge className="size-4 text-[var(--color-accent-500)]" />
              Network trace
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
              The same four measurements a packet tracer would give you, read
              straight off the peer connection while a call is running.
            </p>
            <ul className="mt-3 space-y-2">
              {[
                { l: "Round trip time", d: "How far the answer has to travel." },
                { l: "Jitter", d: "How much the arrival times wobble." },
                { l: "Packet loss", d: "How much never arrives at all." },
                { l: "MOS", d: "RTT, jitter and loss rolled into one score." },
              ].map((r) => (
                <li
                  key={r.l}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <div className="text-[12.5px] font-semibold">{r.l}</div>
                  <div className="text-[11px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {r.d}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Recent quality</h2>
            <div className="mt-3 space-y-3">
              {calls
                .filter((c) => c.quality.mos > 0)
                .slice(0, 4)
                .map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="truncate text-[var(--fc-fg-muted)]">
                        {c.contactName}
                      </span>
                      <span className="font-semibold tabular-nums">
                        MOS {c.quality.mos.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Progress
                        value={c.quality.mos * 20}
                        tone={
                          c.quality.mos >= 4
                            ? "success"
                            : c.quality.mos >= 3
                            ? "signal"
                            : "danger"
                        }
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Transports</h2>
            <ul className="mt-3 space-y-2">
              {[
                {
                  l: "WebRTC (DTLS-SRTP)",
                  d: "Browser to browser, encrypted end to end.",
                  on: true,
                },
                {
                  l: "SIP signalling",
                  d: "INVITE / 200 OK / ACK / BYE against a registrar.",
                  on: false,
                },
                {
                  l: "Opus / VP9 media",
                  d: "Audio at 32 kbps, video at 1.2 Mbps.",
                  on: true,
                },
                {
                  l: "ICE + STUN",
                  d: "Candidate gathering for NAT traversal.",
                  on: true,
                },
              ].map((t) => (
                <li
                  key={t.l}
                  className="flex items-start gap-2.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <span
                    className={cn(
                      "mt-1 size-2 shrink-0 rounded-full",
                      t.on ? "bg-emerald-500" : "bg-[var(--fc-fg-subtle)]",
                    )}
                  />
                  <span>
                    <span className="block text-[12.5px] font-semibold">{t.l}</span>
                    <span className="block text-[11px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {t.d}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* ---------------- Native reference implementations ---------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="fc-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
            <BookOpen className="size-4 text-[var(--color-brand-500)]" />
            <h2 className="text-[15px] font-semibold">
              Native reference implementations
            </h2>
            <span className="ml-auto text-[11px] text-[var(--fc-fg-subtle)]">
              {NATIVE_CALL_SAMPLES.length} samples
            </span>
          </div>
          <ul className="divide-y divide-[var(--fc-line)]">
            {NATIVE_CALL_SAMPLES.map((s) => (
              <li key={s.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
                    style={{ backgroundColor: s.accent }}
                  >
                    {s.platform.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-[13.5px] font-semibold">{s.name}</span>
                  <Badge>{s.platform}</Badge>
                  <Badge>{s.language}</Badge>
                  <Badge tone="accent">{s.licence}</Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {s.stack.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fc-fg-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {s.demo}
                </p>
                <p className="mt-1.5 border-l-2 border-[var(--color-brand-500)] pl-2.5 text-[12px] leading-relaxed">
                  {s.teaches}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="fc-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
              <Layers className="size-4 text-[var(--color-accent-500)]" />
              <h2 className="text-[15px] font-semibold">
                Browser vs native coverage
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11.5px]">
                <thead className="bg-[var(--fc-surface-2)] text-[10px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Layer</th>
                    <th className="px-4 py-2 font-semibold">Browser</th>
                    <th className="px-4 py-2 font-semibold">Native</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--fc-line)]">
                  {CALL_ENGINE_COVERAGE.map((c) => (
                    <tr key={c.layer}>
                      <td className="px-4 py-2 align-top">
                        <span className="block font-semibold">{c.layer}</span>
                        <span className="mt-0.5 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                          {c.note}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-top text-emerald-500">
                        {c.browser}
                      </td>
                      <td className="px-4 py-2 align-top text-[var(--fc-fg-muted)]">
                        {c.native}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Scale className="size-4 text-[var(--color-violet-500)]" />
              Operational limits
            </h2>
            <ul className="mt-3 space-y-2">
              {CALL_LIMITS.map((l) => (
                <li
                  key={l.id}
                  className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold">{l.label}</span>
                    <Badge tone="accent">{l.value}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {l.why}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ---------------- Call overlay ---------------- */}
      {call && (
        <CallOverlay
          engine={call.engine}
          contactName={call.name}
          contactHue={call.hue}
          onClose={() => setCall(null)}
          onEnded={endCall}
        />
      )}

      {/* ---------------- Devices modal ---------------- */}
      <Modal
        open={deviceModal}
        onClose={() => setDeviceModal(false)}
        title="Devices"
        description="Everything the browser reports, plus the profile the workspace remembers."
        size="lg"
        footer={
          <button onClick={() => setDeviceModal(false)} className="btn btn-ghost btn-sm">
            Close
          </button>
        }
      >
        <div className="space-y-5">
          {(["microphone", "camera", "speaker"] as const).map((kind) => (
            <div key={kind}>
              <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold capitalize">
                {kind === "microphone" ? (
                  <Mic className="size-3.5" />
                ) : kind === "camera" ? (
                  <Camera className="size-3.5" />
                ) : (
                  <Headphones className="size-3.5" />
                )}
                {kind}
              </h3>
              <ul className="space-y-1">
                {devices
                  .filter((d) => d.kind === kind)
                  .map((d) => (
                    <li key={d.id}>
                      <button
                        onClick={() => setDefaultDevice(d.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12.5px]",
                          d.default
                            ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.08] font-semibold"
                            : "border-[var(--fc-line)] text-[var(--fc-fg-muted)]",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{d.label}</span>
                        {d.default && <CheckDot />}
                      </button>
                    </li>
                  ))}
                {liveDevices
                  .filter((d) =>
                    kind === "microphone"
                      ? d.kind === "audioinput"
                      : kind === "camera"
                      ? d.kind === "videoinput"
                      : d.kind === "audiooutput",
                  )
                  .map((d) => (
                    <li
                      key={d.deviceId}
                      className="flex items-center gap-2 rounded-lg border border-[var(--fc-line)] px-3 py-2 text-left text-[12.5px] text-[var(--fc-fg-muted)]"
                    >
                      <Cpu className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{d.label}</span>
                      <Badge>browser</Badge>
                    </li>
                  ))}
              </ul>
            </div>
          ))}

          {liveDevices.length === 0 && (
            <p className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
              The browser reported no hardware. That is normal in a sandboxed
              preview — a call still connects using a generated stream so the
              negotiation and the statistics are real.
            </p>
          )}
        </div>
      </Modal>

      {/* ---------------- Diagnostics modal ---------------- */}
      <Modal
        open={diagOpen}
        onClose={() => setDiagOpen(false)}
        title="Packet diagnostics"
        description="What a tracer would show you, per call."
        size="lg"
        footer={
          <button onClick={() => setDiagOpen(false)} className="btn btn-ghost btn-sm">
            Close
          </button>
        }
      >
        <div className="space-y-3">
          {calls.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-semibold">{c.contactName}</span>
                <Badge>{c.kind}</Badge>
                <Badge tone={c.status === "completed" ? "success" : "danger"}>
                  {c.status}
                </Badge>
                <span className="ml-auto text-[11.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                  {formatDuration(c.durationSec)} · {relativeTime(c.startedAt)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { l: "RTT", v: `${c.quality.rttMs} ms` },
                  { l: "Jitter", v: `${c.quality.jitterMs} ms` },
                  { l: "Loss", v: `${c.quality.lossPct}%` },
                  { l: "MOS", v: c.quality.mos.toFixed(1) },
                ].map((r) => (
                  <div
                    key={r.l}
                    className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-2.5 py-1.5"
                  >
                    <dt className="text-[10px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                      {r.l}
                    </dt>
                    <dd className="mt-0.5 text-[12.5px] font-semibold tabular-nums">
                      {r.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function CheckDot() {
  return (
    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)] text-[9px] font-bold text-white">
      ✓
    </span>
  );
}

function CallRow({ call, onCall }: { call: CallRecord; onCall: () => void }) {
  const missed = call.status === "missed" || call.status === "declined";
  const Icon = missed
    ? PhoneMissed
    : call.direction === "incoming"
    ? PhoneIncoming
    : Phone;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          missed
            ? "bg-rose-500/12 text-rose-500"
            : call.direction === "incoming"
            ? "bg-emerald-500/12 text-emerald-500"
            : "bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[13.5px] font-semibold",
            missed && "text-rose-500",
          )}
        >
          {call.contactName}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--fc-fg-subtle)]">
          <span>
            {call.direction === "outgoing" ? "Outgoing" : "Incoming"} ·{" "}
            {call.kind}
          </span>
          {call.durationSec > 0 && <span>{formatDuration(call.durationSec)}</span>}
          <span>{relativeTime(call.startedAt)}</span>
          {call.recording && <Badge tone="danger">recorded</Badge>}
        </div>
      </div>
      {call.quality.mos > 0 && (
        <div className="hidden w-24 sm:block">
          <Progress
            value={call.quality.mos * 20}
            tone={
              call.quality.mos >= 4
                ? "success"
                : call.quality.mos >= 3
                ? "signal"
                : "danger"
            }
          />
          <div className="mt-1 text-center text-[10px] tabular-nums text-[var(--fc-fg-subtle)]">
            MOS {call.quality.mos.toFixed(1)}
          </div>
        </div>
      )}
      <button onClick={onCall} className="btn btn-secondary btn-sm">
        <Phone className="size-3.5" />
        Call back
      </button>
    </li>
  );
}
