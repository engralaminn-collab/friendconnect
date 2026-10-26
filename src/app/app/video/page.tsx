"use client";

import * as React from "react";
import {
  Captions,
  Clapperboard,
  Copy,
  Download,
  Film,
  GripVertical,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, downloadFile, formatDate, uid } from "@/lib/utils";
import type { VideoProject, VideoScene } from "@/lib/types";

const hookPatterns = [
  { name: "The contradiction", example: "Most attribution tools are lying to you." },
  { name: "The concrete number", example: "We tracked £4.2m in one quarter. Two-thirds of it was invisible." },
  { name: "The artefact", example: "Show the broken thing first, then explain it." },
  { name: "The named cost", example: "This costs you £180,000 a year." },
  { name: "The live failure", example: "Screen record the error happening, in real time." },
  { name: "The second person", example: "If you run paid ads, this matters." },
];

const statusTone = {
  idea: "neutral",
  scripting: "brand",
  production: "violet",
  editing: "signal",
  published: "success",
} as const;

const formats = [
  { id: "short", label: "Short", aspect: "9:16", max: 90 },
  { id: "long", label: "Long form", aspect: "16:9", max: 1200 },
  { id: "square", label: "Square", aspect: "1:1", max: 180 },
  { id: "explainer", label: "Explainer", aspect: "16:9", max: 300 },
] as const;

export default function VideoPage() {
  const videos = useStore((s) => s.videos);
  const updateVideo = useStore((s) => s.updateVideo);
  const addVideo = useStore((s) => s.addVideo);
  const toast = useToast();

  const [activeId, setActiveId] = React.useState<string | null>(videos[0]?.id ?? null);
  const [sceneModal, setSceneModal] = React.useState(false);
  const [sceneForm, setSceneForm] = React.useState({
    title: "",
    narration: "",
    duration: 15,
    shot: "",
    transition: "cut",
    color: "#3b64f6",
  });

  const active = videos.find((v) => v.id === activeId) ?? videos[0] ?? null;

  const totalDuration = videos.reduce((a, v) => a + v.duration, 0);
  const published = videos.filter((v) => v.status === "published").length;

  const addScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!sceneForm.title.trim()) {
      toast.warning("Missing title", "Name the scene.");
      return;
    }
    const scene: VideoScene = {
      id: uid("sc"),
      index: active.scenes.length + 1,
      title: sceneForm.title.trim(),
      narration: sceneForm.narration,
      duration: Number(sceneForm.duration) || 10,
      shot: sceneForm.shot,
      transition: sceneForm.transition,
      color: sceneForm.color,
    };
    const scenes = [...active.scenes, scene].map((s, i) => ({ ...s, index: i + 1 }));
    updateVideo(active.id, {
      scenes,
      duration: scenes.reduce((a, s) => a + s.duration, 0),
    });
    setSceneModal(false);
    setSceneForm({
      title: "",
      narration: "",
      duration: 15,
      shot: "",
      transition: "cut",
      color: "#3b64f6",
    });
    toast.success("Scene added", `${scene.title} is in the timeline.`);
  };

  const removeScene = (sceneId: string) => {
    if (!active) return;
    const scenes = active.scenes
      .filter((s) => s.id !== sceneId)
      .map((s, i) => ({ ...s, index: i + 1 }));
    updateVideo(active.id, {
      scenes,
      duration: scenes.reduce((a, s) => a + s.duration, 0),
    });
  };

  const updateScene = (sceneId: string, patch: Partial<VideoScene>) => {
    if (!active) return;
    const scenes = active.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s));
    updateVideo(active.id, {
      scenes,
      duration: scenes.reduce((a, s) => a + s.duration, 0),
    });
  };

  const generateCaptions = () => {
    if (!active || active.scenes.length === 0) {
      toast.warning("No scenes", "Add scenes before generating captions.");
      return;
    }
    let t = 0;
    const captions = active.scenes.map((s) => {
      const mm = String(Math.floor(t / 60)).padStart(2, "0");
      const ss = String(Math.floor(t % 60)).padStart(2, "0");
      t += s.duration;
      return { time: `${mm}:${ss}`, text: s.narration || s.title };
    });
    updateVideo(active.id, { captions });
    toast.success("Captions generated", `${captions.length} cues aligned to the timeline.`);
  };

  const exportSrt = () => {
    if (!active || active.captions.length === 0) {
      toast.warning("No captions", "Generate captions first.");
      return;
    }
    const srt = active.captions
      .map((c, i) => {
        const next = active.captions[i + 1];
        const toSec = (t: string) => {
          const [m, s] = t.split(":").map(Number);
          return m * 60 + s;
        };
        const fmt = (sec: number) => {
          const h = String(Math.floor(sec / 3600)).padStart(2, "0");
          const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
          const s = String(Math.floor(sec % 60)).padStart(2, "0");
          return `${h}:${m}:${s},000`;
        };
        return `${i + 1}\n${fmt(toSec(c.time))} --> ${fmt(
          next ? toSec(next.time) : toSec(c.time) + 3,
        )}\n${c.text}\n`;
      })
      .join("\n");
    downloadFile(
      `${active.title.toLowerCase().replace(/\s+/g, "-")}.srt`,
      srt,
      "text/plain",
    );
    toast.success("SRT exported", "Ready for any editor.");
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Studios"
        title="Video studio"
        description="Hook, script, scene list, shot notes and caption timing — with a template that keeps every video on the same structural spine."
        actions={
          <button
            onClick={() => {
              const created = addVideo({
                title: "Untitled video",
                format: "short",
                hook: "",
                scenes: [],
                status: "idea",
                aspect: "9:16",
                voice: "Aria — Warm Narration",
                captions: [],
                duration: 0,
              });
              setActiveId(created.id);
              toast.success("Project created", "Untitled video");
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus className="size-3.5" />
            New project
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Projects"
          value={videos.length}
          deltaLabel={`${published} published`}
          icon={<Clapperboard className="size-4" />}
        />
        <StatCard
          label="Total runtime"
          value={`${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`}
          deltaLabel="across every project"
          icon={<Film className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Scenes"
          value={videos.reduce((a, v) => a + v.scenes.length, 0)}
          deltaLabel="shot and scripted"
          icon={<Captions className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Caption cues"
          value={videos.reduce((a, v) => a + v.captions.length, 0)}
          deltaLabel="aligned to timelines"
          icon={<Wand2 className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[240px_1fr_290px]">
        {/* ---------- Project list ---------- */}
        <div className="fc-card flex flex-col overflow-hidden">
          <div className="border-b border-[var(--fc-line)] px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
            Projects
          </div>
          <ul>
            {videos.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() => setActiveId(v.id)}
                  className={cn(
                    "w-full border-b border-[var(--fc-line)] px-3.5 py-3 text-left transition-colors",
                    activeId === v.id
                      ? "bg-[var(--color-brand-500)]/[0.09]"
                      : "hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <span className="block truncate text-[12.5px] font-semibold">{v.title}</span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <Badge tone={statusTone[v.status]}>{v.status}</Badge>
                    <span className="text-[10.5px] text-[var(--fc-fg-subtle)]">
                      {v.aspect} · {v.duration}s
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ---------- Editor ---------- */}
        <div className="space-y-4">
          {!active ? (
            <EmptyState
              icon={<Clapperboard className="size-6" />}
              title="No project open"
              description="Create a project to start scripting."
            />
          ) : (
            <>
              <div className="fc-card p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    className="min-w-[200px] flex-1 bg-transparent text-[17px] font-semibold outline-none"
                    value={active.title}
                    onChange={(e) => updateVideo(active.id, { title: e.target.value })}
                  />
                  <select
                    className="field h-9 w-auto py-0 text-[12.5px]"
                    value={active.status}
                    onChange={(e) =>
                      updateVideo(active.id, {
                        status: e.target.value as VideoProject["status"],
                      })
                    }
                  >
                    {(["idea", "scripting", "production", "editing", "published"] as const).map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                      Hook — the first three seconds
                    </span>
                    <textarea
                      className="field min-h-[70px] resize-y"
                      value={active.hook}
                      onChange={(e) => updateVideo(active.id, { hook: e.target.value })}
                      placeholder="Most attribution tools are lying to you."
                    />
                  </label>
                  <div className="grid gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                        Format
                      </span>
                      <select
                        className="field"
                        value={active.format}
                        onChange={(e) => {
                          const f = formats.find((x) => x.id === e.target.value);
                          updateVideo(active.id, {
                            format: e.target.value as VideoProject["format"],
                            aspect: f?.aspect ?? "9:16",
                          });
                        }}
                      >
                        {formats.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label} ({f.aspect})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                        Voice
                      </span>
                      <select
                        className="field"
                        value={active.voice}
                        onChange={(e) => updateVideo(active.id, { voice: e.target.value })}
                      >
                        {[
                          "Aria — Warm Narration",
                          "Kai — Crisp Explainer",
                          "Nova — Bright",
                          "Liam — Conversational",
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className="fc-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
                  <h2 className="text-[15px] font-semibold">
                    Scene list{" "}
                    <span className="font-normal text-[var(--fc-fg-muted)]">
                      ({active.scenes.length} scenes · {active.duration}s)
                    </span>
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={generateCaptions} className="btn btn-secondary btn-sm">
                      <Captions className="size-3.5" />
                      Generate captions
                    </button>
                    <button onClick={exportSrt} className="btn btn-secondary btn-sm">
                      <Download className="size-3.5" />
                      SRT
                    </button>
                    <button onClick={() => setSceneModal(true)} className="btn btn-primary btn-sm">
                      <Plus className="size-3.5" />
                      Add scene
                    </button>
                  </div>
                </div>

                {active.scenes.length === 0 ? (
                  <div className="p-5">
                    <EmptyState
                      icon={<Film className="size-6" />}
                      title="No scenes yet"
                      description="Break the script into scenes, each with narration, a shot and a transition."
                    />
                  </div>
                ) : (
                  <ol className="divide-y divide-[var(--fc-line)]">
                    {active.scenes.map((scene) => (
                      <li key={scene.id} className="group flex gap-3 p-4">
                        <div className="flex w-10 shrink-0 flex-col items-center gap-1.5">
                          <span
                            className="grid size-8 place-items-center rounded-lg text-[12px] font-bold text-white"
                            style={{ backgroundColor: scene.color }}
                          >
                            {scene.index}
                          </span>
                          <GripVertical className="size-3.5 text-[var(--fc-fg-subtle)] opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              className="field h-8 max-w-[220px] py-0 text-[13px] font-semibold"
                              value={scene.title}
                              onChange={(e) =>
                                updateScene(scene.id, { title: e.target.value })
                              }
                            />
                            <Badge>{scene.duration}s</Badge>
                            <Badge>{scene.transition}</Badge>
                          </div>
                          <textarea
                            className="field min-h-[56px] resize-y text-[12.5px]"
                            value={scene.narration}
                            placeholder="Narration for this scene…"
                            onChange={(e) =>
                              updateScene(scene.id, { narration: e.target.value })
                            }
                          />
                          <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                            <input
                              className="field h-8 py-0 text-[12px]"
                              placeholder="Shot: presenter + b-roll"
                              value={scene.shot}
                              onChange={(e) => updateScene(scene.id, { shot: e.target.value })}
                            />
                            <select
                              className="field h-8 py-0 text-[12px]"
                              value={scene.transition}
                              onChange={(e) =>
                                updateScene(scene.id, { transition: e.target.value })
                              }
                            >
                              {["cut", "dissolve", "slide", "zoom", "fade", "wipe"].map((t) => (
                                <option key={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button
                          onClick={() => removeScene(scene.id)}
                          className="btn btn-ghost btn-icon size-8 shrink-0 text-rose-500 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {active.captions.length > 0 && (
                <div className="fc-card p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold">Caption track</h2>
                    <Badge tone="brand">{active.captions.length} cues</Badge>
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {active.captions.map((c, i) => (
                      <li
                        key={i}
                        className="flex gap-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                      >
                        <span className="shrink-0 font-mono text-[11.5px] font-semibold text-[var(--color-brand-500)]">
                          {c.time}
                        </span>
                        <span className="text-[12.5px] text-[var(--fc-fg-muted)]">{c.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* ---------- Sidebar ---------- */}
        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Sparkles className="size-4 text-[var(--color-brand-500)]" />
              Hook patterns
            </h2>
            <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
              Patterns that held attention past second three
            </p>
            <ul className="mt-3 space-y-2">
              {hookPatterns.map((h) => (
                <li
                  key={h.name}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold">{h.name}</span>
                    <button
                      onClick={async () => {
                        const ok = await copyToClipboard(h.example);
                        toast[ok ? "success" : "error"](ok ? "Hook copied" : "Copy failed");
                      }}
                      className="text-[var(--fc-fg-subtle)] hover:text-[var(--color-brand-500)]"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 text-[11.5px] italic text-[var(--fc-fg-muted)]">
                    “{h.example}”
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                const pattern = hookPatterns[Math.floor(Math.random() * hookPatterns.length)];
                if (active) {
                  updateVideo(active.id, { hook: pattern.example });
                  toast.success("Hook applied", pattern.name);
                }
              }}
              className="btn btn-secondary btn-sm mt-3 w-full"
            >
              <Wand2 className="size-3.5" />
              Surprise me
            </button>
          </div>

          {active && (
            <div className="fc-card p-5">
              <h2 className="text-[15px] font-semibold">Production checklist</h2>
              <ul className="mt-3 space-y-2">
                {[
                  { l: "Hook written", d: !!active.hook },
                  { l: "Scenes scripted", d: active.scenes.length > 0 },
                  { l: "Narration complete", d: active.scenes.every((s) => s.narration.length > 10) },
                  { l: "Captions generated", d: active.captions.length > 0 },
                  { l: "Voice selected", d: !!active.voice },
                  { l: "Published", d: active.status === "published" },
                ].map((c) => (
                  <li
                    key={c.l}
                    className="flex items-center gap-2.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-[12.5px]"
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-full",
                        c.d
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)]",
                      )}
                    >
                      {c.d ? <span className="size-1.5 rounded-full bg-current" /> : null}
                    </span>
                    {c.l}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <Progress
                  value={
                    ([!!active.hook, active.scenes.length > 0, active.captions.length > 0].filter(
                      Boolean,
                    ).length /
                      3) *
                    100
                  }
                  tone="accent"
                />
              </div>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={sceneModal}
        onClose={() => setSceneModal(false)}
        title="Add a scene"
        description="One idea per scene. If it needs two sentences to describe, split it."
        footer={
          <>
            <button onClick={() => setSceneModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={addScene} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Add scene
            </button>
          </>
        }
      >
        <form onSubmit={addScene} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Scene title *</span>
            <input
              className="field"
              value={sceneForm.title}
              onChange={(e) => setSceneForm({ ...sceneForm, title: e.target.value })}
              placeholder="Cold open"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Narration</span>
            <textarea
              className="field min-h-[90px] resize-y"
              value={sceneForm.narration}
              onChange={(e) => setSceneForm({ ...sceneForm, narration: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Shot</span>
            <input
              className="field"
              value={sceneForm.shot}
              onChange={(e) => setSceneForm({ ...sceneForm, shot: e.target.value })}
              placeholder="Presenter, tight framing, b-roll of a runaway console"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">
                Duration — {sceneForm.duration}s
              </span>
              <input
                type="range"
                min={3}
                max={90}
                value={sceneForm.duration}
                onChange={(e) =>
                  setSceneForm({ ...sceneForm, duration: Number(e.target.value) })
                }
                className="w-full accent-[var(--color-brand-500)]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Transition</span>
              <select
                className="field"
                value={sceneForm.transition}
                onChange={(e) => setSceneForm({ ...sceneForm, transition: e.target.value })}
              >
                {["cut", "dissolve", "slide", "zoom", "fade", "wipe"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <span className="mb-1.5 block text-[12.5px] font-semibold">Colour</span>
            <div className="flex flex-wrap gap-2">
              {["#3b64f6", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#22c55e"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSceneForm({ ...sceneForm, color: c })}
                  className={cn(
                    "size-7 rounded-md border-2 transition-transform hover:scale-110",
                    sceneForm.color === c ? "border-[var(--fc-fg)]" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Colour ${c}`}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
