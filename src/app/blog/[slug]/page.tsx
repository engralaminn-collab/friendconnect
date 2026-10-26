import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, Share2 } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Badge } from "@/components/ui/primitives";
import { seedArticles } from "@/lib/data/marketing";
import { formatDate, readingTime } from "@/lib/utils";

export function generateStaticParams() {
  return seedArticles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = seedArticles.find((a) => a.slug === slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: { title: article.title, description: article.excerpt, type: "article" },
  };
}

function renderBody(body: string) {
  const blocks = body.split(/\n\n+/);
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) {
      return (
        <h2
          key={i}
          className="mt-10 text-[22px] font-semibold tracking-tight first:mt-0"
        >
          {block.slice(3)}
        </h2>
      );
    }
    if (block.startsWith("- ")) {
      const items = block.split("\n").map((l) => l.replace(/^-\s*/, ""));
      return (
        <ul key={i} className="my-5 space-y-2.5">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-3 text-[15.5px] leading-relaxed">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
              <span className="text-[var(--fc-fg-muted)]">{it}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (block.startsWith("> ")) {
      return (
        <blockquote
          key={i}
          className="my-6 border-l-2 border-[var(--color-brand-500)] bg-[var(--fc-surface-2)] py-3 pl-5 pr-4 text-[16px] italic leading-relaxed text-[var(--fc-fg)]"
        >
          {block.replace(/^>\s*/, "")}
        </blockquote>
      );
    }
    return (
      <p key={i} className="my-5 text-[16.5px] leading-[1.75] text-[var(--fc-fg-muted)]">
        {block}
      </p>
    );
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = seedArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  const related = seedArticles.filter((a) => a.id !== article.id).slice(0, 2);

  return (
    <div className="min-h-dvh bg-[var(--fc-surface-2)]">
      <MarketingHeader />

      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--fc-fg-muted)] transition-colors hover:text-[var(--color-brand-500)]"
        >
          <ArrowLeft className="size-4" />
          All articles
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone="brand">{article.tone}</Badge>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--fc-fg-subtle)]">
              <Clock className="size-3.5" />
              {readingTime(article.body)} min read
            </span>
            <span className="text-[12.5px] text-[var(--fc-fg-subtle)]">
              {formatDate(article.publishedAt ?? article.createdAt)}
            </span>
          </div>
          <h1 className="mt-5 text-[2.1rem] font-bold leading-[1.12] tracking-tight sm:text-[2.7rem]">
            {article.title}
          </h1>
          <p className="mt-5 text-[1.1rem] leading-relaxed text-[var(--fc-fg-muted)]">
            {article.excerpt}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-[var(--fc-line)] py-4">
            <div className="flex items-center gap-3">
              <span
                className="grid size-9 place-items-center rounded-full text-xs font-bold text-white"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--color-brand-500), var(--color-accent-400))",
                }}
              >
                MR
              </span>
              <div>
                <div className="text-[13.5px] font-semibold">Maya Rahman</div>
                <div className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                  Head of Growth, FriendConnect
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm ml-auto">
              <Share2 className="size-3.5" />
              Share
            </button>
          </div>
        </header>

        <div className="mt-10">{renderBody(article.body)}</div>

        <footer className="mt-12 border-t border-[var(--fc-line)] pt-8">
          <div className="flex flex-wrap gap-2">
            {article.keywords.map((k) => (
              <span key={k} className="chip">
                {k}
              </span>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-7">
            <h3 className="text-lg font-semibold">Put this into practice</h3>
            <p className="mt-2 text-[14.5px] text-[var(--fc-fg-muted)]">
              The full workspace — pipeline, content studio, agents and studios — is
              free to open with sample data already loaded.
            </p>
            <Link href="/app" className="btn btn-primary mt-5">
              Open the workspace
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </footer>
      </article>

      <section className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--fc-fg-subtle)]">
            Keep reading
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/blog/${r.slug}`}
                className="fc-card fc-card-hover p-6"
              >
                <Badge tone="brand">{r.tone}</Badge>
                <h3 className="mt-3 text-[16px] font-semibold leading-snug">{r.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {r.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-brand-500)]">
                  Read
                  <ArrowRight className="size-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
