"use client";

import Link from "next/link";
import { Sparkles, Github, Twitter, Linkedin, Youtube } from "lucide-react";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Templates", href: "/templates" },
      { label: "Showcase", href: "/showcase" },
      { label: "Marketing Kit", href: "/marketing-kit" },
      { label: "Pricing", href: "/pricing" },
      { label: "API directory", href: "/app/apis" },
      { label: "Plugins", href: "/app/plugins" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Revenue operations", href: "/features#crm" },
      { label: "Education consultancy", href: "/features#education" },
      { label: "AI marketing", href: "/features#marketing" },
      { label: "Creative studios", href: "/features#studios" },
      { label: "Community platforms", href: "/features#community" },
      { label: "Knowledge systems", href: "/features#knowledge" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "Changelog", href: "/blog" },
      { label: "Roadmap", href: "/features#roadmap" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Marketing Kit", href: "/marketing-kit" },
      { label: "Diagram templates", href: "/templates" },
      { label: "Benchmark report", href: "/blog" },
      { label: "Swipe files", href: "/marketing-kit#swipe" },
      { label: "Copy templates", href: "/marketing-kit#copy" },
      { label: "Community", href: "/app/community" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2.6fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-accent-400))] text-white">
                <Sparkles className="size-4.5" strokeWidth={2.4} />
              </span>
              <span className="font-display text-[16px] font-bold tracking-tight">
                FriendConnect
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--fc-fg-muted)]">
              One workspace for the people you sell to, the students you guide, the
              content you publish, the stories you draw and the agents that do the
              repetitive work.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {[Github, Twitter, Linkedin, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid size-9 place-items-center rounded-lg border border-[var(--fc-line)] text-[var(--fc-fg-muted)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-500)]"
                  aria-label="Social link"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--fc-fg)]">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[13px] text-[var(--fc-fg-muted)] transition-colors hover:text-[var(--color-brand-500)]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--fc-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--fc-fg-subtle)]">
            © {new Date().getFullYear()} FriendConnect. Built with care in London,
            Dhaka and Berlin.
          </p>
          <div className="flex flex-wrap items-center gap-5 text-xs text-[var(--fc-fg-subtle)]">
            <Link href="#" className="hover:text-[var(--fc-fg)]">Privacy</Link>
            <Link href="#" className="hover:text-[var(--fc-fg)]">Terms</Link>
            <Link href="#" className="hover:text-[var(--fc-fg)]">Security</Link>
            <Link href="#" className="hover:text-[var(--fc-fg)]">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
