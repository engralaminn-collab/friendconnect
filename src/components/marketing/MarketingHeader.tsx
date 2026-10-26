"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Moon, Sun, X, Sparkles, ArrowRight } from "lucide-react";
import { useUI } from "@/store/useUI";
import { cn } from "@/lib/utils";

const links = [
  { href: "/features", label: "Features" },
  { href: "/templates", label: "Templates" },
  { href: "/showcase", label: "Showcase" },
  { href: "/marketing-kit", label: "Marketing Kit" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function MarketingHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const { theme, toggleTheme } = useUI();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-[var(--fc-line)] bg-[var(--fc-surface)]/85 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-accent-400))] text-white shadow-[0_8px_20px_-10px_rgba(59,100,246,.9)]">
            <Sparkles className="size-4.5" strokeWidth={2.4} />
          </span>
          <span className="font-display text-[16px] font-bold tracking-tight">
            FriendConnect
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-3)] hover:text-[var(--fc-fg)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon"
            aria-label="Toggle colour theme"
          >
            {theme === "dark" ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
          </button>
          <Link href="/app" className="btn btn-secondary btn-sm hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/app" className="btn btn-primary btn-sm">
            Launch app
            <ArrowRight className="size-3.5" />
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn btn-ghost btn-icon lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] px-4 py-3 lg:hidden">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-3)] hover:text-[var(--fc-fg)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
