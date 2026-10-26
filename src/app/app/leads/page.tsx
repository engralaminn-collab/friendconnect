"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  Download,
  Filter,
  Gauge,
  Radar,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { DataTableShell, PageHeader, StatCard, Td, Th, Toolbar, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, downloadFile, relativeTime } from "@/lib/utils";
import type { Lead } from "@/lib/types";

const statusMeta: Record<
  Lead["status"],
  { label: string; tone: "neutral" | "accent" | "brand" | "violet" | "success" | "danger" }
> = {
  new: { label: "New", tone: "neutral" },
  enriched: { label: "Enriched", tone: "accent" },
  qualified: { label: "Qualified", tone: "brand" },
  contacted: { label: "Contacted", tone: "violet" },
  converted: { label: "Converted", tone: "success" },
  lost: { label: "Lost", tone: "danger" },
};

const ICP_RULES = [
  { rule: "EMEA based", required: true, hit: 5 },
  { rule: "50–500 employees", required: true, hit: 4 },
  { rule: "B2B SaaS or e-commerce", required: true, hit: 5 },
  { rule: "Has a growth/ops function", required: false, hit: 3 },
  { rule: "Hiring a growth role", required: false, hit: 2 },
];

export default function LeadsPage() {
  const leads = useStore((s) => s.leads);
  const contacts = useStore((s) => s.contacts);
  const updateLead = useStore((s) => s.updateLead);
  const removeLead = useStore((s) => s.removeLead);
  const addContact = useStore((s) => s.addContact);
  const toast = useToast();

  const [statusFilter, setStatusFilter] = React.useState<Lead["status"] | "all">("all");
  const [query, setQuery] = React.useState("");
  const [enriching, setEnriching] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [detail, setDetail] = React.useState<Lead | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      );
    });
  }, [leads, query, statusFilter]);

  const runEnrichment = async () => {
    const targets = leads.filter((l) => l.status === "new");
    if (targets.length === 0) {
      toast.info("Nothing to enrich", "Every lead has already been processed.");
      return;
    }
    setEnriching(true);
    setProgress(0);
    for (let i = 0; i < targets.length; i++) {
      await new Promise((r) => setTimeout(r, 220));
      const lead = targets[i];
      const boosted = Math.min(100, lead.score + 6);
      updateLead(lead.id, {
        score: boosted,
        status: lead.status === "new" ? "enriched" : lead.status,
        signals:
          lead.status === "new"
            ? [
                ...lead.signals,
                `domain resolved (${lead.company.toLowerCase().replace(/\s+/g, "")}.com)`,
              ]
            : lead.signals,
      });
      setProgress(Math.round(((i + 1) / targets.length) * 100));
    }
    setEnriching(false);
    toast.success(
      "Enrichment complete",
      `${targets.length} leads enriched and rescored against your ICP.`,
    );
  };

  const promote = (lead: Lead) => {
    addContact({
      name: lead.name,
      email: lead.email,
      company: lead.company,
      title: lead.role,
      stage: lead.score >= 70 ? "qualified" : "lead",
      value: 0,
      source: lead.source,
      owner: "Maya Rahman",
      tags: ["enriched", lead.company.toLowerCase().split(" ")[0]],
      notes: `Promoted from lead enrichment (score ${lead.score}). Signals: ${lead.signals.join("; ")}`,
    });
    updateLead(lead.id, { status: "converted" });
    setDetail(null);
    toast.success("Promoted to contact", `${lead.name} is now in the CRM.`);
  };

  const exportJson = () => {
    downloadFile("friendconnect-leads.json", JSON.stringify(filtered, null, 2));
    toast.success("Export ready", `${filtered.length} leads exported.`);
  };

  const avgScore = leads.length
    ? Math.round(leads.reduce((a, l) => a + l.score, 0) / leads.length)
    : 0;
  const qualified = leads.filter((l) => l.status === "qualified" || l.status === "contacted").length;

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="GTM engine"
        title="Lead enrichment"
        description="Prospect against your ideal customer profile, enrich with firmographics, then score and promote straight into the CRM."
        actions={
          <>
            <button onClick={exportJson} className="btn btn-secondary btn-sm">
              <Download className="size-3.5" />
              Export
            </button>
            <button
              onClick={runEnrichment}
              disabled={enriching}
              className="btn btn-primary btn-sm"
            >
              {enriching ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {enriching ? `Enriching ${progress}%` : "Run enrichment"}
            </button>
          </>
        }
      />

      {enriching && (
        <div className="fc-card mb-4 p-4">
          <div className="flex items-center justify-between text-[12.5px] font-semibold">
            <span className="flex items-center gap-2">
              <Zap className="size-3.5 text-[var(--color-signal-500)]" />
              Enriching {leads.filter((l) => l.status === "new").length} leads against the ICP
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} tone="signal" className="mt-2.5" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Leads in flight"
          value={leads.length}
          deltaLabel={`${leads.filter((l) => l.status === "new").length} unprocessed`}
          icon={<Radar className="size-4" />}
        />
        <StatCard
          label="Average score"
          value={avgScore}
          deltaLabel="out of 100"
          icon={<Gauge className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Qualified"
          value={qualified}
          deltaLabel="score 70 or above"
          icon={<Target className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Converted"
          value={leads.filter((l) => l.status === "converted").length}
          deltaLabel="promoted to CRM"
          icon={<TrendingUp className="size-4" />}
          tone="accent"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div>
          <Toolbar>
            <div className="relative min-w-[200px] flex-1">
              <Radar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search leads…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All
            </FilterChip>
            {(Object.keys(statusMeta) as Lead["status"][]).map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                count={leads.filter((l) => l.status === s).length}
              >
                {statusMeta[s].label}
              </FilterChip>
            ))}
          </Toolbar>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Radar className="size-6" />}
              title="No leads here"
              description="Run an enrichment pass or change the filter."
            />
          ) : (
            <DataTableShell>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="bg-[var(--fc-surface-2)]">
                    <tr>
                      <Th>Lead</Th>
                      <Th>Company</Th>
                      <Th align="center">Score</Th>
                      <Th>Status</Th>
                      <Th>Source</Th>
                      <Th>Signals</Th>
                      <Th align="right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--fc-line)]">
                    {filtered.map((l) => (
                      <tr
                        key={l.id}
                        className="group cursor-pointer transition-colors hover:bg-[var(--fc-surface-2)]"
                        onClick={() => setDetail(l)}
                      >
                        <Td>
                          <span className="block font-medium">{l.name}</span>
                          <span className="block text-[11.5px] text-[var(--fc-fg-subtle)]">
                            {l.email}
                          </span>
                        </Td>
                        <Td>
                          <span className="block text-[13px]">{l.company}</span>
                          <span className="block text-[11.5px] text-[var(--fc-fg-subtle)]">
                            {l.role}
                          </span>
                        </Td>
                        <Td align="center">
                          <div className="mx-auto w-20">
                            <div
                              className={cn(
                                "text-[14px] font-bold tabular-nums",
                                l.score >= 80
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : l.score >= 60
                                  ? "text-[var(--color-signal-600)] dark:text-signal-300"
                                  : "text-[var(--fc-fg-muted)]",
                              )}
                            >
                              {l.score}
                            </div>
                            <Progress
                              value={l.score}
                              height={4}
                              tone={l.score >= 80 ? "success" : l.score >= 60 ? "signal" : "brand"}
                            />
                          </div>
                        </Td>
                        <Td>
                          <Badge tone={statusMeta[l.status].tone} dot>
                            {statusMeta[l.status].label}
                          </Badge>
                        </Td>
                        <Td>
                          <span className="text-[12.5px] text-[var(--fc-fg-muted)]">{l.source}</span>
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-1">
                            {l.signals.slice(0, 2).map((s) => (
                              <span key={s} className="chip max-w-[160px] truncate">
                                {s}
                              </span>
                            ))}
                            {l.signals.length > 2 && (
                              <span className="chip">+{l.signals.length - 2}</span>
                            )}
                          </div>
                        </Td>
                        <Td align="right">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                promote(l);
                              }}
                              className="btn btn-secondary btn-sm"
                            >
                              Promote
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeLead(l.id);
                                toast.info("Lead removed", l.name);
                              }}
                              className="btn btn-ghost btn-icon size-8 text-rose-500"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataTableShell>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Target className="size-4 text-[var(--color-brand-500)]" />
              ICP definition v3
            </h2>
            <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
              EMEA B2B SaaS and e-commerce, 50–500 staff
            </p>
            <ul className="mt-4 space-y-2.5">
              {ICP_RULES.map((r) => (
                <li key={r.rule} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                      r.required
                        ? "bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)]"
                        : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)]",
                    )}
                  >
                    <Check className="size-2.5" strokeWidth={3.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium">{r.rule}</span>
                    <span className="text-[11px] text-[var(--fc-fg-subtle)]">
                      {r.required ? "Required" : "Signal"} · matched {r.hit}/5 leads
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="fc-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Filter className="size-4 text-[var(--color-accent-500)]" />
              Enrichment sources
            </h2>
            <ul className="mt-3 space-y-2 text-[12.5px]">
              {[
                { n: "Company registry", s: "connected" },
                { n: "Web technographics", s: "connected" },
                { n: "Job boards", s: "connected" },
                { n: "Social profiles", s: "rate limited" },
              ].map((src) => (
                <li
                  key={src.n}
                  className="flex items-center justify-between rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <span className="text-[var(--fc-fg-muted)]">{src.n}</span>
                  <Badge tone={src.s === "connected" ? "success" : "signal"}>{src.s}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--fc-fg-subtle)]">
              Enrichment never overwrites a field you edited manually — it only
              fills gaps and appends signals.
            </p>
          </div>
        </aside>
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description={detail ? `${detail.role} · ${detail.company}` : ""}
        footer={
          <>
            <button onClick={() => setDetail(null)} className="btn btn-ghost btn-sm">
              Close
            </button>
            {detail && detail.status !== "converted" && (
              <button onClick={() => promote(detail)} className="btn btn-primary btn-sm">
                <Check className="size-3.5" />
                Promote to CRM
              </button>
            )}
          </>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                  ICP score
                </div>
                <div className="mt-1 font-display text-3xl font-bold">{detail.score}</div>
              </div>
              <Badge tone={statusMeta[detail.status].tone} dot>
                {statusMeta[detail.status].label}
              </Badge>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              {[
                { l: "Email", v: detail.email },
                { l: "Source", v: detail.source },
                { l: "Added", v: relativeTime(detail.createdAt) },
                { l: "Role", v: detail.role ?? "—" },
              ].map((row) => (
                <div
                  key={row.l}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                >
                  <dt className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    {row.l}
                  </dt>
                  <dd className="mt-1 truncate text-[13px] font-medium">{row.v}</dd>
                </div>
              ))}
            </dl>

            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Signals detected
              </h3>
              <ul className="space-y-2">
                {detail.signals.map((s) => (
                  <li
                    key={s}
                    className="flex items-start gap-2.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2.5 text-[12.5px] text-[var(--fc-fg-muted)]"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" strokeWidth={3} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Move to status
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(statusMeta) as Lead["status"][]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      updateLead(detail.id, { status: s });
                      setDetail({ ...detail, status: s });
                    }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      detail.status === s
                        ? "bg-[var(--color-brand-500)] text-white"
                        : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)] hover:text-[var(--fc-fg)]",
                    )}
                  >
                    {statusMeta[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
