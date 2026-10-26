"use client";

import * as React from "react";
import {
  Heart,
  MessageCircle,
  Pin,
  Plus,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Badge, EmptyState } from "@/components/ui/primitives";
import { DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, relativeTime } from "@/lib/utils";
import type { Post } from "@/lib/types";

const topics = ["All", "Growth", "RevOps", "Education", "Engineering", "Community", "Opinion"];

export default function CommunityPage() {
  const posts = useStore((s) => s.posts);
  const addPost = useStore((s) => s.addPost);
  const toggleLike = useStore((s) => s.toggleLike);
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [topic, setTopic] = React.useState("All");
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState({
    body: "",
    topic: "Growth",
    tags: "",
  });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts
      .filter((p) => topic === "All" || p.topic === topic)
      .filter(
        (p) =>
          !q ||
          p.body.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [posts, query, topic]);

  const topicData = topics
    .filter((t) => t !== "All")
    .map((t) => ({ label: t, value: posts.filter((p) => p.topic === t).length }));

  const totalLikes = posts.reduce((a, p) => a + p.likes, 0);
  const totalComments = posts.reduce((a, p) => a + p.comments, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.body.trim()) {
      toast.warning("Empty post", "Say something first.");
      return;
    }
    addPost({
      author: "Maya Rahman",
      authorRole: "Head of Growth",
      avatarHue: 226,
      body: form.body.trim(),
      topic: form.topic,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setModal(false);
    setForm({ body: "", topic: "Growth", tags: "" });
    toast.success("Posted", "Your community can see it now.");
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Community"
        title="Community feed"
        description="The place the work gets discussed. Post a lesson, ask a question, or read what the team learned this week."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            New post
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Members"
          value={new Set(posts.map((p) => p.author)).size}
          deltaLabel="contributing this week"
          icon={<UsersRound className="size-4" />}
        />
        <StatCard
          label="Posts"
          value={posts.length}
          deltaLabel={`${posts.filter((p) => p.pinned).length} pinned`}
          icon={<Sparkles className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Reactions"
          value={totalLikes.toLocaleString()}
          deltaLabel="likes across the feed"
          icon={<Heart className="size-4" />}
          tone="signal"
        />
        <StatCard
          label="Discussion"
          value={totalComments}
          deltaLabel="comments threads open"
          icon={<MessageCircle className="size-4" />}
          tone="violet"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search posts, people or tags…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {topics.map((t) => (
              <FilterChip key={t} active={topic === t} onClick={() => setTopic(t)}>
                {t}
              </FilterChip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="size-6" />}
              title="Nothing here yet"
              description="Be the first to post in this topic."
              action={
                <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
                  <Plus className="size-3.5" />
                  New post
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => (
                <article key={p.id} className="fc-card p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={p.author} hue={p.avatarHue} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{p.author}</span>
                        <span className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                          {p.authorRole}
                        </span>
                        {p.pinned && (
                          <Badge tone="signal">
                            <Pin className="size-2.5" />
                            Pinned
                          </Badge>
                        )}
                        <Badge>{p.topic}</Badge>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--fc-fg-muted)]">
                        {p.body}
                      </p>

                      {p.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.tags.map((t) => (
                            <span key={t} className="chip">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--fc-line)] pt-3.5">
                        <button
                          onClick={() => toggleLike(p.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors",
                            p.liked
                              ? "text-rose-500"
                              : "text-[var(--fc-fg-muted)] hover:text-rose-500",
                          )}
                        >
                          <Heart
                            className={cn("size-4", p.liked && "fill-current")}
                          />
                          {p.likes}
                        </button>
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--fc-fg-muted)]">
                          <MessageCircle className="size-4" />
                          {p.comments}
                        </span>
                        <span className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                          {relativeTime(p.createdAt)}
                        </span>
                        <button
                          onClick={async () => {
                            const ok = await copyToClipboard(
                              `${p.author} — ${p.body}`,
                            );
                            toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                          }}
                          className="btn btn-ghost btn-icon ml-auto size-8"
                        >
                          <Share2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Topic mix</h2>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Posts"
                centerValue={String(posts.length)}
                data={topicData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <TrendingUp className="size-4 text-[var(--color-brand-500)]" />
              Top contributors
            </h2>
            <ul className="mt-3 space-y-2">
              {Array.from(new Set(posts.map((p) => p.author)))
                .map((author) => {
                  const mine = posts.filter((p) => p.author === author);
                  return {
                    author,
                    hue: mine[0].avatarHue,
                    role: mine[0].authorRole,
                    likes: mine.reduce((a, p) => a + p.likes, 0),
                  };
                })
                .sort((a, b) => b.likes - a.likes)
                .slice(0, 5)
                .map((c) => (
                  <li
                    key={c.author}
                    className="flex items-center gap-2.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                  >
                    <Avatar name={c.author} hue={c.hue} size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold">
                        {c.author}
                      </span>
                      <span className="block truncate text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {c.role}
                      </span>
                    </span>
                    <span className="text-[11.5px] tabular-nums text-[var(--fc-fg-muted)]">
                      {c.likes} ♥
                    </span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Community guidelines</h2>
            <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              {[
                "Share what you measured, not what you assumed.",
                "Disagree with the argument, never the person.",
                "No links without a sentence explaining why they matter.",
                "Correct your own posts publicly when you were wrong.",
              ].map((r) => (
                <li key={r} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Share with the community"
        description="Lead with what you found, not with what you are about to say."
        size="md"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Post
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Post</span>
            <textarea
              className="field min-h-[150px] resize-y"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="What did you measure? What broke? What would you do differently?"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Topic</span>
              <select
                className="field"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              >
                {topics
                  .filter((t) => t !== "All")
                  .map((t) => (
                    <option key={t}>{t}</option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Tags</span>
              <input
                className="field"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="activation, churn"
              />
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
