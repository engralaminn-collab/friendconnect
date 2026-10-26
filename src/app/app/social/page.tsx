"use client";

import * as React from "react";
import {
  CalendarDays,
  Copy,
  Facebook,
  Hash,
  Instagram,
  Linkedin,
  Plus,
  Send,
  Trash2,
  Twitter,
  Youtube,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, formatDate, relativeTime } from "@/lib/utils";
import type { SocialPost } from "@/lib/types";

const platformMeta: Record<
  SocialPost["platform"],
  { icon: React.ElementType; color: string; max: number; label: string }
> = {
  LinkedIn: { icon: Linkedin, color: "#0a66c2", max: 3000, label: "LinkedIn" },
  X: { icon: Twitter, color: "#111827", max: 280, label: "X" },
  Instagram: { icon: Instagram, color: "#e1306c", max: 2200, label: "Instagram" },
  Facebook: { icon: Facebook, color: "#1877f2", max: 63206, label: "Facebook" },
  TikTok: { icon: Hash, color: "#111827", max: 2200, label: "TikTok" },
  YouTube: { icon: Youtube, color: "#ff0000", max: 5000, label: "YouTube" },
};

const mediaOptions = ["none", "carousel", "video", "image", "thread"] as const;

export default function SocialPage() {
  const posts = useStore((s) => s.socialPosts);
  const addPost = useStore((s) => s.addSocialPost);
  const updatePost = useStore((s) => s.updateSocialPost);
  const removePost = useStore((s) => s.removeSocialPost);
  const toast = useToast();

  const [filter, setFilter] = React.useState<SocialPost["platform"] | "all">("all");
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState({
    platform: "LinkedIn" as SocialPost["platform"],
    caption: "",
    hashtags: "",
    scheduledFor: new Date(Date.now() + 3_600_000).toISOString().slice(0, 16),
    media: "carousel" as SocialPost["media"],
  });

  const filtered = React.useMemo(
    () => (filter === "all" ? posts : posts.filter((p) => p.platform === filter)),
    [posts, filter],
  );

  const platformData = (Object.keys(platformMeta) as SocialPost["platform"][]).map((p) => ({
    label: platformMeta[p].label,
    value: posts.filter((x) => x.platform === p).length,
    color: platformMeta[p].color,
  }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.caption.trim()) {
      toast.warning("Empty caption", "Write something first.");
      return;
    }
    addPost({
      platform: form.platform,
      caption: form.caption,
      hashtags: form.hashtags
        .split(",")
        .map((h) => h.trim().replace(/^#/, ""))
        .filter(Boolean),
      scheduledFor: new Date(form.scheduledFor).toISOString(),
      status: "scheduled",
      media: form.media,
    });
    setModal(false);
    setForm({
      platform: "LinkedIn",
      caption: "",
      hashtags: "",
      scheduledFor: new Date(Date.now() + 3_600_000).toISOString().slice(0, 16),
      media: "carousel",
    });
    toast.success("Post scheduled", "It is in the queue.");
  };

  const hashtagString = (p: SocialPost) =>
    p.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="AI marketing"
        title="Social planner"
        description="One queue across six networks, with platform-aware character limits, media formats and hashtag handling."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            Schedule post
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Queued"
          value={posts.filter((p) => p.status === "scheduled").length}
          deltaLabel="scheduled to publish"
          icon={<CalendarDays className="size-4" />}
        />
        <StatCard
          label="Drafts"
          value={posts.filter((p) => p.status === "draft").length}
          deltaLabel="not yet scheduled"
          icon={<Hash className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Published"
          value={posts.filter((p) => p.status === "published").length}
          deltaLabel="live in the feed"
          icon={<Send className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Total engagement"
          value={posts.reduce((a, p) => a + p.engagement, 0).toLocaleString()}
          deltaLabel="likes, comments and shares"
          icon={<Twitter className="size-4" />}
          tone="accent"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              All platforms
            </FilterChip>
            {(Object.keys(platformMeta) as SocialPost["platform"][]).map((p) => (
              <FilterChip
                key={p}
                active={filter === p}
                onClick={() => setFilter(filter === p ? "all" : p)}
                count={posts.filter((x) => x.platform === p).length}
              >
                {platformMeta[p].label}
              </FilterChip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Hash className="size-6" />}
              title="Nothing queued"
              description="Schedule a post to get started."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered
                .slice()
                .sort(
                  (a, b) =>
                    +new Date(a.scheduledFor) - +new Date(b.scheduledFor),
                )
                .map((p) => {
                  const meta = platformMeta[p.platform];
                  const Icon = meta.icon;
                  const over = p.caption.length > meta.max;
                  return (
                    <article key={p.id} className="fc-card flex flex-col p-4">
                      <div className="flex items-start gap-3">
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold">{meta.label}</span>
                            <Badge
                              tone={
                                p.status === "published"
                                  ? "success"
                                  : p.status === "scheduled"
                                  ? "brand"
                                  : "neutral"
                              }
                              dot
                            >
                              {p.status}
                            </Badge>
                            <Badge>{p.media}</Badge>
                          </div>
                          <div className="mt-0.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
                            {p.status === "published"
                              ? `Published ${relativeTime(p.scheduledFor)}`
                              : `${formatDate(p.scheduledFor)} at ${new Date(p.scheduledFor).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                          </div>
                        </div>
                        <button
                          onClick={() => removePost(p.id)}
                          className="btn btn-ghost btn-icon size-8 text-rose-500"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                        {p.caption}
                      </p>

                      {p.hashtags.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {p.hashtags.map((h) => (
                            <span key={h} className="chip">
                              #{h.replace(/^#/, "")}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between border-t border-[var(--fc-line)] pt-3 text-[11.5px]">
                        <span
                          className={cn(
                            over ? "font-semibold text-rose-500" : "text-[var(--fc-fg-subtle)]",
                          )}
                        >
                          {p.caption.length} / {meta.max}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={async () => {
                              const ok = await copyToClipboard(
                                `${p.caption}\n\n${hashtagString(p)}`,
                              );
                              toast[ok ? "success" : "error"](
                                ok ? "Copied" : "Copy failed",
                              );
                            }}
                            className="btn btn-ghost btn-sm"
                          >
                            <Copy className="size-3.5" />
                            Copy
                          </button>
                          {p.status !== "published" && (
                            <button
                              onClick={() => {
                                updatePost(p.id, { status: "published" });
                                toast.success("Published", "Marked live.");
                              }}
                              className="btn btn-secondary btn-sm"
                            >
                              Publish now
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Platform mix</h2>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Posts"
                centerValue={String(posts.length)}
                data={platformData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Hook library</h2>
            <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
              Patterns that held attention past second three
            </p>
            <ul className="mt-3 space-y-2">
              {[
                "The contradiction",
                "The concrete number",
                "The artefact",
                "The named cost",
                "The live failure",
                "The second person",
              ].map((h, i) => (
                <li
                  key={h}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <div className="text-[12px] font-semibold">
                    {i + 1}. {h}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--fc-fg-subtle)]">
              The rule that holds across all six: the first frame must contain
              motion or contrast.
            </p>
          </div>
        </aside>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Schedule a post"
        description="Pick the platform first — the character limit and media options change with it."
        size="lg"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Schedule
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(platformMeta) as SocialPost["platform"][]).map((p) => {
              const Icon = platformMeta[p].icon;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, platform: p })}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition-colors",
                    form.platform === p
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]"
                      : "border-[var(--fc-line)] text-[var(--fc-fg-muted)] hover:text-[var(--fc-fg)]",
                  )}
                >
                  <Icon className="size-3.5" />
                  {platformMeta[p].label}
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">
              Caption{" "}
              <span className="font-normal text-[var(--fc-fg-subtle)]">
                ({form.caption.length} / {platformMeta[form.platform].max})
              </span>
            </span>
            <textarea
              className="field min-h-[130px] resize-y"
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="Hook first. Then the point. Then the proof."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Hashtags</span>
              <input
                className="field"
                value={form.hashtags}
                onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
                placeholder="growth, attribution"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Media</span>
              <select
                className="field"
                value={form.media}
                onChange={(e) =>
                  setForm({ ...form, media: e.target.value as SocialPost["media"] })
                }
              >
                {mediaOptions.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Publish at</span>
            <input
              className="field"
              type="datetime-local"
              value={form.scheduledFor}
              onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
