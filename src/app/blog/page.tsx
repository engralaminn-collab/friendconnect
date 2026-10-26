import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Search } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/primitives";
import { seedArticles } from "@/lib/data/marketing";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Writing on attribution, revenue operations, agent design, education consultancy and video craft.",
};

const statusTone = {
  published: "success",
  review: "signal",
  draft: "neutral",
  idea: "neutral",
} as const;

export default function BlogPage() {
  const published = seedArticles.filter((a) => a.status === "published");
  const others = seedArticles.filter((a) => a.status !== "published");

  return (
    <div className="min-h-dvh bg-[var(--fc-surface-2)]">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[var(--fc-line)]">
        <div className="pointer-events-none absolute inset-0 fc-aurora opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="chip border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
              The FriendConnect journal
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Notes from the work
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[var(--fc-fg-muted)]">
              No thought leadership. Just the things we measured, the things that
              broke, and the ones we got wrong the first time.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <div>
            <h2 className="mb-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--fc-fg-subtle)]">
              Published
            </h2>
            <Stagger className="space-y-5">
              {published.map((a) => (
                <StaggerItem key={a.id}>
                  <Link
                    href={`/blog/${a.slug}`}
                    className="fc-card fc-card-hover group flex flex-col gap-4 p-6 sm:flex-row sm:items-start"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">{a.tone}</Badge>
                        <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--fc-fg-subtle)]">
                          <Clock className="size-3" />
                          {a.readTime} min read
                        </span>
                        <span className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                          {formatDate(a.publishedAt ?? a.createdAt)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-[19px] font-semibold leading-snug tracking-tight">
                        {a.title}
                      </h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-[var(--fc-fg-muted)]">
                        {a.excerpt}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {a.keywords.map((k) => (
                          <span key={k} className="chip">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-3 sm:w-28">
                      <div className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-center">
                        <div className="font-display text-lg font-bold leading-none">
                          {a.seoScore}
                        </div>
                        <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--fc-fg-subtle)]">
                          SEO
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold tabular-nums">
                          {a.views.toLocaleString()}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--fc-fg-subtle)]">
                          views
                        </div>
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>

            {others.length > 0 && (
              <>
                <h2 className="mb-6 mt-14 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--fc-fg-subtle)]">
                  In the pipeline
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {others.map((a) => (
                    <Reveal key={a.id}>
                      <div className="fc-card h-full p-5 opacity-80">
                        <Badge tone={statusTone[a.status]}>{a.status}</Badge>
                        <h3 className="mt-3 text-[15px] font-semibold leading-snug">
                          {a.title}
                        </h3>
                        <p className="mt-2 text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                          {a.excerpt}
                        </p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="space-y-5">
            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Search className="size-4 text-[var(--color-brand-500)]" />
                Search the journal
              </h3>
              <input
                className="field mt-3"
                placeholder="Search articles…"
                aria-label="Search articles"
              />
              <div className="mt-4 space-y-2">
                {["attribution", "agents", "education", "video", "crm"].map((t) => (
                  <button
                    key={t}
                    className="block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium capitalize text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-3)] hover:text-[var(--fc-fg)]"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="fc-card overflow-hidden">
              <div className="bg-[linear-gradient(135deg,var(--color-brand-600),var(--color-accent-500))] p-5 text-white">
                <h3 className="text-base font-bold">The Marketing Kit</h3>
                <p className="mt-1.5 text-[13px] text-white/80">
                  Swipe files, copy templates, launch checklists and the benchmark
                  dataset — free.
                </p>
                <Link href="/marketing-kit" className="btn mt-4 w-full bg-white text-[var(--color-brand-700)] hover:bg-white/90">
                  Get the kit
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
