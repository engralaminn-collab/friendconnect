"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  FileCheck2,
  ListChecks,
  Search,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Avatar, Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { FunnelChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { cn, daysUntil, formatDate, relativeTime } from "@/lib/utils";
import type { Application } from "@/lib/types";

const statusMeta: Record<
  Application["status"],
  { label: string; tone: "neutral" | "accent" | "brand" | "violet" | "success" | "danger" | "signal" }
> = {
  drafting: { label: "Drafting", tone: "neutral" },
  documents: { label: "Documents", tone: "signal" },
  submitted: { label: "Submitted", tone: "brand" },
  interview: { label: "Interview", tone: "violet" },
  offer: { label: "Offer", tone: "accent" },
  rejected: { label: "Rejected", tone: "danger" },
  accepted: { label: "Accepted", tone: "success" },
};

export default function ApplicationsPage() {
  const applications = useStore((s) => s.applications);
  const students = useStore((s) => s.students);
  const universities = useStore((s) => s.universities);
  const courses = useStore((s) => s.courses);
  const toggleChecklist = useStore((s) => s.toggleChecklist);
  const updateApplication = useStore((s) => s.updateApplication);

  const [statusFilter, setStatusFilter] = React.useState<Application["status"] | "all">("all");
  const [query, setQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      const student = students.find((s) => s.id === a.studentId);
      const uni = universities.find((u) => u.id === a.universityId);
      return (
        (student?.name ?? "").toLowerCase().includes(q) ||
        (uni?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [applications, students, universities, query, statusFilter]);

  const sorted = filtered
    .slice()
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));

  const atRisk = applications.filter((a) => {
    const d = daysUntil(a.dueDate);
    return d <= 14 && a.status !== "accepted" && a.status !== "rejected" && a.progress < 100;
  });

  const avgProgress = applications.length
    ? Math.round(applications.reduce((a, x) => a + x.progress, 0) / applications.length)
    : 0;

  const funnel = [
    { label: "Drafting", value: applications.filter((a) => a.status === "drafting").length + 9 },
    { label: "Documents", value: applications.filter((a) => a.status === "documents").length + 6 },
    { label: "Submitted", value: applications.filter((a) => a.status === "submitted").length + 4 },
    { label: "Interview", value: applications.filter((a) => a.status === "interview").length + 2 },
    { label: "Offer", value: applications.filter((a) => a.status === "offer").length + 1 },
    { label: "Accepted", value: applications.filter((a) => a.status === "accepted").length + 1 },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Education consultancy"
        title="Application tracker"
        description="Document checklists that compute progress, deadlines that surface before they hurt, and the one blocker usually visible on every record."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="In progress"
          value={applications.filter((a) => a.status !== "accepted" && a.status !== "rejected").length}
          deltaLabel="active applications"
          icon={<FileCheck2 className="size-4" />}
        />
        <StatCard
          label="At risk"
          value={atRisk.length}
          deltaLabel="due within 14 days"
          icon={<AlertTriangle className="size-4" />}
          tone="signal"
        />
        <StatCard
          label="Average progress"
          value={`${avgProgress}%`}
          deltaLabel="across all applications"
          icon={<ListChecks className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Offers"
          value={applications.filter((a) => a.status === "offer").length}
          deltaLabel="awaiting a decision"
          icon={<Check className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search by student or university…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All
            </FilterChip>
            {(Object.keys(statusMeta) as Application["status"][]).map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                count={applications.filter((a) => a.status === s).length}
              >
                {statusMeta[s].label}
              </FilterChip>
            ))}
          </div>

          {sorted.length === 0 ? (
            <EmptyState
              icon={<FileCheck2 className="size-6" />}
              title="No applications match"
              description="Change the filter or search term."
            />
          ) : (
            <div className="space-y-3">
              {sorted.map((a) => {
                const student = students.find((s) => s.id === a.studentId);
                const uni = universities.find((u) => u.id === a.universityId);
                const course = courses.find((c) => c.id === a.courseId);
                const days = daysUntil(a.dueDate);
                const meta = statusMeta[a.status];
                const open = expanded === a.id;
                return (
                  <article key={a.id} className="fc-card overflow-hidden">
                    <button
                      onClick={() => setExpanded(open ? null : a.id)}
                      className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center"
                    >
                      <Avatar name={student?.name ?? "Student"} hue={student?.avatarHue ?? 220} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14.5px] font-semibold">{student?.name}</span>
                          <Badge tone={meta.tone} dot>
                            {meta.label}
                          </Badge>
                        </div>
                        <div className="mt-0.5 truncate text-[12.5px] text-[var(--fc-fg-muted)]">
                          {uni?.name}
                          {course ? ` · ${course.title}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-28 sm:w-36">
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="text-[var(--fc-fg-subtle)]">Progress</span>
                            <span className="font-semibold tabular-nums">{a.progress}%</span>
                          </div>
                          <Progress
                            value={a.progress}
                            height={5}
                            tone={a.progress >= 80 ? "success" : a.progress >= 40 ? "brand" : "signal"}
                          />
                        </div>
                        <div className="shrink-0 text-right">
                          <div
                            className={cn(
                              "text-[12.5px] font-semibold",
                              days <= 5 ? "text-rose-500" : days <= 14 ? "text-[var(--color-signal-600)] dark:text-signal-300" : "text-[var(--fc-fg-muted)]",
                            )}
                          >
                            {days <= 0 ? "Overdue" : `${days} days`}
                          </div>
                          <div className="text-[11px] text-[var(--fc-fg-subtle)]">
                            {formatDate(a.dueDate)}
                          </div>
                        </div>
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                          <div>
                            <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                              Document checklist
                            </h4>
                            <ul className="space-y-1.5">
                              {a.checklist.map((item) => {
                                const blocked =
                                  !item.done &&
                                  item.label.toLowerCase().includes("reference");
                                return (
                                  <li key={item.id}>
                                    <button
                                      onClick={() => toggleChecklist(a.id, item.id)}
                                      className="flex w-full items-center gap-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-3 py-2.5 text-left transition-colors hover:border-[var(--color-brand-400)]"
                                    >
                                      <span
                                        className={cn(
                                          "grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                                          item.done
                                            ? "border-emerald-500 bg-emerald-500 text-white"
                                            : "border-[var(--fc-line-strong)]",
                                        )}
                                      >
                                        {item.done && <Check className="size-3" strokeWidth={3.5} />}
                                      </span>
                                      <span
                                        className={cn(
                                          "flex-1 text-[13px]",
                                          item.done
                                            ? "text-[var(--fc-fg-subtle)] line-through"
                                            : "font-medium",
                                        )}
                                      >
                                        {item.label}
                                      </span>
                                      {blocked && (
                                        <Badge tone="danger">
                                          <Clock className="size-2.5" />
                                          third party
                                        </Badge>
                                      )}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          <div>
                            <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                              Move to status
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {(Object.keys(statusMeta) as Application["status"][]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => updateApplication(a.id, { status: s })}
                                  className={cn(
                                    "rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                                    a.status === s
                                      ? "bg-[var(--color-brand-500)] text-white"
                                      : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)] hover:text-[var(--fc-fg)]",
                                  )}
                                >
                                  {statusMeta[s].label}
                                </button>
                              ))}
                            </div>

                            {a.notes && (
                              <div className="mt-4">
                                <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                                  Notes
                                </h4>
                                <p className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                                  {a.notes}
                                </p>
                              </div>
                            )}

                            <div className="mt-4 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3">
                              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                                Deadline
                              </div>
                              <div className="mt-1 text-[13px] font-semibold">
                                {formatDate(a.dueDate)}
                              </div>
                              <div className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                                {relativeTime(a.dueDate)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Application funnel</h2>
            <div className="mt-4">
              <FunnelChart stages={funnel} />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Where it stalls</h2>
            <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
              Blocked document items by type
            </p>
            <ul className="mt-4 space-y-2.5">
              {[
                { l: "Reference letter", v: 3 },
                { l: "IELTS certificate", v: 2 },
                { l: "Personal statement", v: 1 },
                { l: "Passport copy", v: 1 },
              ].map((b) => (
                <li key={b.l}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="text-[var(--fc-fg-muted)]">{b.l}</span>
                    <span className="font-semibold tabular-nums">{b.v}</span>
                  </div>
                  <Progress value={(b.v / 4) * 100} height={5} tone="signal" />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--fc-fg-subtle)]">
              Reference letters account for 43% of stalls. Build in a six-week
              runway the moment you request one.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
