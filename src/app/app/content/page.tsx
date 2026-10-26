"use client";

import * as React from "react";
import {
  Check,
  Copy,
  FileText,
  Globe2,
  Hash,
  Linkedin,
  Mail,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
  Twitter,
  Wand2,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { AreaChart, DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { humanize, humanizeScore, repurpose, seoScore } from "@/lib/humanizer";
import { cn, copyToClipboard, formatDate, readingTime, wordCount } from "@/lib/utils";
import type { Article } from "@/lib/types";

const statusTone = {
  published: "success",
  review: "signal",
  draft: "brand",
  idea: "neutral",
} as const;

export default function ContentPage() {
  const articles = useStore((s) => s.articles);
  const addArticle = useStore((s) => s.addArticle);
  const updateArticle = useStore((s) => s.updateArticle);
  const removeArticle = useStore((s) => s.removeArticle);
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<Article["status"] | "all">("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [meta, setMeta] = React.useState({
    title: "",
    excerpt: "",
    keywords: "",
    slug: "",
    tone: "analytical",
    status: "draft" as Article["status"],
  });
  const [humanizeResult, setHumanizeResult] = React.useState<ReturnType<typeof humanize> | null>(null);
  const [repurposeOpen, setRepurposeOpen] = React.useState(false);
  const [repurposed, setRepurposed] = React.useState<ReturnType<typeof repurpose> | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new")) {
      startNew();
    }
    const focus = params.get("focus");
    if (focus) {
      const a = articles.find((x) => x.id === focus);
      if (a) selectArticle(a);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [articles, query, statusFilter]);

  const selected = articles.find((a) => a.id === selectedId) ?? null;

  const seo = React.useMemo(
    () =>
      seoScore({
        title: meta.title || selected?.title || "",
        body: draft,
        excerpt: meta.excerpt,
        keywords: meta.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        slug: meta.slug,
      }),
    [draft, meta.title, meta.excerpt, meta.keywords, meta.slug, selected],
  );

  const score = humanizeScore(draft);

  function startNew() {
    setSelectedId(null);
    setDraft("");
    setMeta({
      title: "",
      excerpt: "",
      keywords: "",
      slug: "",
      tone: "analytical",
      status: "draft",
    });
    setHumanizeResult(null);
  }

  function selectArticle(a: Article) {
    setSelectedId(a.id);
    setDraft(a.body);
    setMeta({
      title: a.title,
      excerpt: a.excerpt,
      keywords: a.keywords.join(", "),
      slug: a.slug,
      tone: a.tone,
      status: a.status,
    });
    setHumanizeResult(null);
  }

  const save = () => {
    if (!meta.title.trim()) {
      toast.warning("Missing title", "Give the piece a headline.");
      return;
    }
    const keywords = meta.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const payload = {
      title: meta.title.trim(),
      slug:
        meta.slug ||
        meta.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-"),
      excerpt: meta.excerpt,
      body: draft,
      status: meta.status,
      keywords,
      seoScore: seo.score,
      tone: meta.tone,
    };
    if (selectedId) {
      updateArticle(selectedId, payload);
      toast.success("Saved", "Changes written to the library.");
    } else {
      const created = addArticle(payload);
      setSelectedId(created.id);
      toast.success("Article created", payload.title);
    }
  };

  const runHumanizer = () => {
    if (!draft.trim()) {
      toast.warning("Nothing to humanise", "Write or load a draft first.");
      return;
    }
    const result = humanize(draft);
    setHumanizeResult(result);
    if (result.text !== draft) {
      setDraft(result.text);
      toast.success(
        "Humanised",
        `Score improved from ${result.scoreBefore} to ${result.scoreAfter}.`,
      );
    } else {
      toast.info("Already clean", "No changes were needed.");
    }
  };

  const runRepurpose = () => {
    if (!draft.trim() && !selected) {
      toast.warning("Nothing to repurpose", "Load or write a piece first.");
      return;
    }
    const r = repurpose({
      title: meta.title || selected?.title || "Untitled",
      excerpt: meta.excerpt || selected?.excerpt || "",
      body: draft,
      keywords: meta.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    });
    setRepurposed(r);
    setRepurposeOpen(true);
  };

  const copyText = async (label: string, text: string) => {
    const ok = await copyToClipboard(text);
    toast[ok ? "success" : "error"](ok ? `${label} copied` : "Copy failed");
  };

  const published = articles.filter((a) => a.status === "published");
  const totalViews = published.reduce((a, x) => a + x.views, 0);
  const totalConversions = published.reduce((a, x) => a + x.conversions, 0);

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="AI marketing studio"
        title="Content studio"
        description="Draft, humanise, score and repurpose in one place. The humaniser strips the machine rhythm out of generated prose — six passes, all explainable."
        actions={
          <>
            <button onClick={runRepurpose} className="btn btn-secondary btn-sm">
              <Sparkles className="size-3.5" />
              Repurpose
            </button>
            <button onClick={startNew} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              New article
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Articles"
          value={articles.length}
          deltaLabel={`${published.length} published`}
          icon={<FileText className="size-4" />}
        />
        <StatCard
          label="Total views"
          value={totalViews.toLocaleString()}
          deltaLabel="across published pieces"
          icon={<Globe2 className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Conversions"
          value={totalConversions.toLocaleString()}
          deltaLabel={`${((totalConversions / Math.max(1, totalViews)) * 100).toFixed(1)}% of readers`}
          icon={<Check className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Human score"
          value={`${score}`}
          deltaLabel={score >= 80 ? "reads like a person" : "machine rhythm detected"}
          icon={<Wand2 className="size-4" />}
          tone="violet"
        >
          <div className="mt-3">
            <Progress value={score} tone={score >= 80 ? "success" : score >= 55 ? "signal" : "danger"} />
          </div>
        </StatCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[300px_1fr_300px]">
        {/* ---------- Library ---------- */}
        <div className="fc-card flex flex-col overflow-hidden">
          <div className="border-b border-[var(--fc-line)] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-8"
                placeholder="Search library…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(["all", "published", "review", "draft", "idea"] as const).map((s) => (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                  count={s === "all" ? articles.length : articles.filter((a) => a.status === s).length}
                >
                  {s === "all" ? "All" : s}
                </FilterChip>
              ))}
            </div>
          </div>
          <ul className="fc-scroll-thin max-h-[560px] flex-1 overflow-y-auto">
            {filtered.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => selectArticle(a)}
                  className={cn(
                    "w-full border-b border-[var(--fc-line)] px-3.5 py-3 text-left transition-colors",
                    selectedId === a.id
                      ? "bg-[var(--color-brand-500)]/[0.09]"
                      : "hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-snug">{a.title}</span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-[var(--fc-fg-subtle)]">
                        <Badge tone={statusTone[a.status]}>{a.status}</Badge>
                        <span>{a.readTime} min</span>
                        {a.views > 0 && <span>· {a.views.toLocaleString()} views</span>}
                      </span>
                    </span>
                    {selectedId === a.id && (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                    )}
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-[13px] text-[var(--fc-fg-muted)]">
                No articles match.
              </li>
            )}
          </ul>
        </div>

        {/* ---------- Editor ---------- */}
        <div className="fc-card flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
            <input
              className="min-w-[180px] flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-[var(--fc-fg-subtle)]"
              placeholder="Headline"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
            <select
              className="field h-8 w-auto py-0 text-[12px]"
              value={meta.status}
              onChange={(e) => setMeta({ ...meta, status: e.target.value as Article["status"] })}
            >
              <option value="idea">Idea</option>
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="published">Published</option>
            </select>
            <button onClick={runHumanizer} className="btn btn-secondary btn-sm">
              <Wand2 className="size-3.5" />
              Humanise
            </button>
            <button onClick={save} className="btn btn-primary btn-sm">
              <Save className="size-3.5" />
              Save
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-3 border-b border-[var(--fc-line)] p-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  Excerpt / meta description
                </span>
                <textarea
                  className="field min-h-[62px] resize-y text-[12.5px]"
                  value={meta.excerpt}
                  onChange={(e) => setMeta({ ...meta, excerpt: e.target.value })}
                  placeholder="One sentence that earns the click…"
                />
                <span className="mt-1 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                  {meta.excerpt.length} characters (target 110–160)
                </span>
              </label>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    Keywords
                  </span>
                  <input
                    className="field"
                    value={meta.keywords}
                    onChange={(e) => setMeta({ ...meta, keywords: e.target.value })}
                    placeholder="attribution, growth, analytics"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                      Tone
                    </span>
                    <select
                      className="field"
                      value={meta.tone}
                      onChange={(e) => setMeta({ ...meta, tone: e.target.value })}
                    >
                      {["analytical", "technical", "friendly", "punchy", "formal"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                      Slug
                    </span>
                    <input
                      className="field"
                      value={meta.slug}
                      onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
                      placeholder="auto-generated"
                    />
                  </label>
                </div>
              </div>
            </div>

            <textarea
              className="min-h-[420px] w-full resize-y bg-transparent p-5 font-mono text-[13.5px] leading-[1.75] outline-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={"# Write something worth reading\n\nStart with the thing everyone gets wrong…"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
            <span>{wordCount(draft)} words</span>
            <span>{readingTime(draft)} min read</span>
            <span>SEO {seo.score}/100</span>
            <span className="ml-auto">Human score {score}/100</span>
          </div>
        </div>

        {/* ---------- Inspector ---------- */}
        <div className="space-y-4">
          <div className="fc-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">SEO score</h2>
              <span
                className={cn(
                  "font-display text-2xl font-bold tabular-nums",
                  seo.score >= 80
                    ? "text-emerald-600 dark:text-emerald-400"
                    : seo.score >= 55
                    ? "text-[var(--color-signal-600)] dark:text-signal-300"
                    : "text-rose-500",
                )}
              >
                {seo.score}
              </span>
            </div>
            <Progress
              value={seo.score}
              className="mt-2"
              tone={seo.score >= 80 ? "success" : seo.score >= 55 ? "signal" : "danger"}
            />
            <ul className="mt-4 space-y-2">
              {seo.checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                      c.pass
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-500",
                    )}
                  >
                    {c.pass ? (
                      <Check className="size-2.5" strokeWidth={3.5} />
                    ) : (
                      <span className="size-1 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium">{c.label}</span>
                    <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {humanizeResult && (
            <div className="fc-card p-5">
              <h2 className="text-[15px] font-semibold">Humaniser report</h2>
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    Before
                  </div>
                  <div className="font-display text-xl font-bold">{humanizeResult.scoreBefore}</div>
                </div>
                <span className="text-[var(--fc-fg-subtle)]">→</span>
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    After
                  </div>
                  <div className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {humanizeResult.scoreAfter}
                  </div>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {humanizeResult.passes.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-1.5 text-[12px]"
                  >
                    <span>
                      <span className="block font-medium">{p.name}</span>
                      <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {p.description}
                      </span>
                    </span>
                    <Badge tone={p.count ? "brand" : "neutral"}>{p.count}</Badge>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setDraft(
                    humanizeResult.text ===
                      draft
                      ? draft
                      : draft,
                  );
                }}
                className="btn btn-secondary btn-sm mt-3 w-full"
                onClickCapture={() => {}}
              >
                <Copy className="size-3.5" />
                Copy clean version
              </button>
            </div>
          )}

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Content performance</h2>
            <div className="mt-4">
              <AreaChart
                height={150}
                labels={published.map((a) => a.title.slice(0, 6)).length ? ["A", "B", "C", "D"] : []}
                series={[
                  {
                    name: "Views",
                    data: published.length
                      ? [published[0].views, published[1]?.views ?? 0, published[2]?.views ?? 0, published[3]?.views ?? 0]
                      : [0, 0, 0, 0],
                    color: "var(--color-brand-500)",
                  },
                ]}
              />
            </div>
            <div className="mt-4">
              <DonutChart
                size={140}
                thickness={20}
                centerLabel="Status"
                centerValue={String(articles.length)}
                data={[
                  { label: "Published", value: articles.filter((a) => a.status === "published").length },
                  { label: "In review", value: articles.filter((a) => a.status === "review").length },
                  { label: "Draft", value: articles.filter((a) => a.status === "draft").length },
                  { label: "Ideas", value: articles.filter((a) => a.status === "idea").length },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Repurpose modal ---------- */}
      <Modal
        open={repurposeOpen}
        onClose={() => setRepurposeOpen(false)}
        title="Repurpose into every channel"
        description="One long-form piece, adapted to each platform's native format."
        size="xl"
        footer={
          <button onClick={() => setRepurposeOpen(false)} className="btn btn-secondary btn-sm">
            Close
          </button>
        }
      >
        {repurposed && (
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Hash,
                title: "Carousel slides",
                body: repurposed.carousel.join("\n"),
              },
              {
                icon: Twitter,
                title: "X thread",
                body: repurposed.thread.join("\n\n"),
              },
              {
                icon: Mail,
                title: "Email",
                body: `Subject: ${repurposed.email.subject}\n\n${repurposed.email.body}\n\n— ${repurposed.email.cta}`,
              },
              {
                icon: Linkedin,
                title: "LinkedIn post",
                body: repurposed.linkedin,
              },
              {
                icon: Send,
                title: "Short-form script",
                body: repurposed.video.scenes
                  .map((s) => `${s.index}. ${s.title}\n   ${s.narration}`)
                  .join("\n\n"),
              },
              {
                icon: Globe2,
                title: "Meta description",
                body: repurposed.email.preheader,
              },
            ].map((b) => (
              <div key={b.title} className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] font-semibold">
                    <b.icon className="size-4 text-[var(--color-brand-500)]" />
                    {b.title}
                  </span>
                  <button
                    onClick={() => copyText(b.title, b.body)}
                    className="btn btn-ghost btn-sm"
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </button>
                </div>
                <pre className="fc-scroll-thin max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {b.body}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
