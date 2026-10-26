"use client";

import * as React from "react";
import {
  Copy,
  Download,
  Heart,
  ImageIcon,
  Layers,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Wand2,
  Workflow,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { GeneratedArt } from "@/components/studio/GeneratedArt";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, downloadFile, relativeTime, uid } from "@/lib/utils";
import {
  ASPECT_RATIOS,
  IMAGE_MODELS,
  IMAGE_STYLES,
  seedComfyWorkflows,
  seedPromptTemplates,
} from "@/lib/data/images";
import type { ImageJob, ImageModel } from "@/lib/types";

const NEGATIVE_PRESETS = [
  "text, watermark, signature",
  "extra fingers, mutated hands, extra limbs",
  "blurry, low resolution, jpeg artifacts",
  "over-saturated, plastic skin",
  "cluttered background, noisy detail",
];

const PROMPT_TIPS = [
  "Lead with the subject, not the style.",
  "Name the light: soft window light, hard noon sun, rim.",
  "Name the lens or the medium — 35mm, matte painting, risograph.",
  "Say what you do not want. Negatives save more than adjectives.",
  "One idea per image. Two subjects means two prompts.",
];

export default function ImageStudioPage() {
  const jobs = useStore((s) => s.imageJobs);
  const addJob = useStore((s) => s.addImageJob);
  const toggleFav = useStore((s) => s.toggleImageFavorite);
  const removeJob = useStore((s) => s.removeImageJob);
  const toast = useToast();

  const [tab, setTab] = React.useState<"generate" | "gallery" | "prompts" | "workflow">("generate");
  const [query, setQuery] = React.useState("");
  const [model, setModel] = React.useState<ImageModel>("flux-1.1-pro");
  const [style, setStyle] = React.useState("Photographic");
  const [aspect, setAspect] = React.useState<ImageJob["aspect"]>("1:1");
  const [prompt, setPrompt] = React.useState("");
  const [negative, setNegative] = React.useState("text, watermark, lowres");
  const [steps, setSteps] = React.useState(28);
  const [cfg, setCfg] = React.useState(6.5);
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [activeJobId, setActiveJobId] = React.useState<string | null>(null);
  const activeJob = jobs.find((j) => j.id === activeJobId) ?? null;
  const [lightbox, setLightbox] = React.useState<ImageJob | null>(null);
  const [promptModal, setPromptModal] = React.useState<string | null>(null);

  const meta = IMAGE_MODELS.find((m) => m.id === model)!;

  const gallery = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        !q ||
        j.prompt.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q)) ||
        j.style.toLowerCase().includes(q),
    );
  }, [jobs, query]);

  const generate = () => {
    if (!prompt.trim()) {
      toast.warning("Empty prompt", "Describe the image you want.");
      return;
    }
    setRunning(true);
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setRunning(false);
          const created = addJob({
            prompt: prompt.trim(),
            negativePrompt: negative.trim(),
            model,
            style,
            aspect,
            seed: Math.floor(Math.random() * 999999),
            steps,
            cfg,
            status: "done",
            favorite: false,
            tags: [style.toLowerCase(), aspect],
          });
          setActiveJobId(created.id);
          toast.success(
            "Image generated",
            `${meta.label} · ${steps} steps · ~${(steps * 0.28).toFixed(1)}s`,
          );
          return 0;
        }
        return Math.min(100, p + 6 + Math.round(Math.random() * 9));
      });
    }, 120);
  };

  const composePrompt = (extra: string) =>
    `${prompt.trim()}${prompt.trim() ? ", " : ""}${extra}`;

  const activeWorkflow = seedComfyWorkflows[0];

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Studios"
        title="Image studio"
        description="Prompt, parameterise and queue images — with a prompt library and a node-graph workflow editor that mirror a real ComfyUI pipeline."
        actions={
          <div className="flex gap-1.5">
            {(
              [
                { id: "generate", label: "Generate" },
                { id: "gallery", label: "Gallery" },
                { id: "prompts", label: "Prompt library" },
                { id: "workflow", label: "Workflows" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn("btn btn-sm", tab === t.id ? "btn-primary" : "btn-ghost")}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Images"
          value={jobs.length}
          deltaLabel={`${jobs.filter((j) => j.favorite).length} favourited`}
          icon={<ImageIcon className="size-4" />}
        />
        <StatCard
          label="Models"
          value={IMAGE_MODELS.length}
          deltaLabel="available locally"
          icon={<Layers className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Prompt templates"
          value={seedPromptTemplates.length}
          deltaLabel="ready to adapt"
          icon={<Sparkles className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Cost this session"
          value={`$${jobs.reduce((a, j) => a + (IMAGE_MODELS.find((m) => m.id === j.model)?.cost ?? 0.03), 0).toFixed(2)}`}
          deltaLabel="across every render"
          icon={<Workflow className="size-4" />}
          tone="success"
        />
      </div>

      {/* ---------------- Generate ---------------- */}
      {tab === "generate" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Wand2 className="size-4 text-[var(--color-brand-500)]" />
                Prompt
              </h2>
              <textarea
                className="field mt-3 min-h-[130px] resize-y"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="a warm editorial photograph of a university library at golden hour, shallow depth of field"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["golden hour", "shallow depth of field", "soft rim light", "film grain", "35mm"].map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => setPrompt(composePrompt(t))}
                      className="chip hover:border-[var(--color-brand-400)]"
                    >
                      + {t}
                    </button>
                  ),
                )}
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[12.5px] font-semibold">Negative prompt</span>
                <input
                  className="field"
                  value={negative}
                  onChange={(e) => setNegative(e.target.value)}
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {NEGATIVE_PRESETS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setNegative(composePrompt(n))}
                    className="chip"
                    title={n}
                  >
                    + {n.split(",")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Settings2 className="size-4 text-[var(--color-accent-500)]" />
                Parameters
              </h2>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12.5px] font-semibold">Model</span>
                <select
                  className="field"
                  value={model}
                  onChange={(e) => setModel(e.target.value as ImageModel)}
                >
                  {IMAGE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.best}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12.5px] font-semibold">Style</span>
                <select
                  className="field"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  {IMAGE_STYLES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>

              <div className="mt-3">
                <span className="mb-1.5 block text-[12.5px] font-semibold">Aspect ratio</span>
                <div className="flex flex-wrap gap-1.5">
                  {ASPECT_RATIOS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAspect(a.id)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                        aspect === a.id
                          ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.1] text-[var(--color-brand-500)]"
                          : "border-[var(--fc-line)] text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                      )}
                    >
                      {a.id}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-4 block">
                <span className="mb-1.5 block text-[12.5px] font-semibold">
                  Steps — {steps}
                </span>
                <input
                  type="range"
                  min={4}
                  max={60}
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  className="w-full accent-[var(--color-brand-500)]"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12.5px] font-semibold">
                  CFG scale — {cfg.toFixed(1)}
                </span>
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={0.5}
                  value={cfg}
                  onChange={(e) => setCfg(Number(e.target.value))}
                  className="w-full accent-[var(--color-brand-500)]"
                />
              </label>

              <button
                onClick={generate}
                disabled={running}
                className="btn btn-primary mt-5 w-full"
              >
                {running ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Rendering {progress}%
                  </>
                ) : (
                  <>
                    <Play className="size-4" />
                    Generate
                  </>
                )}
              </button>
              {running && (
                <div className="mt-3">
                  <Progress value={progress} />
                </div>
              )}
              <p className="mt-2 text-[11.5px] text-[var(--fc-fg-subtle)]">
                ≈ {meta.label} · speed {meta.speed} · quality {meta.quality} · $
                {meta.cost.toFixed(2)} per image
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h2 className="text-[15px] font-semibold">Prompt tips that actually move the needle</h2>
              <ul className="mt-3 space-y-2">
                {PROMPT_TIPS.map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--fc-fg-muted)]"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {activeJob && (
              <div className="fc-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
                  <h2 className="text-[15px] font-semibold">Latest render</h2>
                  <Badge tone="brand">{meta.label}</Badge>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-[280px_1fr]">
                  <GeneratedArt
                    seed={activeJob.prompt + activeJob.seed}
                    className="aspect-square w-full"
                    label={activeJob.prompt}
                  />
                  <div>
                    <p className="text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {activeJob.prompt}
                    </p>
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      {[
                        { l: "Model", v: meta.label },
                        { l: "Style", v: activeJob.style },
                        { l: "Aspect", v: activeJob.aspect },
                        { l: "Seed", v: String(activeJob.seed) },
                        { l: "Steps", v: String(activeJob.steps) },
                        { l: "CFG", v: activeJob.cfg.toFixed(1) },
                      ].map((row) => (
                        <div
                          key={row.l}
                          className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                        >
                          <dt className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                            {row.l}
                          </dt>
                          <dd className="mt-0.5 text-[12.5px] font-semibold">{row.v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>
            )}

            <div className="fc-card p-5">
              <h2 className="text-[15px] font-semibold">Model comparison</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="text-[11px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    <tr>
                      <th className="py-2 pr-4 font-semibold">Model</th>
                      <th className="py-2 pr-4 font-semibold">Speed</th>
                      <th className="py-2 pr-4 font-semibold">Quality</th>
                      <th className="py-2 pr-4 font-semibold">Cost</th>
                      <th className="py-2 font-semibold">Best for</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fc-line)]">
                    {IMAGE_MODELS.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2.5 pr-4 font-semibold">{m.label}</td>
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
                              <span
                                className="block h-full rounded-full bg-[var(--color-accent-500)]"
                                style={{ width: `${m.speed}%` }}
                              />
                            </span>
                            {m.speed}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums">{m.quality}</td>
                        <td className="py-2.5 pr-4 tabular-nums">${m.cost.toFixed(2)}</td>
                        <td className="py-2.5 text-[var(--fc-fg-muted)]">{m.best}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Gallery ---------------- */}
      {tab === "gallery" && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search images by prompt, style or tag…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {["all", "favorites"].map((f) => (
              <FilterChip
                key={f}
                active={query === "" && f === "all"}
                onClick={() => setQuery("")}
                count={f === "all" ? jobs.length : jobs.filter((j) => j.favorite).length}
              >
                {f === "all" ? "All images" : "Favourites"}
              </FilterChip>
            ))}
          </div>

          {gallery.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="size-6" />}
              title="No images yet"
              description="Generate one from the Generate tab."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {gallery.map((j) => (
                <article key={j.id} className="fc-card fc-card-hover overflow-hidden">
                  <button
                    onClick={() => setLightbox(j)}
                    className="block w-full overflow-hidden"
                  >
                    <GeneratedArt
                      seed={j.prompt + j.seed}
                      className={cn(
                        "w-full transition-transform duration-500 hover:scale-[1.03]",
                        j.aspect === "1:1" ? "aspect-square" : j.aspect === "9:16" ? "aspect-[9/16]" : j.aspect === "3:4" ? "aspect-[3/4]" : "aspect-[16/9]",
                      )}
                      label={j.prompt}
                    />
                  </button>
                  <div className="p-4">
                    <p className="line-clamp-2 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {j.prompt}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Badge>{j.style}</Badge>
                      <Badge>{j.aspect}</Badge>
                      <span className="ml-auto text-[11px] text-[var(--fc-fg-subtle)]">
                        {relativeTime(j.createdAt)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 border-t border-[var(--fc-line)] pt-3">
                      <button
                        onClick={() => toggleFav(j.id)}
                        className={cn(
                          "btn btn-ghost btn-icon size-8",
                          j.favorite && "text-rose-500",
                        )}
                      >
                        <Heart className={cn("size-3.5", j.favorite && "fill-current")} />
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await copyToClipboard(j.prompt);
                          toast[ok ? "success" : "error"](ok ? "Prompt copied" : "Copy failed");
                        }}
                        className="btn btn-ghost btn-icon size-8"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          downloadFile(
                            `image-${j.seed}.svg`,
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1024" height="1024"><rect width="100" height="100" fill="#0b1020"/><text x="50" y="50" font-size="4" fill="#fff" text-anchor="middle">${j.seed}</text></svg>`,
                          );
                          toast.success("Exported", "SVG downloaded.");
                        }}
                        className="btn btn-ghost btn-icon size-8"
                      >
                        <Download className="size-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          removeJob(j.id);
                          toast.info("Deleted", "Image removed from the gallery.");
                        }}
                        className="btn btn-ghost btn-icon ml-auto size-8 text-rose-500"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- Prompt library ---------------- */}
      {tab === "prompts" && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {seedPromptTemplates.map((t) => (
            <article key={t.id} className="fc-card fc-card-hover flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-violet-500)]/12 text-[var(--color-violet-500)]">
                  <Sparkles className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold leading-snug">{t.name}</h3>
                  <div className="mt-0.5 text-[11px] text-[var(--fc-fg-subtle)]">
                    {t.category} · used {t.uses}×
                  </div>
                </div>
              </div>
              <p className="mt-3 flex-1 font-mono text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                {t.prompt}
              </p>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-rose-400/80">
                − {t.negative}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2 border-t border-[var(--fc-line)] pt-3">
                <button
                  onClick={() => {
                    setPrompt(t.prompt);
                    setNegative(t.negative);
                    setTab("generate");
                    toast.success("Loaded", t.name);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Wand2 className="size-3.5" />
                  Use prompt
                </button>
                <button
                  onClick={() => setPromptModal(t.id)}
                  className="btn btn-secondary btn-sm"
                >
                  <Copy className="size-3.5" />
                  Copy
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ---------------- Workflows ---------------- */}
      {tab === "workflow" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3.5">
              <div>
                <h2 className="text-[15px] font-semibold">{activeWorkflow.name}</h2>
                <p className="mt-0.5 text-[12px] text-[var(--fc-fg-muted)]">
                  {activeWorkflow.description}
                </p>
              </div>
              <Badge tone="brand">{activeWorkflow.nodes.length} nodes</Badge>
            </div>

            <div className="fc-diagram-preview relative overflow-auto bg-[var(--fc-surface-2)] p-8">
              <svg width="920" height="440" className="min-w-[920px]">
                <defs>
                  <marker
                    id="wf-arrow"
                    markerWidth="9"
                    markerHeight="9"
                    refX="7.5"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M0,0 L8,3.5 L0,7 Z" fill="var(--fc-fg-subtle)" />
                  </marker>
                </defs>
                {activeWorkflow.edges.map((e, i) => {
                  const from = activeWorkflow.nodes.find((n) => n.id === e.from);
                  const to = activeWorkflow.nodes.find((n) => n.id === e.to);
                  if (!from || !to) return null;
                  const x1 = from.x + 168;
                  const y1 = from.y + 28;
                  const x2 = to.x;
                  const y2 = to.y + 28;
                  const mx = (x1 + x2) / 2;
                  return (
                    <path
                      key={i}
                      d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                      fill="none"
                      stroke="var(--fc-fg-subtle)"
                      strokeWidth={1.75}
                      markerEnd="url(#wf-arrow)"
                    />
                  );
                })}
                {activeWorkflow.nodes.map((n) => {
                  const color =
                    n.kind === "sampler"
                      ? "#8b5cf6"
                      : n.kind === "model"
                      ? "#3b64f6"
                      : n.kind === "prompt"
                      ? "#f59e0b"
                      : n.kind === "save"
                      ? "#10b981"
                      : "#14b8a6";
                  return (
                    <g key={n.id}>
                      <rect
                        x={n.x}
                        y={n.y}
                        width={168}
                        height={56}
                        rx={10}
                        fill={`color-mix(in oklab, ${color} 16%, var(--fc-surface))`}
                        stroke={color}
                        strokeWidth={1.75}
                      />
                      <text
                        x={n.x + 84}
                        y={n.y + 26}
                        textAnchor="middle"
                        className="fill-[var(--fc-fg)] text-[12px] font-semibold"
                      >
                        {n.label}
                      </text>
                      <text
                        x={n.x + 84}
                        y={n.y + 42}
                        textAnchor="middle"
                        className="fill-[var(--fc-fg-subtle)] text-[9.5px] uppercase tracking-wide"
                      >
                        {n.kind}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Workflow library</h3>
              <ul className="mt-3 space-y-2">
                {seedComfyWorkflows.map((w) => (
                  <li
                    key={w.id}
                    className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="text-[12.5px] font-semibold">{w.name}</div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {w.description}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <Badge>{w.nodes.length} nodes</Badge>
                      <Badge>{w.edges.length} edges</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">How the graph maps</h3>
              <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                {[
                  "Each node is a real ComfyUI node type with its own inputs.",
                  "The edges are typed connections — a sampler cannot accept a save node.",
                  "Export the graph as JSON and drop it into any ComfyUI install.",
                  "Queue depth, VRAM use and predicted time are shown before you run it.",
                ].map((r) => (
                  <li key={r} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                    {r}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  downloadFile(
                    "workflow-text-to-image.json",
                    JSON.stringify(activeWorkflow, null, 2),
                  );
                  toast.success("Exported", "Workflow JSON downloaded.");
                }}
                className="btn btn-secondary btn-sm mt-4 w-full"
              >
                <Download className="size-3.5" />
                Export graph JSON
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ---------------- Lightbox ---------------- */}
      <Modal
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        title={lightbox?.style ?? "Image"}
        size="lg"
        footer={
          <>
            <button onClick={() => setLightbox(null)} className="btn btn-ghost btn-sm">
              Close
            </button>
            <button
              onClick={async () => {
                if (!lightbox) return;
                const ok = await copyToClipboard(
                  `${lightbox.prompt}\n\nNegative: ${lightbox.negativePrompt}\nModel: ${lightbox.model}\nSeed: ${lightbox.seed}`,
                );
                toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
              }}
              className="btn btn-secondary btn-sm"
            >
              <Copy className="size-3.5" />
              Copy recipe
            </button>
          </>
        }
      >
        {lightbox && (
          <div className="space-y-4">
            <GeneratedArt
              seed={lightbox.prompt + lightbox.seed}
              className="aspect-square w-full"
              label={lightbox.prompt}
            />
            <p className="text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
              {lightbox.prompt}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">{lightbox.model}</Badge>
              <Badge>{lightbox.style}</Badge>
              <Badge>{lightbox.aspect}</Badge>
              <Badge>seed {lightbox.seed}</Badge>
              <Badge>{lightbox.steps} steps</Badge>
              <Badge>CFG {lightbox.cfg.toFixed(1)}</Badge>
            </div>
          </div>
        )}
      </Modal>

      {/* ---------------- Prompt copy modal ---------------- */}
      <Modal
        open={!!promptModal}
        onClose={() => setPromptModal(null)}
        title="Prompt template"
        size="md"
        footer={
          <>
            <button onClick={() => setPromptModal(null)} className="btn btn-ghost btn-sm">
              Close
            </button>
            <button
              onClick={async () => {
                const t = seedPromptTemplates.find((x) => x.id === promptModal);
                if (!t) return;
                const ok = await copyToClipboard(`${t.prompt}\n\nNegative: ${t.negative}`);
                toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
              }}
              className="btn btn-primary btn-sm"
            >
              <Copy className="size-3.5" />
              Copy both
            </button>
          </>
        }
      >
        {(() => {
          const t = seedPromptTemplates.find((x) => x.id === promptModal);
          if (!t) return null;
          return (
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  Positive
                </div>
                <p className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3 font-mono text-[12px] leading-relaxed">
                  {t.prompt}
                </p>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  Negative
                </div>
                <p className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3 font-mono text-[12px] leading-relaxed text-rose-400/80">
                  {t.negative}
                </p>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
