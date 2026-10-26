"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  Radio,
  Send,
  Volume2,
  Waves,
} from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import {
  GIBBER_HANDSHAKE,
  GIBBER_PROTOCOL_INFO,
  decodeGibber,
  gibberFrame,
  gibberPhaseOf,
  gibberTones,
  gibberWaveform,
  negotiateGibber,
  type NegotiationStep,
} from "@/lib/gibberlink";
import { cn, copyToClipboard } from "@/lib/utils";
import { useToast } from "@/store/useUI";

interface WireMessage {
  id: string;
  token: string;
  text: string;
  from: "me" | "them";
  at: string;
  decoded: boolean;
  error?: string;
}

export function GibberChannel({
  contactName,
  onSend,
  onBack,
}: {
  contactName: string;
  onSend: (token: string, text: string) => void;
  onBack: () => void;
}) {
  const toast = useToast();
  const [input, setInput] = React.useState("");
  const [wire, setWire] = React.useState<WireMessage[]>([]);
  const [steps, setSteps] = React.useState<NegotiationStep[]>([]);
  const [phase, setPhase] = React.useState<"human" | "probing" | "acked" | "switched">(
    "human",
  );
  const [playing, setPlaying] = React.useState<string | null>(null);

  const frame = React.useMemo(
    () => (input.trim() ? gibberFrame(input.trim()) : null),
    [input],
  );

  const runHandshake = () => {
    const negotiation = negotiateGibber();
    setSteps([]);
    negotiation.forEach((s, i) =>
      window.setTimeout(
        () => {
          setSteps((prev) => [...prev, s]);
          setPhase(s.phase as "probing" | "acked" | "switched");
        },
        480 * (i + 1),
      ),
    );
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const f = gibberFrame(text);
    const decoded = decodeGibber(f.token);
    setWire((w) => [
      ...w,
      {
        id: `w_${Date.now()}`,
        token: f.token,
        text,
        from: "me",
        at: new Date().toISOString(),
        decoded: decoded.ok,
        error: decoded.error,
      },
    ]);
    onSend(f.token, text);
    setInput("");
  };

  const receive = (token: string) => {
    const decoded = decodeGibber(token);
    setWire((w) => [
      ...w,
      {
        id: `w_${Date.now()}`,
        token,
        text: decoded.ok ? (decoded.text ?? "") : "",
        from: "them",
        at: new Date().toISOString(),
        decoded: decoded.ok,
        error: decoded.error,
      },
    ]);
  };

  const play = (token: string) => {
    setPlaying(token);
    window.setTimeout(() => setPlaying(null), 900);
  };

  const currentWave = React.useMemo(
    () => (frame ? gibberWaveform(frame.token, 72) : []),
    [frame],
  );

  return (
    <div className="fc-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
        <Radio className="size-3.5 text-[var(--color-violet-500)]" />
        <span className="text-[12.5px] font-semibold">Gibber channel</span>
        <span className="text-[11px] text-[var(--fc-fg-subtle)]">
          with {contactName}
        </span>
        <Badge
          tone={
            phase === "switched"
              ? "success"
              : phase === "acked"
              ? "accent"
              : phase === "probing"
              ? "signal"
              : "neutral"
          }
        >
          {phase}
        </Badge>
        <button
          onClick={onBack}
          className="ml-auto text-[11px] font-semibold text-[var(--color-brand-500)]"
        >
          back to plain chat
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
          <div className="flex items-center gap-2 text-[11.5px] font-semibold">
            <ArrowLeftRight className="size-3.5 text-[var(--color-accent-500)]" />
            The handshake
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
            {GIBBER_PROTOCOL_INFO.summary}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {[GIBBER_HANDSHAKE.probe, GIBBER_HANDSHAKE.ack, GIBBER_HANDSHAKE.switch].map(
              (h) => (
                <code
                  key={h}
                  className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--fc-fg-muted)]"
                >
                  {h}
                </code>
              ),
            )}
            <button
              onClick={runHandshake}
              className="btn btn-secondary btn-sm ml-auto"
            >
              run handshake
            </button>
          </div>
          {steps.length > 0 && (
            <ol className="mt-2.5 space-y-1">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-[11.5px] text-[var(--fc-fg-muted)]"
                >
                  <span className="grid size-4 place-items-center rounded-full bg-[var(--color-brand-500)] text-[8.5px] font-bold text-white">
                    {i + 1}
                  </span>
                  <code className="font-mono">{s.line}</code>
                  <span className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    {s.phase}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {wire.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--fc-line)] p-4 text-center">
            <Waves className="mx-auto size-6 text-[var(--fc-fg-subtle)]" />
            <p className="mt-2 text-[12.5px] font-semibold">No wire traffic yet</p>
            <p className="mt-1 text-[11.5px] text-[var(--fc-fg-muted)]">
              Write below and the message is framed, checksummed and turned into
              tone pairs.
            </p>
          </div>
        )}

        {wire.map((w) => {
          const wave = gibberWaveform(w.token, 64);
          return (
            <div
              key={w.id}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                w.from === "me"
                  ? "ml-8 border-[var(--color-brand-500)]/25 bg-[var(--color-brand-500)]/[0.06]"
                  : "mr-8 border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                  {w.from === "me" ? "You" : contactName}
                </span>
                <Badge tone={w.decoded ? "success" : "danger"}>
                  {w.decoded ? "checksum ok" : "corrupt"}
                </Badge>
                <button
                  onClick={() => play(w.token)}
                  className="ml-auto grid size-6 place-items-center rounded-md bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
                >
                  <Volume2 className="size-3.5" />
                </button>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed">{w.text}</p>
              <code className="mt-1.5 block break-all font-mono text-[10.5px] text-[var(--fc-fg-subtle)]">
                {w.token}
              </code>
              <div className="mt-1.5 flex h-5 items-end gap-[1.5px]">
                {wave.map((v, i) => (
                  <span
                    key={i}
                    className="w-[2px] rounded-full bg-[var(--color-violet-500)]/70"
                    style={{ height: `${2 + v * 16}px` }}
                  />
                ))}
              </div>
              {w.error && (
                <p className="mt-1 text-[11px] text-rose-500">{w.error}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--fc-line)] p-3">
        {frame && (
          <div className="mb-2.5 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5">
            <div className="flex items-center gap-2 text-[10.5px] text-[var(--fc-fg-subtle)]">
              <span>
                {frame.bytes} bytes → {frame.token.length} symbols
              </span>
              <span>ratio {frame.ratio}×</span>
              <span>{gibberTones(frame.token).length} tone pairs</span>
            </div>
            <div className="mt-1.5 flex h-6 items-end gap-[2px]">
              {currentWave.map((v, i) => (
                <span
                  key={i}
                  className="w-[2.5px] rounded-full bg-[var(--color-brand-500)]"
                  style={{ height: `${2 + v * 20}px` }}
                />
              ))}
            </div>
            <code className="mt-1.5 block break-all font-mono text-[10.5px] text-[var(--fc-fg-muted)]">
              {frame.token}
            </code>
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="field h-9 flex-1 text-[12.5px]"
            placeholder="Say something on the wire…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button onClick={send} className="btn btn-primary btn-sm">
            <Send className="size-3.5" />
          </button>
          <button
            onClick={async () => {
              if (!frame) return;
              const ok = await copyToClipboard(frame.token);
              toast[ok ? "success" : "error"](ok ? "Token copied" : "Copy failed");
            }}
            className="btn btn-secondary btn-sm"
          >
            copy
          </button>
        </div>
        <p className="mt-1.5 text-[10.5px] text-[var(--fc-fg-subtle)]">
          Use it when both sides are confirmed agents and the channel is long,
          expensive, or only carries sound. The switch back is always available.
        </p>
      </div>
    </div>
  );
}
