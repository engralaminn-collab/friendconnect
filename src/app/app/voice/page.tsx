"use client";

import * as React from "react";
import {
  AudioLines,
  Copy,
  Download,
  Gauge,
  Mic,
  Pause,
  Play,
  Plus,
  Square,
  Trash2,
  Volume2,
  Wand2,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Meter } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, downloadFile, seededRandom, wordCount } from "@/lib/utils";
import type { VoiceClip } from "@/lib/types";

const VOICE_PROFILES = [
  { name: "Aria — Warm Narration", pitch: 1.05, rate: 1, hue: 226 },
  { name: "Kai — Crisp Explainer", pitch: 0.95, rate: 1.08, hue: 158 },
  { name: "Nova — Bright", pitch: 1.18, rate: 1.05, hue: 288 },
  { name: "Liam — Conversational", pitch: 0.92, rate: 0.98, hue: 34 },
  { name: "Iris — Documentary", pitch: 0.86, rate: 0.92, hue: 268 },
  { name: "Zane — Authoritative", pitch: 0.78, rate: 0.95, hue: 12 },
];

const WAVEFORM_COLORS = ["#3b64f6", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444"];

/** Deterministic pseudo-waveform derived from the text. */
function waveform(text: string, bars = 64) {
  const rnd = seededRandom(text || "silent");
  const words = wordCount(text);
  const density = Math.min(1, words / 45);
  return Array.from({ length: bars }, (_, i) => {
    const base = 0.28 + rnd() * 0.72;
    const envelope = 0.55 + 0.45 * Math.sin((i / bars) * Math.PI);
    const punctBoost = /[,.!?]/.test(text[Math.floor((i / bars) * text.length)] ?? "")
      ? 0.22
      : 0;
    return Math.min(1, base * envelope * (0.55 + density * 0.6) + punctBoost);
  });
}

export default function VoicePage() {
  const clips = useStore((s) => s.voiceClips);
  const addClip = useStore((s) => s.addVoiceClip);
  const removeClip = useStore((s) => s.removeVoiceClip);
  const toast = useToast();

  const [title, setTitle] = React.useState("New narration");
  const [text, setText] = React.useState("");
  const [voiceName, setVoiceName] = React.useState(VOICE_PROFILES[0].name);
  const [rate, setRate] = React.useState(1);
  const [pitch, setPitch] = React.useState(1);
  const [tags, setTags] = React.useState("");
  const [speaking, setSpeaking] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [charIndex, setCharIndex] = React.useState(-1);
  const [supported, setSupported] = React.useState(true);

  const profile = VOICE_PROFILES.find((v) => v.name === voiceName)!;
  const bars = React.useMemo(() => waveform(text), [text]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const duration = Math.max(0, (words / (150 * rate)) * 60);

  React.useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = () => {
    if (!supported) {
      toast.warning("Not supported", "This browser has no speech synthesis engine.");
      return;
    }
    if (!text.trim()) {
      toast.warning("Nothing to say", "Write the narration first.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const systemVoices = window.speechSynthesis.getVoices();
    const match =
      systemVoices.find((v) => v.name.toLowerCase().includes(profile.name.split(" ")[0].toLowerCase())) ??
      systemVoices.find((v) => v.lang.startsWith("en"));
    if (match) utterance.voice = match;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onboundary = (e) => setCharIndex(e.charIndex);
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
      setCharIndex(-1);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    setPaused(false);
  };

  const pause = () => {
    if (!supported) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  const stop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setCharIndex(-1);
  };

  const save = () => {
    if (!text.trim()) {
      toast.warning("Nothing to save", "Write some narration first.");
      return;
    }
    addClip({
      title: title.trim() || "Untitled clip",
      text,
      voice: voiceName,
      rate,
      pitch,
      duration: Math.round(duration * 10) / 10,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    toast.success("Clip saved", `${title} added to your library.`);
  };

  const renderWords = () => {
    const parts = text.split(/(\s+)/);
    let offset = 0;
    return parts.map((p, i) => {
      const start = offset;
      offset += p.length;
      if (!p.trim()) return <span key={i}>{p}</span>;
      const active = charIndex >= 0 && charIndex >= start && charIndex < start + p.length;
      return (
        <span
          key={i}
          className={cn(
            "rounded px-0.5 transition-colors",
            active && "bg-[var(--color-brand-500)] text-white",
          )}
        >
          {p}
        </span>
      );
    });
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Studios"
        title="Voice studio"
        description="Browser-native narration with six voice profiles, live word highlighting and a waveform preview computed from the script itself."
        actions={
          <button onClick={save} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            Save clip
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Clips"
          value={clips.length}
          deltaLabel="in the library"
          icon={<AudioLines className="size-4" />}
        />
        <StatCard
          label="Words in script"
          value={words}
          deltaLabel={`${Math.round(duration)}s estimated runtime`}
          icon={<Mic className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Speech rate"
          value={`${rate.toFixed(2)}×`}
          deltaLabel="150 words per minute at 1.00"
          icon={<Gauge className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Engine"
          value={supported ? "Ready" : "Missing"}
          deltaLabel="Web Speech synthesis"
          icon={<Volume2 className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="fc-card p-5">
            <input
              className="w-full bg-transparent text-[17px] font-semibold outline-none placeholder:text-[var(--fc-fg-subtle)]"
              placeholder="Clip title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="mt-4 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                <span>Waveform</span>
                <span>{words} words · ~{Math.round(duration)}s</span>
              </div>
              <div className="flex h-24 items-center gap-[3px]">
                {bars.map((b, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-full transition-all duration-300",
                      speaking && charIndex >= 0 && i % 7 === 0 && "animate-pulse",
                    )}
                    style={{
                      height: `${Math.max(6, b * 100)}%`,
                      backgroundImage: `linear-gradient(180deg, ${profile.hue ? WAVEFORM_COLORS[i % WAVEFORM_COLORS.length] : "#3b64f6"}, color-mix(in oklab, ${WAVEFORM_COLORS[i % WAVEFORM_COLORS.length]} 60%, #111))`,
                    }}
                  />
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={speaking ? stop : speak}
                  className={cn("btn", speaking ? "btn-danger" : "btn-primary")}
                >
                  {speaking ? (
                    <>
                      <Square className="size-3.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" />
                      Speak
                    </>
                  )}
                </button>
                <button
                  onClick={pause}
                  disabled={!speaking}
                  className="btn btn-secondary"
                >
                  {paused ? (
                    <>
                      <Play className="size-3.5" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="size-3.5" />
                      Pause
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setText("");
                    setCharIndex(-1);
                  }}
                  className="btn btn-ghost"
                >
                  Clear
                </button>
                <div className="ml-auto flex items-center gap-2 text-[12px] text-[var(--fc-fg-muted)]">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  {supported ? "Browser engine" : "Unavailable"}
                </div>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Script
              </span>
              <textarea
                className="field min-h-[180px] resize-y text-[14px] leading-relaxed"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write the narration. Under 165 words per minute — and one idea per sentence."
              />
            </label>

            {text.trim() && (
              <div className="mt-4 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  Live transcript
                </div>
                <p className="text-[14px] leading-relaxed">{renderWords()}</p>
              </div>
            )}
          </div>

          <div className="fc-card overflow-hidden">
            <div className="border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
              <h2 className="text-[15px] font-semibold">Clip library</h2>
            </div>
            {clips.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<AudioLines className="size-6" />}
                  title="No clips yet"
                  description="Save a narration to build your library."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--fc-line)]">
                {clips.map((c) => (
                  <li key={c.id} className="group flex items-center gap-3 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
                      <AudioLines className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-semibold">{c.title}</span>
                        <Badge>{c.voice.split(" — ")[0]}</Badge>
                        {c.tags.map((t) => (
                          <span key={t} className="chip">
                            {t}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] text-[var(--fc-fg-muted)]">
                        {c.text}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="mr-2 text-[11.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                        {c.duration}s
                      </span>
                      <button
                        onClick={async () => {
                          const ok = await copyToClipboard(c.text);
                          toast[ok ? "success" : "error"](ok ? "Script copied" : "Copy failed");
                        }}
                        className="btn btn-ghost btn-icon size-8"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          downloadFile(
                            `${c.title.toLowerCase().replace(/\s+/g, "-")}.txt`,
                            `${c.title}\nVoice: ${c.voice} · ${c.duration}s\n\n${c.text}`,
                          );
                          toast.success("Downloaded", c.title);
                        }}
                        className="btn btn-ghost btn-icon size-8"
                      >
                        <Download className="size-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          removeClip(c.id);
                          toast.info("Clip removed", c.title);
                        }}
                        className="btn btn-ghost btn-icon size-8 text-rose-500 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Voice profile</h2>
            <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
              Six presets, each with its own pacing
            </p>
            <div className="mt-4 space-y-2">
              {VOICE_PROFILES.map((v) => (
                <button
                  key={v.name}
                  onClick={() => {
                    setVoiceName(v.name);
                    setRate(v.rate);
                    setPitch(v.pitch);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    voiceName === v.name
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.08]"
                      : "border-[var(--fc-line)] bg-[var(--fc-surface-2)] hover:border-[var(--color-brand-400)]",
                  )}
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                    style={{
                      backgroundImage: `linear-gradient(135deg, hsl(${v.hue} 72% 52%), hsl(${
                        (v.hue + 42) % 360
                      } 74% 44%))`,
                    }}
                  >
                    <Volume2 className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold">{v.name}</span>
                    <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">
                      rate {v.rate.toFixed(2)} · pitch {v.pitch.toFixed(2)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Controls</h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="font-medium">Rate</span>
                  <span className="tabular-nums text-[var(--fc-fg-muted)]">
                    {rate.toFixed(2)}×
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.02}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full accent-[var(--color-brand-500)]"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="font-medium">Pitch</span>
                  <span className="tabular-nums text-[var(--fc-fg-muted)]">
                    {pitch.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.6}
                  step={0.02}
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  className="w-full accent-[var(--color-brand-500)]"
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium">Tags</span>
                <input
                  className="field"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="narration, explainer"
                />
              </label>
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Wand2 className="size-4 text-[var(--color-accent-500)]" />
              Delivery standards
            </h2>
            <div className="mt-4 space-y-3">
              <Meter value={Math.min(100, (words / 160) * 100)} label="Scene length" suffix=" words" />
              <Meter
                value={Math.min(100, Math.abs(rate - 1) * 250)}
                label="Rate deviation"
                suffix="%"
                color="var(--color-signal-500)"
              />
              <Meter
                value={Math.min(100, Math.abs(pitch - 1) * 250)}
                label="Pitch deviation"
                suffix="%"
                color="var(--color-accent-500)"
              />
            </div>
            <ul className="mt-4 space-y-2 text-[12px] text-[var(--fc-fg-muted)]">
              <li>• Narration under 165 words per minute.</li>
              <li>• One idea per sentence, under 18 words.</li>
              <li>• Burn captions in — do not rely on a platform toggle.</li>
              <li>• Target −16 LUFS for social, −14 LUFS for podcast.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
