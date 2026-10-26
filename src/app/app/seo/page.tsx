"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Globe2,
  Link2,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { AreaChart, DonutChart, RadarChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import type { SeoAudit } from "@/lib/types";

export default function SeoPage() {
  const audits = useStore((s) => s.seoAudits);
  const addSeoAudit = useStore((s) => s.addSeoAudit);
  const toast = useToast();

  const [selectedId, setSelectedId] = React.useState<string | null>(audits[0]?.id ?? null);
  const [modal, setModal] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [form, setForm] = React.useState({
    url: "",
    title: "",
    description: "",
    keywords: "",
  });

  const selected = audits.find((a) => a.id === selectedId) ?? audits[0] ?? null;

  const avgScore = audits.length
    ? Math.round(audits.reduce((a, x) => a + x.score, 0) / audits.length)
    : 0;
  const totalFailed = audits.reduce(
    (a, x) => a + x.checks.filter((c) => !c.pass).length,
    0,
  );

  const scoreHistory = audits
    .slice()
    .reverse()
    .map((a) => ({ label: a.url.split("/").pop()?.slice(0, 8) ?? "page", value: a.score }));

  const checkBreakdown = React.useMemo(() => {
    const map = new Map<string, { pass: number; fail: number }>();
    audits.forEach((a) =>
      a.checks.forEach((c) => {
        const entry = map.get(c.label) ?? { pass: 0, fail: 0 };
        if (c.pass) entry.pass += 1;
        else entry.fail += 1;
        map.set(c.label, entry);
      }),
    );
    return Array.from(map.entries()).map(([label, v]) => ({ label, ...v }));
  }, [audits]);

  const runAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url.trim()) {
      toast.warning("Missing URL", "What are we checking?");
      return;
    }
    setScanning(true);
    setTimeout(() => {
      const title = form.title || "FriendConnect page";
      const description = form.description;
      const keywords = form.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const titleLen = title.length;
      const descLen = description.length;
      const checks = [
        {
          label: "Title length (50–60 chars)",
          pass: titleLen >= 45 && titleLen <= 65,
          detail: `${titleLen} characters`,
        },
        {
          label: "Meta description length",
          pass: descLen >= 110 && descLen <= 165,
          detail: descLen ? `${descLen} characters` : "No meta description found",
        },
        {
          label: "Keyword in H1",
          pass: keywords.length === 0 || keywords.some((k) => title.toLowerCase().includes(k.toLowerCase())),
          detail: keywords.length ? (keywords.some((k) => title.toLowerCase().includes(k.toLowerCase())) ? "Found" : "Not found in title") : "No keyword set",
        },
        {
          label: "Internal links",
          pass: false,
          detail: "2 internal links — aim for 5+",
        },
        {
          label: "Image alt coverage",
          pass: false,
          detail: "3 of 6 images missing alt text",
        },
        {
          label: "Reading level",
          pass: true,
          detail: "Grade 10 — comfortable for most audiences",
        },
        {
          label: "Structured data",
          pass: false,
          detail: "No Article or FAQ schema detected",
        },
        {
          label: "Canonical URL",
          pass: true,
          detail: "Self-referencing canonical present",
        },
      ];
      const score = Math.round(
        (checks.filter((c) => c.pass).length / checks.length) * 100,
      );
      const audit: Omit<SeoAudit, "id" | "scannedAt"> = {
        url: form.url,
        title,
        description,
        score,
        keywords,
        checks,
      };
      addSeoAudit(audit);
      setScanning(false);
      setModal(false);
      toast.success("Audit complete", `Scored ${score}/100 for ${form.url}`);
      setForm({ url: "", title: "", description: "", keywords: "" });
    }, 1100);
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="AI marketing"
        title="SEO auditor"
        description="On-page and technical checks with specific remediation text. Score every page, then work the list in priority order."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            Audit a URL
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pages audited"
          value={audits.length}
          deltaLabel="in the audit log"
          icon={<Globe2 className="size-4" />}
        />
        <StatCard
          label="Average score"
          value={avgScore}
          deltaLabel="out of 100"
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
        >
          <div className="mt-3">
            <Progress value={avgScore} tone={avgScore >= 80 ? "success" : "signal"} />
          </div>
        </StatCard>
        <StatCard
          label="Failing checks"
          value={totalFailed}
          deltaLabel="across all pages"
          icon={<XCircle className="size-4" />}
          tone="signal"
        />
        <StatCard
          label="Top issue"
          value="Meta description"
          deltaLabel="missing on 2 of 3 pages"
          icon={<AlertTriangle className="size-4" />}
          tone="signal"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[280px_1fr_300px]">
        <div className="fc-card flex flex-col overflow-hidden">
          <div className="border-b border-[var(--fc-line)] p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input className="field pl-8" placeholder="Search audited pages…" />
            </div>
          </div>
          <ul className="fc-scroll-thin max-h-[520px] overflow-y-auto">
            {audits.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "w-full border-b border-[var(--fc-line)] px-3.5 py-3 text-left transition-colors",
                    selectedId === a.id
                      ? "bg-[var(--color-brand-500)]/[0.09]"
                      : "hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] font-semibold">
                      {a.url.split("/").pop() || a.url}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-display text-[15px] font-bold tabular-nums",
                        a.score >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : a.score >= 55
                          ? "text-[var(--color-signal-600)] dark:text-signal-300"
                          : "text-rose-500",
                      )}
                    >
                      {a.score}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--fc-fg-subtle)]">
                    {relativeTime(a.scannedAt)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {!selected ? (
            <EmptyState
              icon={<Globe2 className="size-6" />}
              title="Nothing audited yet"
              description="Run an audit on a page to see the full checklist."
            />
          ) : (
            <>
              <div className="fc-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11.5px] text-[var(--fc-fg-subtle)]">
                      <Link2 className="size-3.5" />
                      {selected.url}
                    </div>
                    <h2 className="mt-1.5 text-[17px] font-semibold">{selected.title}</h2>
                    <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {selected.description || "No meta description set for this page."}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {selected.keywords.map((k) => (
                        <span key={k} className="chip">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className={cn(
                        "font-display text-4xl font-bold tabular-nums",
                        selected.score >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : selected.score >= 55
                          ? "text-[var(--color-signal-600)] dark:text-signal-300"
                          : "text-rose-500",
                      )}
                    >
                      {selected.score}
                    </div>
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
                      Score
                    </div>
                  </div>
                </div>
                <Progress
                  value={selected.score}
                  className="mt-4"
                  tone={selected.score >= 80 ? "success" : selected.score >= 55 ? "signal" : "danger"}
                />
              </div>

              <div className="fc-card p-5">
                <h3 className="text-[15px] font-semibold">Checks</h3>
                <ul className="mt-4 space-y-2">
                  {selected.checks.map((c) => (
                    <li
                      key={c.label}
                      className="flex items-start gap-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                          c.pass
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-500",
                        )}
                      >
                        {c.pass ? (
                          <Check className="size-3" strokeWidth={3.5} />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium">{c.label}</span>
                        <span className="block text-[11.5px] text-[var(--fc-fg-muted)]">
                          {c.detail}
                        </span>
                      </span>
                      <Badge tone={c.pass ? "success" : "danger"}>
                        {c.pass ? "pass" : "fix"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Check performance</h2>
            <p className="text-[12px] text-[var(--fc-fg-muted)]">
              Pass rate across every audited page
            </p>
            <div className="mt-4">
              <RadarChart
                size={210}
                axes={["Title", "Meta", "H1", "Links", "Alt", "Schema", "Canonical"]}
                series={[
                  {
                    name: "Pass rate",
                    data: checkBreakdown.map((c) =>
                      Math.round((c.pass / Math.max(1, c.pass + c.fail)) * 100),
                    ),
                    color: "#3b64f6",
                  },
                ]}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Score history</h2>
            <div className="mt-4">
              <AreaChart
                height={160}
                labels={scoreHistory.map((s) => s.label)}
                series={[{ name: "Score", data: scoreHistory.map((s) => s.value), color: "var(--color-accent-500)" }]}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Failing by check</h2>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Failures"
                centerValue={String(totalFailed)}
                data={checkBreakdown
                  .filter((c) => c.fail > 0)
                  .map((c) => ({ label: c.label, value: c.fail }))}
              />
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Audit a URL"
        description="We fetch the page and run the eight checks against it."
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={runAudit} disabled={scanning} className="btn btn-primary btn-sm">
              {scanning ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              {scanning ? "Auditing…" : "Run audit"}
            </button>
          </>
        }
      >
        <form onSubmit={runAudit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">URL *</span>
            <input
              className="field"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="friendconnect.app/consultancy"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">
              Title <span className="font-normal text-[var(--fc-fg-subtle)]">(optional — we can infer it)</span>
            </span>
            <input
              className="field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Meta description</span>
            <textarea
              className="field min-h-[70px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">
              Target keywords <span className="font-normal text-[var(--fc-fg-subtle)]">(comma separated)</span>
            </span>
            <input
              className="field"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="study abroad consultant, uk university"
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
