"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  Menu,
  Moon,
  Search,
  Sun,
  Wifi,
} from "lucide-react";
import { useUI } from "@/store/useUI";
import { useStore } from "@/store/useStore";
import { findNavItem } from "@/lib/nav";
import { cn, relativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/primitives";

export function Topbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, setCommandOpen } = useUI();
  const notifications = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAll = useStore((s) => s.markAllNotificationsRead);
  const [bellOpen, setBellOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme, mounted]);

  const unread = notifications.filter((n) => !n.read).length;
  const item = findNavItem(pathname) ?? findNavItem(pathname.split("/").slice(0, 2).join("/"));

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface)]/85 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={() => {
          const evt = new CustomEvent("fc:open-nav");
          window.dispatchEvent(evt);
        }}
        className="btn btn-ghost btn-icon lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
          <span>Workspace</span>
          <span className="text-[var(--fc-line-strong)]">/</span>
          <span className="truncate text-[var(--color-brand-500)]">
            {item?.label ?? "Overview"}
          </span>
        </div>
        <h1 className="truncate font-display text-[15px] font-semibold leading-tight sm:text-[17px]">
          {item?.label ?? "FriendConnect"}
        </h1>
      </div>

      <button
        onClick={() => setCommandOpen(true)}
        className="hidden items-center gap-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-1.5 text-xs text-[var(--fc-fg-subtle)] transition-colors hover:border-[var(--color-brand-400)] md:flex"
      >
        <Search className="size-3.5" />
        <span className="pr-6">Search or jump to…</span>
        <kbd className="rounded border border-[var(--fc-line)] px-1 font-mono text-[10px]">⌘K</kbd>
      </button>

      <button
        onClick={() => setCommandOpen(true)}
        className="btn btn-ghost btn-icon md:hidden"
        aria-label="Open command palette"
      >
        <Search className="size-4.5" />
      </button>

      <div className="hidden items-center gap-1.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 md:flex">
        <Wifi className="size-3.5" />
        Live
      </div>

      <button
        onClick={toggleTheme}
        className="btn btn-ghost btn-icon relative"
        aria-label="Toggle colour theme"
        title="Toggle theme"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22 }}
            className="block"
          >
            {theme === "dark" ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
          </motion.span>
        </AnimatePresence>
      </button>

      <div className="relative">
        <button
          onClick={() => setBellOpen((v) => !v)}
          className="btn btn-ghost btn-icon relative"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="size-4.5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[var(--color-brand-500)] text-[9px] font-bold text-white ring-2 ring-[var(--fc-surface)]">
              {unread}
            </span>
          )}
        </button>

        <AnimatePresence>
          {bellOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setBellOpen(false)}
                aria-hidden
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-[var(--fc-line)] px-4 py-3">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button
                    onClick={markAll}
                    className="text-[11px] font-semibold text-[var(--color-brand-500)] hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <ul className="max-h-[340px] overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => markRead(n.id)}
                        className={cn(
                          "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--fc-surface-3)]",
                          !n.read && "bg-[var(--color-brand-500)]/[0.05]",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            n.read
                              ? "bg-[var(--fc-line-strong)]"
                              : "bg-[var(--color-brand-500)]",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">
                            {n.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--fc-fg-muted)]">
                            {n.body}
                          </span>
                          <span className="mt-1 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                            {relativeTime(n.at)}
                          </span>
                        </span>
                        {n.read && <Check className="mt-1 size-3.5 text-[var(--fc-fg-subtle)]" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <Link
        href="/app/settings"
        className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-[var(--fc-surface-3)]"
      >
        <Avatar name="Maya Rahman" hue={226} size={30} />
        <span className="hidden text-xs font-semibold sm:block">Maya</span>
      </Link>
    </header>
  );
}
