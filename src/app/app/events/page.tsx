"use client";

import * as React from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  Search,
  Users,
  Video,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import type { EventItem } from "@/lib/types";

const typeMeta: Record<
  EventItem["type"],
  { label: string; tone: "brand" | "accent" | "signal" | "violet" | "success" }
> = {
  webinar: { label: "Webinar", tone: "accent" },
  deadline: { label: "Deadline", tone: "signal" },
  meeting: { label: "Meeting", tone: "brand" },
  launch: { label: "Launch", tone: "violet" },
  community: { label: "Community", tone: "success" },
};

export default function EventsPage() {
  const events = useStore((s) => s.events);
  const addEvent = useStore((s) => s.addEvent);
  const toast = useToast();

  const [view, setView] = React.useState<"upcoming" | "past">("upcoming");
  const [query, setQuery] = React.useState("");
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    type: "meeting" as EventItem["type"],
    date: "",
    time: "10:00",
    duration: 60,
    location: "Zoom",
    description: "",
    attendees: 0,
  });

  const now = new Date();
  const list = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => {
        const d = new Date(e.date);
        const upcoming = d.getTime() >= now.getTime();
        return view === "upcoming" ? upcoming : !upcoming;
      })
      .filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      )
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [events, query, view, now]);

  const upcoming = events.filter((e) => +new Date(e.date) >= +now);
  const nextDeadline = upcoming
    .filter((e) => e.type === "deadline")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.warning("Missing title", "Name the event.");
      return;
    }
    if (!form.date) {
      toast.warning("Missing date", "Pick a date.");
      return;
    }
    addEvent({
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      time: form.time,
      duration: form.duration,
      location: form.location,
      description: form.description,
      attendees: form.attendees,
    });
    setModal(false);
    setForm({
      title: "",
      type: "meeting",
      date: "",
      time: "10:00",
      duration: 60,
      location: "Zoom",
      description: "",
      attendees: 0,
    });
    toast.success("Event scheduled", form.title);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Operations"
        title="Events"
        description="Workshops, webinars, deadlines and meetups — one calendar for the consultancy, the cohort and the campaign calendar."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            Schedule event
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          deltaLabel="scheduled events"
          icon={<CalendarDays className="size-4" />}
        />
        <StatCard
          label="Next deadline"
          value={nextDeadline ? relativeTime(nextDeadline.date) : "—"}
          deltaLabel={nextDeadline?.title ?? "nothing due"}
          icon={<Clock className="size-4" />}
          tone="signal"
        />
        <StatCard
          label="Total attendees"
          value={upcoming.reduce((a, e) => a + e.attendees, 0).toLocaleString()}
          deltaLabel="registered so far"
          icon={<Users className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Sessions this month"
          value={upcoming.filter((e) => e.type !== "deadline").length}
          deltaLabel="excluding deadlines"
          icon={<Video className="size-4" />}
          tone="violet"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
              <input
                className="field pl-9"
                placeholder="Search events…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setView("upcoming")}
              className={cn("btn btn-sm", view === "upcoming" ? "btn-primary" : "btn-ghost")}
            >
              Upcoming
            </button>
            <button
              onClick={() => setView("past")}
              className={cn("btn btn-sm", view === "past" ? "btn-primary" : "btn-ghost")}
            >
              Past
            </button>
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-6" />}
              title={view === "upcoming" ? "Nothing scheduled" : "No past events"}
              description={
                view === "upcoming"
                  ? "Schedule a workshop, a webinar or a deadline."
                  : "Completed events will appear here."
              }
              action={
                view === "upcoming" ? (
                  <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
                    <Plus className="size-3.5" />
                    Schedule event
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {list.map((e) => {
                const meta = typeMeta[e.type];
                const d = new Date(e.date);
                return (
                  <article key={e.id} className="fc-card flex gap-4 p-5">
                    <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                        {d.toLocaleDateString("en-GB", { month: "short" })}
                      </span>
                      <span className="font-display text-[22px] font-bold leading-none">
                        {d.getDate()}
                      </span>
                      <span className="mt-0.5 text-[10px] tabular-nums text-[var(--fc-fg-subtle)]">
                        {d.getFullYear()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold">{e.title}</h3>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--fc-fg-muted)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {e.time} · {e.duration} min
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {e.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-3.5" />
                          {e.attendees} attending
                        </span>
                      </div>
                      {e.description && (
                        <p className="mt-2 text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                          {e.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-[var(--fc-fg-subtle)]">
                      {formatDate(e.date)}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">Next seven days</h3>
            <ul className="mt-3 space-y-2">
              {upcoming
                .filter((e) => {
                  const diff = +new Date(e.date) - +now;
                  return diff > 0 && diff < 7 * 24 * 3600 * 1000;
                })
                .slice(0, 6)
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-2.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold">
                        {e.title}
                      </span>
                      <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {formatDate(e.date)} · {e.time}
                      </span>
                    </span>
                    <Badge tone={typeMeta[e.type].tone}>{typeMeta[e.type].label}</Badge>
                  </li>
                ))}
              {upcoming.filter(
                (e) => +new Date(e.date) - +now < 7 * 24 * 3600 * 1000,
              ).length === 0 && (
                <li className="py-4 text-center text-[12.5px] text-[var(--fc-fg-muted)]">
                  A clear week.
                </li>
              )}
            </ul>
          </div>

          <div className="fc-card p-5">
            <h3 className="text-[15px] font-semibold">By type</h3>
            <ul className="mt-3 space-y-2">
              {(Object.keys(typeMeta) as EventItem["type"][]).map((t) => {
                const count = events.filter((e) => e.type === t).length;
                const max = Math.max(1, ...Object.keys(typeMeta).map((x) => events.filter((e) => e.type === x).length));
                return (
                  <li key={t} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-[12px] text-[var(--fc-fg-muted)]">
                      {typeMeta[t].label}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
                      <span
                        className="block h-full rounded-full bg-[var(--color-brand-500)]"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-[12px] tabular-nums font-semibold">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Schedule an event"
        description="Workshops, webinars, deadlines and calls all live here."
        size="md"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Schedule
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Title *</span>
            <input
              className="field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="IELTS essay workshop"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Type</span>
              <select
                className="field"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as EventItem["type"] })
                }
              >
                {Object.keys(typeMeta).map((t) => (
                  <option key={t} value={t}>
                    {typeMeta[t as EventItem["type"]].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Location</span>
              <input
                className="field"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Date *</span>
              <input
                type="date"
                className="field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Time</span>
              <input
                type="time"
                className="field"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Minutes</span>
              <input
                type="number"
                min={15}
                step={15}
                className="field"
                value={form.duration}
                onChange={(e) =>
                  setForm({ ...form, duration: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Description</span>
            <textarea
              className="field min-h-[80px] resize-y"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Attendees</span>
            <input
              type="number"
              min={0}
              className="field"
              value={form.attendees}
              onChange={(e) =>
                setForm({ ...form, attendees: Number(e.target.value) })
              }
            />
          </label>
        </form>
      </Modal>
    </div>
  );
}
