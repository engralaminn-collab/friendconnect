"use client";

import * as React from "react";
import {
  BookOpen,
  Link2,
  Pencil,
  Plus,
  Search,
  Share2,
  Sparkles,
  Tag,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, relativeTime, slugify } from "@/lib/utils";
import type { WikiPage } from "@/lib/types";

export default function WikiPage() {
  const pages = useStore((s) => s.wikiPages);
  const updatePage = useStore((s) => s.updateWikiPage);
  const addWikiPage = useStore((s) => s.addWikiPage);
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [activeId, setActiveId] = React.useState<string | null>(pages[0]?.id ?? null);
  const [editing, setEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState("");
  const [editSummary, setEditSummary] = React.useState("");
  const [newModal, setNewModal] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");

  const categories = Array.from(new Set(pages.map((p) => p.category)));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q)
      );
    });
  }, [pages, query, category]);

  const active = pages.find((p) => p.id === activeId) ?? pages[0] ?? null;

  const categoryData = categories.map((c) => ({
    label: c,
    value: pages.filter((p) => p.category === c).length,
  }));

  const openEditor = () => {
    if (!active) return;
    setEditBody(active.body);
    setEditSummary(active.summary);
    setEditing(true);
  };

  const saveEdits = () => {
    if (!active) return;
    updatePage(active.id, { body: editBody, summary: editSummary });
    setEditing(false);
    toast.success("Page updated", active.title);
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Knowledge"
        title="Wiki"
        description="Canonical team knowledge — the pages people link to, with categories and cross-references so the answer has one home."
        actions={
          <>
            <button onClick={openEditor} className="btn btn-secondary btn-sm">
              <Pencil className="size-3.5" />
              Edit page
            </button>
            <button onClick={() => setNewModal(true)} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              New page
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pages"
          value={pages.length}
          deltaLabel={`${categories.length} categories`}
          icon={<BookOpen className="size-4" />}
        />
        <StatCard
          label="Cross-links"
          value={pages.reduce((a, p) => a + p.links.length, 0)}
          deltaLabel="between pages"
          icon={<Link2 className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Words"
          value={pages.reduce((a, p) => a + p.body.split(/\s+/).length, 0).toLocaleString()}
          deltaLabel="of canonical documentation"
          icon={<Tag className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Last edited"
          value={active ? relativeTime(active.updatedAt) : "—"}
          deltaLabel={active?.title ?? "no page open"}
          icon={<Sparkles className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[280px_1fr_280px]">
        <div className="space-y-4">
          <div className="fc-card overflow-hidden">
            <div className="border-b border-[var(--fc-line)] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
                <input
                  className="field pl-8"
                  placeholder="Search the wiki…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <ul>
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setActiveId(p.id)}
                    className={cn(
                      "w-full border-b border-[var(--fc-line)] px-3.5 py-2.5 text-left transition-colors",
                      activeId === p.id
                        ? "bg-[var(--color-brand-500)]/[0.09]"
                        : "hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <span className="block truncate text-[12.5px] font-semibold">{p.title}</span>
                    <span className="block truncate text-[10.5px] text-[var(--fc-fg-subtle)]">
                      {p.category} · {relativeTime(p.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-10 text-center text-[13px] text-[var(--fc-fg-muted)]">
                  No pages match.
                </li>
              )}
            </ul>
          </div>

          <div className="fc-card p-4">
            <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
              Categories
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
                All
              </FilterChip>
              {categories.map((c) => (
                <FilterChip
                  key={c}
                  active={category === c}
                  onClick={() => setCategory(category === c ? "all" : c)}
                  count={pages.filter((p) => p.category === c).length}
                >
                  {c}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <div className="fc-card p-6">
          {!active ? (
            <EmptyState
              icon={<BookOpen className="size-6" />}
              title="No page selected"
              description="Pick a page from the list."
            />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge tone="brand">{active.category}</Badge>
                  <h2 className="mt-2 font-display text-[26px] font-bold tracking-tight">
                    {active.title}
                  </h2>
                  <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {active.summary}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const ok = await copyToClipboard(
                      `/${active.slug}\n\n${active.body}`,
                    );
                    toast[ok ? "success" : "error"](
                      ok ? "Page copied" : "Copy failed",
                    );
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Share2 className="size-3.5" />
                  Copy
                </button>
              </div>

              <div className="prose-fc mt-6 space-y-4">
                {active.body.split(/\n{2,}/).map((block, i) => {
                  if (block.startsWith("## ")) {
                    return (
                      <h3
                        key={i}
                        className="pt-2 text-[17px] font-semibold tracking-tight"
                      >
                        {block.slice(3)}
                      </h3>
                    );
                  }
                  if (block.startsWith("- ")) {
                    return (
                      <ul key={i} className="space-y-2">
                        {block.split("\n").map((l) => (
                          <li
                            key={l}
                            className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[var(--fc-fg-muted)]"
                          >
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                            {l.replace(/^-\s*/, "")}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  if (block.startsWith("[")) {
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4"
                      >
                        {block.split("\n").map((l, j) => (
                          <p
                            key={j}
                            className={cn(
                              "text-[14px] leading-relaxed",
                              j === 0
                                ? "font-semibold text-[var(--fc-fg)]"
                                : "mt-1.5 text-[var(--fc-fg-muted)]",
                            )}
                          >
                            {l}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <p
                      key={i}
                      className="text-[14.5px] leading-[1.75] text-[var(--fc-fg-muted)]"
                    >
                      {block}
                    </p>
                  );
                })}
              </div>

              {active.links.length > 0 && (
                <div className="mt-8 border-t border-[var(--fc-line)] pt-5">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                    Related pages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {active.links.map((slug) => {
                      const linked = pages.find((p) => p.slug === slug);
                      return (
                        <button
                          key={slug}
                          onClick={() => linked && setActiveId(linked.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-500)]"
                        >
                          <Link2 className="size-3.5" />
                          {linked?.title ?? slug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">Category mix</h3>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Pages"
                centerValue={String(pages.length)}
                data={categoryData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">Wiki rules</h3>
            <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              {[
                "One canonical page per concept. If two exist, merge them.",
                "Every page has an owner and a last-reviewed date.",
                "Notes become pages; pages never become notes.",
                "Link liberally — a page with no inbound links is invisible.",
                "If a statement is not true, mark it as disputed rather than deleting it.",
              ].map((r) => (
                <li key={r} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {active && (
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Page details</h3>
              <dl className="mt-3 space-y-2">
                {[
                  { l: "Slug", v: `/${active.slug}` },
                  { l: "Category", v: active.category },
                  { l: "Words", v: String(active.body.split(/\s+/).length) },
                  { l: "Links", v: String(active.links.length) },
                  { l: "Updated", v: relativeTime(active.updatedAt) },
                ].map((row) => (
                  <div
                    key={row.l}
                    className="flex items-center justify-between gap-3 text-[12.5px]"
                  >
                    <dt className="text-[var(--fc-fg-muted)]">{row.l}</dt>
                    <dd className="truncate font-semibold">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>
      </div>

      {/* ---------- Editor modal ---------- */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit page"
        description="Markdown supported. Keep it canonical — one page per concept."
        size="lg"
        footer={
          <>
            <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={saveEdits} className="btn btn-primary btn-sm">
              Save changes
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Summary</span>
            <input
              className="field"
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Body</span>
            <textarea
              className="field min-h-[320px] resize-y font-mono text-[13px] leading-relaxed"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
            />
          </label>
        </div>
      </Modal>

      {/* ---------- New page modal ---------- */}
      <Modal
        open={newModal}
        onClose={() => setNewModal(false)}
        title="New wiki page"
        description="Give it a title — the slug and structure follow."
        footer={
          <>
            <button onClick={() => setNewModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button
              onClick={() => {
                const title = newTitle.trim();
                if (!title) {
                  toast.warning("Missing title", "Name the page.");
                  return;
                }
                const created = addWikiPage({
                  title,
                  slug: slugify(title),
                  summary: "",
                  body: `## Definition\n\n\n## Our approach\n\n\n## Related\n`,
                  category: "General",
                  links: [],
                });
                setActiveId(created.id);
                setNewModal(false);
                setNewTitle("");
                toast.success("Page created", title);
              }}
              className="btn btn-primary btn-sm"
            >
              <Plus className="size-3.5" />
              Create page
            </button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold">Title</span>
          <input
            className="field"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Pricing strategy"
          />
        </label>
      </Modal>
    </div>
  );
}
