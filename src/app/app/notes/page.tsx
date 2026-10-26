"use client";

import * as React from "react";
import {
  ArrowUpDown,
  Copy,
  FileText,
  Pin,
  Plus,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, downloadFile, relativeTime, wordCount } from "@/lib/utils";
import type { Note } from "@/lib/types";

const NOTE_COLORS = ["#3b64f6", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

export default function NotesPage() {
  const notes = useStore((s) => s.notes);
  const saveNote = useStore((s) => s.saveNote);
  const removeNote = useStore((s) => s.removeNote);
  const togglePin = useStore((s) => s.toggleNotePin);
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(notes[0]?.id ?? null);
  const [draft, setDraft] = React.useState<Partial<Note>>({
    title: "",
    content: "",
    tags: [],
    color: NOTE_COLORS[0],
  });
  const [tagInput, setTagInput] = React.useState("");
  const [modal, setModal] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new")) setModal(true);
    const focus = params.get("focus");
    if (focus) {
      const n = notes.find((x) => x.id === focus);
      if (n) select(n);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = notes.find((n) => n.id === activeId) ?? null;

  const select = (n: Note) => {
    setActiveId(n.id);
    setDraft({
      title: n.title,
      content: n.content,
      tags: n.tags,
      color: n.color,
      pinned: n.pinned,
    });
    setTagInput(n.tags.join(", "));
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter(
        (n) =>
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [notes, query]);

  const save = () => {
    if (!draft.title?.trim()) {
      toast.warning("Missing title", "Give the note a title.");
      return;
    }
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const saved = saveNote({
      id: activeId ?? undefined,
      title: draft.title.trim(),
      content: draft.content ?? "",
      tags,
      pinned: draft.pinned ?? false,
      color: draft.color ?? NOTE_COLORS[0],
    });
    setActiveId(saved.id);
    toast.success("Note saved", saved.title);
  };

  const createNote = () => {
    const created = saveNote({
      title: newTitle.trim() || "Untitled note",
      content: "",
      tags: [],
      pinned: false,
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
    });
    setActiveId(created.id);
    setDraft({
      title: created.title,
      content: "",
      tags: [],
      color: created.color,
      pinned: false,
    });
    setTagInput("");
    setModal(false);
    setNewTitle("");
    toast.success("Note created", created.title);
  };

  const totalWords = notes.reduce((a, n) => a + wordCount(n.content), 0);
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Knowledge"
        title="Notes"
        description="Working memory with tags, pinning and a quick editor — the place a call note goes before it becomes a wiki page."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            New note
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Notes"
          value={notes.length}
          deltaLabel={`${notes.filter((n) => n.pinned).length} pinned`}
          icon={<StickyNote className="size-4" />}
        />
        <StatCard
          label="Words"
          value={totalWords.toLocaleString()}
          deltaLabel="across every note"
          icon={<FileText className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Tags"
          value={allTags.length}
          deltaLabel="distinct labels"
          icon={<ArrowUpDown className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Last edit"
          value={notes[0] ? relativeTime(notes[0].updatedAt) : "—"}
          deltaLabel="most recent change"
          icon={<Pin className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[300px_1fr]">
        <div className="fc-card flex flex-col overflow-hidden">
          <div className="border-b border-[var(--fc-line)] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-8"
                placeholder="Search notes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <ul className="fc-scroll-thin max-h-[560px] overflow-y-auto">
            {filtered.map((n) => (
              <li key={n.id} className="group relative">
                <button
                  onClick={() => select(n)}
                  className={cn(
                    "w-full border-b border-[var(--fc-line)] px-3.5 py-3 text-left transition-colors",
                    activeId === n.id
                      ? "bg-[var(--color-brand-500)]/[0.09]"
                      : "hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <span className="flex items-start gap-2">
                    <span
                      className="mt-1 size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: n.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold">{n.title}</span>
                        {n.pinned && (
                          <Pin className="size-3 shrink-0 text-[var(--color-signal-500)]" />
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11.5px] leading-snug text-[var(--fc-fg-muted)]">
                        {n.content || "Empty note"}
                      </span>
                      <span className="mt-1 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {relativeTime(n.updatedAt)}
                      </span>
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => togglePin(n.id)}
                  className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
                  title="Pin"
                >
                  <Pin
                    className={cn(
                      "size-3.5",
                      n.pinned
                        ? "text-[var(--color-signal-500)]"
                        : "text-[var(--fc-fg-subtle)]",
                    )}
                  />
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-10 text-center text-[13px] text-[var(--fc-fg-muted)]">
                No notes match.
              </li>
            )}
          </ul>
        </div>

        <div className="fc-card flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
            <input
              className="min-w-[180px] flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-[var(--fc-fg-subtle)]"
              placeholder="Note title"
              value={draft.title ?? ""}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <div className="flex items-center gap-1">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setDraft({ ...draft, color: c })}
                  className={cn(
                    "size-5 rounded-full border-2 transition-transform hover:scale-110",
                    draft.color === c ? "border-[var(--fc-fg)]" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Colour ${c}`}
                />
              ))}
            </div>
            <button
              onClick={() => setDraft({ ...draft, pinned: !draft.pinned })}
              className={cn(
                "btn btn-sm",
                draft.pinned ? "btn-secondary" : "btn-ghost",
              )}
            >
              <Pin className="size-3.5" />
            </button>
            <button
              onClick={async () => {
                const ok = await copyToClipboard(`${draft.title}\n\n${draft.content}`);
                toast[ok ? "success" : "error"](ok ? "Note copied" : "Copy failed");
              }}
              className="btn btn-ghost btn-icon size-8"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              onClick={() => {
                if (!activeId) return;
                removeNote(activeId);
                setActiveId(null);
                setDraft({ title: "", content: "", tags: [], color: NOTE_COLORS[0] });
                toast.info("Note deleted", active?.title);
              }}
              className="btn btn-ghost btn-icon size-8 text-rose-500"
            >
              <Trash2 className="size-3.5" />
            </button>
            <button onClick={save} className="btn btn-primary btn-sm">
              Save
            </button>
          </div>

          <textarea
            className="min-h-[420px] flex-1 resize-y bg-transparent p-5 font-mono text-[13.5px] leading-[1.8] outline-none"
            value={draft.content ?? ""}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            placeholder={
              "**00:04** — the moment that mattered\n\nFollow-up questions:\n1. …"
            }
          />

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
            <input
              className="field h-8 max-w-sm flex-1 py-0 text-[12px]"
              placeholder="Tags, comma separated"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
            />
            <span className="text-[11.5px] text-[var(--fc-fg-subtle)]">
              {wordCount(draft.content ?? "")} words
            </span>
            <button
              onClick={() => {
                downloadFile(
                  `${(draft.title ?? "note").toLowerCase().replace(/\s+/g, "-")}.md`,
                  `# ${draft.title}\n\n${draft.content ?? ""}\n`,
                );
                toast.success("Downloaded", "Markdown file");
              }}
              className="btn btn-ghost btn-sm"
            >
              Export .md
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New note"
        description="Name it now, write it later."
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={createNote} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Create
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
            placeholder="Northwind pricing call — key moments"
            onKeyDown={(e) => {
              if (e.key === "Enter") createNote();
            }}
          />
        </label>
      </Modal>
    </div>
  );
}
