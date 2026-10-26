"use client";

import * as React from "react";
import {
  GraduationCap,
  Mail,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, formatCurrency, relativeTime } from "@/lib/utils";
import type { Student } from "@/lib/types";

const statusMeta: Record<
  Student["status"],
  { label: string; tone: "neutral" | "accent" | "brand" | "violet" | "success" | "danger"; pct: number }
> = {
  enquiry: { label: "Enquiry", tone: "neutral", pct: 10 },
  shortlisted: { label: "Shortlisted", tone: "accent", pct: 30 },
  applied: { label: "Applied", tone: "brand", pct: 55 },
  offer: { label: "Offer", tone: "violet", pct: 78 },
  visa: { label: "Visa", tone: "violet", pct: 88 },
  enrolled: { label: "Enrolled", tone: "success", pct: 100 },
  lost: { label: "Lost", tone: "danger", pct: 0 },
};

export default function StudentsPage() {
  const students = useStore((s) => s.students);
  const courses = useStore((s) => s.courses);
  const universities = useStore((s) => s.universities);
  const applications = useStore((s) => s.applications);
  const addStudent = useStore((s) => s.addStudent);
  const updateStudent = useStore((s) => s.updateStudent);
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<Student["status"] | "all">("all");
  const [modal, setModal] = React.useState(false);
  const [detail, setDetail] = React.useState<Student | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    country: "",
    level: "",
    targetCourseId: "",
    budget: 25000,
    status: "enquiry" as Student["status"],
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    if (focus) {
      const s = students.find((x) => x.id === focus);
      if (s) setDetail(s);
    }
  }, [students]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q)
      );
    });
  }, [students, query, statusFilter]);

  const countryData = React.useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => map.set(s.country, (map.get(s.country) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [students]);

  const totalBudget = students.reduce((a, s) => a + s.budget, 0);
  const enrolled = students.filter((s) => s.status === "enrolled").length;
  const offers = students.filter((s) => s.status === "offer" || s.status === "visa").length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.warning("Missing details", "Name and email are required.");
      return;
    }
    const created = addStudent({
      name: form.name.trim(),
      email: form.email.trim(),
      country: form.country || "Unknown",
      level: form.level || "Unspecified",
      targetCourseId: form.targetCourseId || undefined,
      status: form.status,
      budget: Number(form.budget) || 0,
    });
    setModal(false);
    setForm({
      name: "",
      email: "",
      country: "",
      level: "",
      targetCourseId: "",
      budget: 25000,
      status: "enquiry",
    });
    toast.success("Student added", `${created.name} is in the pipeline.`);
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Education consultancy"
        title="Students"
        description="Every enquiry through to enrolment — with budget, target course and the paperwork that actually moves the application."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            Add student
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={students.length}
          deltaLabel="in the consultancy"
          icon={<GraduationCap className="size-4" />}
        />
        <StatCard
          label="Total budget"
          value={formatCurrency(totalBudget)}
          deltaLabel="combined stated budget"
          icon={<Wallet className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Offers out"
          value={offers}
          deltaLabel="awaiting a decision"
          icon={<GraduationCap className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Enrolled"
          value={enrolled}
          deltaLabel="paid their deposit"
          icon={<GraduationCap className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_290px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search students…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All
            </FilterChip>
            {(Object.keys(statusMeta) as Student["status"][]).map((s) => (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                count={students.filter((x) => x.status === s).length}
              >
                {statusMeta[s].label}
              </FilterChip>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="size-6" />}
              title="No students match"
              description="Change the filter or search term."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s) => {
                const meta = statusMeta[s.status];
                const course = courses.find((c) => c.id === s.targetCourseId);
                const university = universities.find((u) => u.id === course?.universityId);
                const studentApps = applications.filter((a) => a.studentId === s.id);
                const progress = studentApps.length
                  ? Math.round(
                      studentApps.reduce((a, x) => a + x.progress, 0) / studentApps.length,
                    )
                  : 0;
                return (
                  <article key={s.id} className="fc-card fc-card-hover flex flex-col p-5">
                    <div className="flex items-start gap-3">
                      <Avatar name={s.name} hue={s.avatarHue} size={42} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-semibold">{s.name}</h3>
                        <div className="mt-0.5 truncate text-[12px] text-[var(--fc-fg-subtle)]">
                          {s.country} · {s.level}
                        </div>
                      </div>
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </div>

                    {course && (
                      <div className="mt-4 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                        <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                          Target course
                        </div>
                        <div className="mt-1 truncate text-[12.5px] font-semibold">{course.title}</div>
                        <div className="truncate text-[11.5px] text-[var(--fc-fg-muted)]">
                          {university?.name} · {course.tuition.toLocaleString()} {university?.currency ?? ""}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                        <span className="text-[var(--fc-fg-subtle)]">Application progress</span>
                        <span className="font-semibold tabular-nums">{progress}%</span>
                      </div>
                      <Progress
                        value={progress}
                        tone={progress >= 80 ? "success" : progress >= 40 ? "brand" : "signal"}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[var(--fc-line)] pt-3.5 text-[12px]">
                      <span className="text-[var(--fc-fg-muted)]">Budget</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(s.budget)}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[12px]">
                      <span className="text-[var(--fc-fg-muted)]">Added</span>
                      <span className="text-[var(--fc-fg-subtle)]">{relativeTime(s.createdAt)}</span>
                    </div>

                    <button
                      onClick={() => setDetail(s)}
                      className="btn btn-secondary btn-sm mt-4 w-full"
                    >
                      Open student
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Origin countries</h2>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Students"
                centerValue={String(students.length)}
                data={countryData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Pipeline value</h2>
            <div className="mt-4 space-y-3">
              {(Object.keys(statusMeta) as Student["status"][]).map((s) => {
                const count = students.filter((x) => x.status === s).length;
                const value = students
                  .filter((x) => x.status === s)
                  .reduce((a, x) => a + x.budget, 0);
                return (
                  <div key={s} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-[var(--fc-fg-muted)]">
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor:
                            s === "enrolled"
                              ? "#22c55e"
                              : s === "lost"
                              ? "#ef4444"
                              : s === "offer" || s === "visa"
                              ? "#8b5cf6"
                              : "#3b64f6",
                        }}
                      />
                      {statusMeta[s].label}
                    </span>
                    <span className="tabular-nums font-semibold">
                      {count} · {formatCurrency(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Add a student"
        description="Start the record now, fill in the rest as you go."
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Add student
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Full name *</span>
            <input
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Email *</span>
            <input
              className="field"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Country</span>
            <input
              className="field"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Current level</span>
            <input
              className="field"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              placeholder="IELTS 6.5 / A-levels"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Target course</span>
            <select
              className="field"
              value={form.targetCourseId}
              onChange={(e) => setForm({ ...form, targetCourseId: e.target.value })}
            >
              <option value="">Not decided yet</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — {universities.find((u) => u.id === c.universityId)?.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Budget (£)</span>
            <input
              className="field"
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Status</span>
            <select
              className="field"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Student["status"] })
              }
            >
              {(Object.keys(statusMeta) as Student["status"][]).map((s) => (
                <option key={s} value={s}>
                  {statusMeta[s].label}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        description={detail ? `${detail.email} · ${detail.country}` : ""}
        footer={
          <button onClick={() => setDetail(null)} className="btn btn-secondary btn-sm">
            Close
          </button>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={detail.name} hue={detail.avatarHue} size={52} />
              <div>
                <Badge tone={statusMeta[detail.status].tone} dot>
                  {statusMeta[detail.status].label}
                </Badge>
                <div className="mt-2 text-[13px] text-[var(--fc-fg-muted)]">
                  Budget {formatCurrency(detail.budget)} · {detail.level}
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Move to status
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(statusMeta) as Student["status"][]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      updateStudent(detail.id, { status: s });
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

            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Applications
              </h3>
              {applications.filter((a) => a.studentId === detail.id).length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--fc-line)] px-3 py-4 text-center text-[12.5px] text-[var(--fc-fg-muted)]">
                  No applications started yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {applications
                    .filter((a) => a.studentId === detail.id)
                    .map((a) => {
                      const uni = universities.find((u) => u.id === a.universityId);
                      return (
                        <li
                          key={a.id}
                          className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate text-[13px] font-medium">{uni?.name}</span>
                            <span className="text-[11.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                              {a.progress}%
                            </span>
                          </div>
                          <div className="mt-2">
                            <Progress value={a.progress} height={4} />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
