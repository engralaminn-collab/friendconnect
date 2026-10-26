"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronsLeft, LogOut, Sparkles, X } from "lucide-react";
import { navGroups } from "@/lib/nav";
import { useUI } from "@/store/useUI";
import { useStore } from "@/store/useStore";
import { useMessenger } from "@/store/useMessenger";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRealtimeConnected } from "@/lib/realtime/useRealtime";
import { Avatar } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const setCommandOpen = useUI((s) => s.setCommandOpen);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const unread = useMessenger((s) => s.threads.reduce((a, t) => a + t.unread, 0));
  const notifications = useStore((s) => s.notifications.filter((n) => !n.read).length);
  const leads = useStore((s) => s.leads.filter((l) => l.status === "new").length);
  const { user, logout } = useAuth();
  const realtimeConnected = useRealtimeConnected();

  const badgeFor = (href: string) => {
    if (href === "/app/inbox" && unread) return unread;
    if (href === "/app/leads" && leads) return leads;
    if (href === "/app/settings" && notifications) return notifications;
    return null;
  };

  React.useEffect(() => setMobileOpen(false), [pathname]);

  React.useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("fc:open-nav", handler);
    return () => window.removeEventListener("fc:open-nav", handler);
  }, []);

  const content = (
    <div
      className={cn(
        "flex h-full flex-col border-r border-[var(--fc-line)] bg-[var(--fc-surface)] transition-[width] duration-300",
        collapsed ? "w-[68px]" : "w-[264px]",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--fc-line)] px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-accent-400))] text-white shadow-[0_8px_20px_-10px_rgba(59,100,246,.9)]">
            <Sparkles className="size-4.5" strokeWidth={2.4} />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-display text-[15px] font-bold leading-tight tracking-tight">
                FriendConnect
              </span>
              <span className="block truncate text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
                Workspace
              </span>
            </span>
          )}
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="btn btn-ghost btn-icon ml-auto lg:hidden"
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="fc-scroll-thin flex-1 overflow-y-auto px-2.5 py-3">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-4">
            {!collapsed && (
              <div className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--fc-fg-subtle)]">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/app" && pathname.startsWith(`${item.href}/`));
                const badge = badgeFor(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] font-medium transition-colors",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-[var(--color-brand-500)]/[0.11] text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]"
                          : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-3)] hover:text-[var(--fc-fg)]",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-brand-500)]"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active
                            ? "text-[var(--color-brand-500)]"
                            : "text-[var(--fc-fg-subtle)] group-hover:text-[var(--fc-fg-muted)]",
                        )}
                      />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                      {badge != null && (
                        <span
                          className={cn(
                            "grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--color-brand-500)] px-1 text-[10px] font-bold text-white",
                            collapsed && "absolute right-1 top-1 size-[7px] min-w-0 p-0",
                          )}
                        >
                          {collapsed ? "" : badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[var(--fc-line)] p-2.5">
        {user && (
          <div
            className={cn(
              "mb-2 flex items-center gap-2.5 rounded-lg bg-[var(--fc-surface-2)] px-2.5 py-2",
              collapsed && "justify-center px-0",
            )}
            title={user.email ?? undefined}
          >
            <div className="relative">
              <Avatar name={user.displayName} hue={226} size={32} />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[var(--fc-surface-2)]",
                  realtimeConnected ? "bg-emerald-500" : "bg-slate-400",
                )}
                title={realtimeConnected ? "Realtime connected" : "Realtime offline"}
              />
            </div>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">
                    {user.displayName}
                  </span>
                  <span className="block truncate text-[10.5px] text-[var(--fc-fg-subtle)]">
                    {user.email ?? user.handle ?? ""}
                  </span>
                </span>
                <button
                  onClick={() => void logout()}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-[var(--fc-fg-subtle)] transition-colors hover:bg-[var(--fc-surface-3)] hover:text-rose-500"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="size-3.5" />
                </button>
              </>
            )}
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCommandOpen(true)}
            className="mb-2 flex w-full items-center gap-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-2 text-left text-xs text-[var(--fc-fg-subtle)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--fc-fg-muted)]"
          >
            <Sparkles className="size-3.5" />
            <span className="flex-1">Quick actions</span>
            <kbd className="rounded border border-[var(--fc-line)] px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--fc-fg-subtle)] transition-colors hover:bg-[var(--fc-surface-3)] hover:text-[var(--fc-fg)]",
            collapsed && "justify-center",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronsLeft
            className={cn("size-4 transition-transform", collapsed && "rotate-180")}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh shrink-0 lg:block">{content}</aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] lg:hidden"
          >
            <div
              className="absolute inset-0 bg-[#07091a]/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="relative z-10 h-full w-[264px]"
            >
              {content}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile trigger lives in the topbar; expose via custom event */}
      <button
        className="hidden"
        id="fc-open-nav"
        onClick={() => setMobileOpen(true)}
        aria-hidden
        tabIndex={-1}
      />
    </>
  );
}
