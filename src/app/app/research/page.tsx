"use client";

import * as React from "react";
import {
  Braces,
  Clock,
  FileText,
  Globe,
  Languages,
  Play,
  Plus,
  ScanText,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, downloadFile, relativeTime } from "@/lib/utils";

interface ScrapeResult {
  id: string;
  url: string;
  title: string;
  status: "ok" | "partial" | "failed";
  code: number;
  ms: number;
  markdown: string;
  headings: string[];
  links: number;
  words: number;
  createdAt: string;
}

const SEED_RESULTS: ScrapeResult[] = [
  {
    id: "sc1",
    url: "https://www.gov.uk/student-visa",
    title: "Student visa — GOV.UK",
    status: "ok",
    code: 200,
    ms: 842,
    markdown:
      "You must apply online for a Student visa. You can apply up to 6 months before your course starts.\n\n## Who can apply\n\nYou can apply if you are from a country listed and you have been accepted by a licensed sponsor.\n\n## How long it takes\n\nYou can usually get a decision within 3 weeks. Outside the UK it can take up to 3 weeks.",
    headings: ["Who can apply", "How long it takes", "How much it costs"],
    links: 34,
    words: 1840,
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: "sc2",
    url: "https://www.bridgewayconsulting.co.uk/consulting-fees",
    title: "Consulting fees — Bridgeway Consultancy",
    status: "partial",
    code: 200,
    ms: 1310,
    markdown:
      "Our fees start at £900 and rise with the number of applications we manage.\n\n### £900 — Advisory\n\nOne consultation, a shortlist and a document checklist.\n\n### £1,800 — Full service\n\nEverything in Advisory plus application management for up to five universities.",
    headings: ["£900 — Advisory", "£1,800 — Full service", "£2,200 — Concierge"],
    links: 19,
    words: 620,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "sc3",
    url: "https://www.dailymail.co.uk/news/education",
    title: "Education news — Daily Mail",
    status: "failed",
    code: 403,
    ms: 320,
    markdown:
      "Blocked by the origin server. The site requires a JavaScript challenge before it serves content to non-browser clients.",
    headings: [],
    links: 0,
    words: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  },
];

const FORMATS = [
  { id: "markdown", label: "Markdown", icon: FileText },
  { id: "html", label: "Raw HTML", icon: Braces },
  { id: "text", label: "Plain text", icon: ScanText },
  { id: "links", label: "Links only", icon: Globe },
  { id: "screenshot", label: "Screenshot", icon: Sparkles },
];

export default function ResearchPage() {
  const toast = useToast();
  const [results, setResults] = React.useState<ScrapeResult[]>(SEED_RESULTS);
  const [url, setUrl] = React.useState("");
  const [format, setFormat] = React.useState("markdown");
  const [includeLinks, setIncludeLinks] = React.useState(true);
  const [onlyMain, setOnlyMain] = React.useState(true);
  const [waitFor, setWaitFor] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [activeId, setActiveId] = React.useState<string | null>(SEED_RESULTS[0].id);
  const [researchModal, setResearchModal] = React.useState(false);
  const [researchQuestion, setResearchQuestion] = React.useState("");
  const [researchSteps, setResearchSteps] = React.useState<
    { label: string; detail: string; status: "pending" | "running" | "done" }[]
  >([]);
  const [researchRunning, setResearchRunning] = React.useState(false);

  const active = results.find((r) => r.id === activeId) ?? null;

  const runScrape = () => {
    const target = url.trim();
    if (!target) {
      toast.warning("Missing URL", "Paste a page to crawl.");
      return;
    }
    setRunning(true);
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setRunning(false);
          const failed = /dailymail|linkedin|instagram/i.test(target);
          const created: ScrapeResult = {
            id: `sc_${Date.now()}`,
            url: target,
            title: failed
              ? "Blocked by the origin server"
              : target.replace(/^https?:\/\//, "").replace(/\/$/, ""),
            status: failed ? "failed" : "ok",
            code: failed ? 403 : 200,
            ms: 420 + Math.round(Math.random() * 1100),
            markdown: failed
              ? "Blocked by the origin server. The site requires a JavaScript challenge before it serves content to non-browser clients."
              : `# ${target}\n\n## Overview\n\nThis is a simulated extraction of the page. In a live deployment this section contains the rendered body copy, cleaned of navigation, adverts and cookie banners.\n\n## Key points\n\n- The first section is what the reader came for.\n- The second section is the evidence.\n- The third section is the action.\n\n## Checklist\n\n- Confirm the numbers against the source.\n- Date-stamp anything that moves.\n- Link to the original rather than summarising it twice.`,
            headings: ["Overview", "Key points", "Checklist"],
            links: 18,
            words: 0,
            createdAt: new Date().toISOString(),
          };
          setResults((r) => [created, ...r]);
          setActiveId(created.id);
          toast[failed ? "warning" : "success"](
            failed ? "Crawl blocked" : "Crawl complete",
            failed
              ? "403 — the origin refused a non-browser client."
              : `${created.ms}ms · ${created.words || 412} words extracted.`,
          );
          return 0;
        }
        return Math.min(100, p + 8 + Math.round(Math.random() * 12));
      });
    }, 120);
  };

  const runResearch = () => {
    if (!researchQuestion.trim()) {
      toast.warning("Missing question", "Ask something first.");
      return;
    }
    const plan = [
      { label: "Parse the question", detail: "Split into entities and constraints" },
      { label: "Search the open web", detail: "6 queries across 4 sources" },
      { label: "Extract candidate pages", detail: "12 results, 8 above the relevance floor" },
      { label: "Read and extract", detail: "8 pages · 21 facts with citations" },
      { label: "Cross-check", detail: "3 claims needed a second source" },
      { label: "Write the answer", detail: "Structured answer with a source list" },
    ];
    setResearchModal(true);
    setResearchRunning(true);
    setResearchSteps(plan.map((p) => ({ ...p, status: "pending" })));

    let i = 0;
    const tick = () => {
      if (i >= plan.length) {
        setResearchRunning(false);
        toast.success("Research complete", "8 sources · 21 cited facts.");
        return;
      }
      setResearchSteps((steps) =>
        steps.map((s, idx) => ({
          ...s,
          status:
            idx < i ? "done" : idx === i ? "running" : "pending",
        })),
      );
      i += 1;
      setTimeout(tick, 520);
    };
    setTimeout(tick, 480);
  };

  const okCount = results.filter((r) => r.status === "ok").length;
  const avgMs = Math.round(
    results.filter((r) => r.status === "ok").reduce((a, r) => a + r.ms, 0) /
      Math.max(1, okCount),
  );

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Research"
        title="Web research"
        description="Crawl a page, pull it clean, and hand it to an agent that reads eight pages and cites every fact it keeps."
        actions={
          <button onClick={runResearch} className="btn btn-primary btn-sm">
            <Sparkles className="size-3.5" />
            Deep research
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pages crawled"
          value={results.length}
          deltaLabel={`${okCount} extracted cleanly`}
          icon={<Globe className="size-4" />}
        />
        <StatCard
          label="Avg. latency"
          value={`${avgMs}ms`}
          deltaLabel="successful crawls only"
          icon={<Clock className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Format options"
          value={FORMATS.length}
          deltaLabel="markdown, html, text, links, shot"
          icon={<Braces className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Blocked"
          value={results.length - okCount}
          deltaLabel="origin refused the client"
          icon={<Languages className="size-4" />}
          tone="signal"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <ScanText className="size-4 text-[var(--color-brand-500)]" />
              Crawl a page
            </h2>
            <input
              className="field mt-3"
              placeholder="https://www.gov.uk/student-visa"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runScrape();
              }}
            />

            <div className="mt-3">
              <span className="mb-1.5 block text-[12px] font-semibold">Output format</span>
              <div className="flex flex-wrap gap-1.5">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                      format === f.id
                        ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.1] text-[var(--color-brand-500)]"
                        : "border-[var(--fc-line)] text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <f.icon className="size-3" />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {[
                {
                  k: "onlyMain" as const,
                  l: "Main content only",
                  d: "Strip navigation, footers and cookie banners",
                },
                {
                  k: "includeLinks" as const,
                  l: "Collect outbound links",
                  d: "Keep the link list for citation and auditing",
                },
                {
                  k: "waitFor" as const,
                  l: "Wait for client rendering",
                  d: "Slower, but catches content behind JavaScript",
                },
              ].map((o) => (
                <label
                  key={o.k}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={o.k === "onlyMain" ? onlyMain : o.k === "includeLinks" ? includeLinks : waitFor}
                    onChange={(e) => {
                      if (o.k === "onlyMain") setOnlyMain(e.target.checked);
                      else if (o.k === "includeLinks") setIncludeLinks(e.target.checked);
                      else setWaitFor(e.target.checked);
                    }}
                    className="mt-0.5 accent-[var(--color-brand-500)]"
                  />
                  <span>
                    <span className="block text-[12.5px] font-semibold">{o.l}</span>
                    <span className="block text-[11px] text-[var(--fc-fg-muted)]">{o.d}</span>
                  </span>
                </label>
              ))}
            </div>

            <button
              onClick={runScrape}
              disabled={running}
              className="btn btn-primary mt-4 w-full"
            >
              {running ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Crawling {progress}%
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Crawl
                </>
              )}
            </button>
            {running && (
              <div className="mt-3">
                <Progress value={progress} />
              </div>
            )}
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Extraction rules</h2>
            <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              {[
                "Keep the reading order — a page that reads well when extracted reads well when quoted.",
                "Never summarise at crawl time. Store the text, summarise later, with the source in front of you.",
                "A 403 is information. Record it rather than retrying with a different user agent.",
                "Respect robots.txt and rate limits. A fast blocked crawler is worse than a slow honest one.",
              ].map((r) => (
                <li key={r} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active onClick={() => {}}>
              All crawls ({results.length})
            </FilterChip>
            <FilterChip active={false} onClick={() => {}}>
              Successful ({okCount})
            </FilterChip>
            <FilterChip active={false} onClick={() => {}}>
              Blocked ({results.length - okCount})
            </FilterChip>
          </div>

          {results.map((r) => (
            <article
              key={r.id}
              className={cn(
                "fc-card p-5",
                activeId === r.id && "border-[var(--color-brand-500)]",
              )}
            >
              <button
                onClick={() => setActiveId(r.id)}
                className="w-full text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={r.status === "ok" ? "success" : r.status === "partial" ? "signal" : "danger"}
                    dot
                  >
                    {r.code}
                  </Badge>
                  <span className="truncate font-mono text-[12px] text-[var(--fc-fg-muted)]">
                    {r.url}
                  </span>
                  <span className="ml-auto text-[11px] text-[var(--fc-fg-subtle)]">
                    {relativeTime(r.createdAt)}
                  </span>
                </div>
                <h3 className="mt-2 text-[14.5px] font-semibold">{r.title}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11.5px] text-[var(--fc-fg-subtle)]">
                  <span className="tabular-nums">{r.ms}ms</span>
                  <span>{r.words || 412} words</span>
                  <span>{r.links} links</span>
                  <span>{r.headings.length} headings</span>
                </div>
              </button>

              {activeId === r.id && (
                <div className="mt-4 space-y-3 border-t border-[var(--fc-line)] pt-4">
                  {r.headings.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                        Headings
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {r.headings.map((h) => (
                          <span key={h} className="chip">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <pre className="fc-scroll-thin max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4 font-mono text-[11.5px] leading-[1.7] text-[var(--fc-fg-muted)]">
                    {r.markdown}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        const ok = await copyToClipboard(r.markdown);
                        toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Copy markdown
                    </button>
                    <button
                      onClick={() => {
                        downloadFile(
                          `${r.url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-")}.md`,
                          r.markdown,
                        );
                        toast.success("Downloaded", "Markdown file");
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Export .md
                    </button>
                    <button
                      onClick={() => {
                        setResearchQuestion(
                          `What does ${r.url} say that changes how we position the offer?`,
                        );
                        setResearchModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <Wand2 className="size-3.5" />
                      Ask the researcher
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}

          {results.length === 0 && (
            <EmptyState
              icon={<Globe className="size-6" />}
              title="Nothing crawled yet"
              description="Paste a URL on the left and crawl it."
            />
          )}
        </div>
      </div>

      {/* ---------------- Research modal ---------------- */}
      <Modal
        open={researchModal}
        onClose={() => setResearchModal(false)}
        title="Deep research"
        description="The agent plans the search, reads every candidate page, cross-checks the claims it wants to keep, and cites them."
        size="lg"
        footer={
          <>
            <button onClick={() => setResearchModal(false)} className="btn btn-ghost btn-sm">
              Close
            </button>
            <button
              onClick={runResearch}
              disabled={researchRunning}
              className="btn btn-primary btn-sm"
            >
              <Search className="size-3.5" />
              {researchRunning ? "Researching…" : "Run research"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Question</span>
            <textarea
              className="field min-h-[90px] resize-y"
              value={researchQuestion}
              onChange={(e) => setResearchQuestion(e.target.value)}
              placeholder="How do UK universities price international tuition in 2026, and which courses are cheapest?"
            />
          </label>

          {researchSteps.length > 0 && (
            <ol className="space-y-2">
              {researchSteps.map((s, i) => (
                <li
                  key={s.label}
                  className="flex items-center gap-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3.5 py-2.5"
                  style={{
                    animation: "rise .3s cubic-bezier(.16,1,.3,1) both",
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      s.status === "done"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : s.status === "running"
                        ? "bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)]"
                        : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)]",
                    )}
                  >
                    {s.status === "done" ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">{s.label}</span>
                    <span className="block text-[11.5px] text-[var(--fc-fg-muted)]">
                      {s.detail}
                    </span>
                  </span>
                  {s.status === "running" && (
                    <span className="size-3.5 animate-spin rounded-full border-2 border-[var(--color-brand-500)]/30 border-t-[var(--color-brand-500)]" />
                  )}
                </li>
              ))}
            </ol>
          )}

          {researchSteps.every((s) => s.status === "done") && (
            <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
              <h3 className="text-[13.5px] font-semibold">Answer</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                International tuition in the UK is priced per year per course, with
                laboratory and studio fees added on top for sciences and design. The
                cheapest routes are business and humanities; engineering and medicine
                carry the highest course fees. Every source that contributed to this
                answer is listed with its retrieval date, so any figure can be
                re-checked against the page it came from.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  "gov.uk — Student visa (today)",
                  "ukc.ac.uk — tuition fees (2 days ago)",
                  "theguardian.com — international students (3 days ago)",
                  "ucas.ac.uk — course search (5 days ago)",
                ].map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
