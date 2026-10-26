"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CornerDownLeft,
  FileText,
  Plus,
  Search,
  User,
  Sparkles,
} from "lucide-react";
import { useUI } from "@/store/useUI";
import { useStore } from "@/store/useStore";
import { allNavItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ElementType;
  run: () => void;
}

export function CommandPalette() {
  const open = useUI((s) => s.commandOpen);
  const setOpen = useUI((s) => s.setCommandOpen);
  const pushToast = useUI((s) => s.pushToast);
  const router = useRouter();

  const contacts = useStore((s) => s.contacts);
  const articles = useStore((s) => s.articles);
  const notes = useStore((s) => s.notes);
  const students = useStore((s) => s.students);
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  const commands = React.useMemo<Command[]>(() => {
    const nav: Command[] = allNavItems.map((n) => ({
      id: `nav:${n.href}`,
      label: n.label,
      hint: n.description,
      group: "Navigate",
      icon: n.icon,
      run: () => router.push(n.href),
    }));

    const quick: Command[] = [
      {
        id: "act:new-contact",
        label: "Create a contact",
        hint: "Add a person to the CRM",
        group: "Actions",
        icon: User,
        run: () => router.push("/app/contacts?new=1"),
      },
      {
        id: "act:new-deal",
        label: "Create a deal",
        hint: "Open a new pipeline opportunity",
        group: "Actions",
        icon: Plus,
        run: () => router.push("/app/pipeline?new=1"),
      },
      {
        id: "act:new-article",
        label: "Draft an article",
        hint: "Open the content studio",
        group: "Actions",
        icon: FileText,
        run: () => router.push("/app/content?new=1"),
      },
      {
        id: "act:new-note",
        label: "Write a note",
        hint: "Capture something quickly",
        group: "Actions",
        icon: Sparkles,
        run: () => router.push("/app/notes?new=1"),
      },
    ];

    const people: Command[] = contacts.slice(0, 40).map((c) => ({
      id: `ct:${c.id}`,
      label: c.name,
      hint: `${c.title ?? "Contact"} · ${c.company ?? c.email}`,
      group: "Contacts",
      icon: User,
      run: () => router.push(`/app/contacts?focus=${c.id}`),
    }));

    const docs: Command[] = [
      ...articles.map((a) => ({
        id: `ar:${a.id}`,
        label: a.title,
        hint: a.excerpt.slice(0, 70),
        group: "Content",
        icon: FileText,
        run: () => router.push(`/app/content?focus=${a.id}`),
      })),
      ...notes.map((n) => ({
        id: `nt:${n.id}`,
        label: n.title,
        hint: n.tags.join(", ") || "Note",
        group: "Notes",
        icon: Sparkles,
        run: () => router.push(`/app/notes?focus=${n.id}`),
      })),
      ...students.map((s) => ({
        id: `st:${s.id}`,
        label: s.name,
        hint: `Student · ${s.country} · ${s.status}`,
        group: "Students",
        icon: User,
        run: () => router.push(`/app/students?focus=${s.id}`),
      })),
    ];

    return [...quick, ...nav, ...people, ...docs];
  }, [contacts, articles, notes, students, router]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 40);
    return commands
      .filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          (c.hint ?? "").toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [commands, query]);

  React.useEffect(() => setCursor(0), [query]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Command[]>();
    filtered.forEach((c) => {
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const flat = grouped.flatMap(([, items]) => items);

  const runCommand = (c: Command) => {
    setOpen(false);
    c.run();
  };

  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#07091a]/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--fc-line)] bg-[var(--fc-surface)] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--fc-line)] px-4">
              <Search className="size-4 shrink-0 text-[var(--fc-fg-subtle)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(flat.length - 1, c + 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(0, c - 1));
                  }
                  if (e.key === "Enter" && flat[cursor]) {
                    e.preventDefault();
                    runCommand(flat[cursor]);
                  }
                }}
                placeholder="Search pages, contacts, articles, notes…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--fc-fg-subtle)]"
              />
              <kbd className="hidden shrink-0 rounded border border-[var(--fc-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fc-fg-subtle)] sm:block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="fc-scroll-thin max-h-[52vh] overflow-y-auto py-2">
              {grouped.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-[var(--fc-fg-muted)]">
                  No matches for “{query}”.
                </div>
              )}
              {grouped.map(([group, items]) => (
                <div key={group} className="mb-1">
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
                    {group}
                  </div>
                  {items.map((c) => {
                    const idx = flat.indexOf(c);
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        data-idx={idx}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => runCommand(c)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                          idx === cursor
                            ? "bg-[var(--color-brand-500)]/[0.1]"
                            : "hover:bg-[var(--fc-surface-3)]",
                        )}
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)]">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium">{c.label}</span>
                          {c.hint && (
                            <span className="block truncate text-[11.5px] text-[var(--fc-fg-subtle)]">
                              {c.hint}
                            </span>
                          )}
                        </span>
                        {idx === cursor && (
                          <CornerDownLeft className="size-3.5 shrink-0 text-[var(--fc-fg-subtle)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5 text-[11px] text-[var(--fc-fg-subtle)]">
              <span className="flex items-center gap-1.5">
                <ArrowRight className="size-3" />
                {flat.length} results
              </span>
              <span className="flex items-center gap-3">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
