"use client";

import * as React from "react";
import {
  BookOpen,
  Check,
  Clock,
  Flame,
  Play,
  Plus,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { AreaChart, RadarChart, DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, formatDate, sum } from "@/lib/utils";

export default function StudyPage() {
  const sessions = useStore((s) => s.studySessions);
  const addSession = useStore((s) => s.addStudySession);
  const updateSession = useStore((s) => s.updateStudySession);
  const toast = useToast();

  const [modal, setModal] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [form, setForm] = React.useState({
    subject: "IELTS",
    topic: "",
    plannedMinutes: 60,
    date: new Date().toISOString().slice(0, 10),
  });

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const logged = sum(sessions.map((s) => s.loggedMinutes));
  const planned = sum(sessions.map((s) => s.plannedMinutes));
  const doneCount = sessions.filter((s) => s.done).length;
  const avgConfidence = sessions.length
    ? (sum(sessions.map((s) => s.confidence)) / sessions.length).toFixed(1)
    : "0.0";

  const subjectData = React.useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => map.set(s.subject, (map.get(s.subject) ?? 0) + s.loggedMinutes));
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [sessions]);

  const weekly = [45, 70, 55, 90, 120, 40, 65];
  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic.trim()) {
      toast.warning("Missing topic", "What are you working on?");
      return;
    }
    addSession({
      subject: form.subject,
      topic: form.topic.trim(),
      plannedMinutes: Number(form.plannedMinutes) || 0,
      loggedMinutes: 0,
      date: new Date(form.date).toISOString(),
      done: false,
      confidence: 3,
    });
    setModal(false);
    setForm({ subject: "IELTS", topic: "", plannedMinutes: 60, date: new Date().toISOString().slice(0, 10) });
    toast.success("Session planned", "Added to the study plan.");
  };

  const logTime = (id: string, minutes: number) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    updateSession(id, { loggedMinutes: s.loggedMinutes + minutes });
    toast.success("Time logged", `${minutes} minutes added to "${s.topic}".`);
  };

  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Student success"
        title="Study planner"
        description="Planned versus logged revision time, with a confidence score so weak areas surface before the exam does."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            Plan a session
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Minutes logged"
          value={logged}
          deltaLabel={`of ${planned} planned`}
          icon={<Clock className="size-4" />}
        >
          <div className="mt-3">
            <Progress
              value={planned ? Math.min(100, (logged / planned) * 100) : 0}
              tone={logged >= planned ? "success" : "brand"}
            />
          </div>
        </StatCard>
        <StatCard
          label="Sessions done"
          value={`${doneCount}/${sessions.length}`}
          deltaLabel="completed"
          icon={<Check className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Average confidence"
          value={avgConfidence}
          deltaLabel="out of 5"
          icon={<Target className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Focus streak"
          value="6 days"
          deltaLabel="personal best: 11"
          icon={<Flame className="size-4" />}
          tone="signal"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="fc-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold">Focus timer</h2>
                <p className="text-[12px] text-[var(--fc-fg-muted)]">
                  Pomodoro-style block, tracked against the plan
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-bold tabular-nums">
                  {formatTimer(elapsed)}
                </span>
                <button
                  onClick={() => setRunning((r) => !r)}
                  className={cn(
                    "btn btn-sm",
                    running ? "btn-danger" : "btn-primary",
                  )}
                >
                  {running ? (
                    <>
                      <Timer className="size-3.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" /> Start
                    </>
                  )}
                </button>
                {elapsed > 0 && (
                  <button
                    onClick={() => {
                      const mins = Math.max(1, Math.round(elapsed / 60));
                      const pending = sessions.find((s) => !s.done);
                      if (pending) {
                        updateSession(pending.id, {
                          loggedMinutes: pending.loggedMinutes + mins,
                        });
                        toast.success("Session logged", `${mins} minutes on "${pending.topic}".`);
                      } else {
                        toast.info("Nothing pending", "Plan a session to log time against.");
                      }
                      setElapsed(0);
                      setRunning(false);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-500),var(--color-accent-500))] transition-[width] duration-1000"
                style={{ width: `${Math.min(100, (elapsed / (25 * 60)) * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-[var(--fc-fg-subtle)]">
              25-minute block · auto-logs to the next planned session
            </p>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Revision plan</h2>
            <div className="mt-4 space-y-2.5">
              {sessions.map((s) => {
                const pct = s.plannedMinutes
                  ? Math.min(100, (s.loggedMinutes / s.plannedMinutes) * 100)
                  : 0;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-xl border p-3.5 transition-colors",
                      s.done
                        ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
                        : "border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <button
                        onClick={() => updateSession(s.id, { done: !s.done })}
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                          s.done
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-[var(--fc-line-strong)] hover:border-emerald-500",
                        )}
                        aria-label="Toggle session"
                      >
                        {s.done && <Check className="size-3" strokeWidth={3.5} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-[13.5px] font-semibold",
                              s.done && "text-[var(--fc-fg-subtle)] line-through",
                            )}
                          >
                            {s.topic}
                          </span>
                          <Badge tone="brand">{s.subject}</Badge>
                          <Badge tone={s.confidence <= 2 ? "danger" : s.confidence >= 4 ? "success" : "neutral"}>
                            confidence {s.confidence}/5
                          </Badge>
                        </div>
                        <div className="mt-1 text-[11.5px] text-[var(--fc-fg-subtle)]">
                          {formatDate(s.date)} · {s.loggedMinutes}/{s.plannedMinutes} min
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => logTime(s.id, 15)}
                          className="btn btn-secondary btn-sm"
                        >
                          +15
                        </button>
                        <button
                          onClick={() => logTime(s.id, 30)}
                          className="btn btn-secondary btn-sm"
                        >
                          +30
                        </button>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <Progress
                        value={pct}
                        height={4}
                        tone={pct >= 100 ? "success" : pct > 0 ? "brand" : "signal"}
                      />
                    </div>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <EmptyState
                  icon={<BookOpen className="size-6" />}
                  title="No sessions planned"
                  description="Plan your first revision block."
                />
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">This week</h2>
            <p className="text-[12px] text-[var(--fc-fg-muted)]">Minutes studied per day</p>
            <div className="mt-4">
              <AreaChart
                height={180}
                labels={weekLabels}
                series={[{ name: "Minutes", data: weekly, color: "var(--color-accent-500)" }]}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Subject balance</h2>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Minutes"
                centerValue={String(logged)}
                data={subjectData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Skill confidence</h2>
            <div className="mt-4">
              <RadarChart
                size={210}
                axes={["Grammar", "Vocabulary", "Listening", "Reading", "Writing", "Speaking"]}
                series={[
                  {
                    name: "You",
                    data: [4, 3, 4, 5, 2, 3],
                    color: "#14b8a6",
                  },
                ]}
              />
            </div>
            <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-[var(--fc-fg-subtle)]">
              <TrendingUp className="mt-0.5 size-3.5 shrink-0" />
              Writing is your weakest area at 2/5. It also correlates with the most
              conditional offers, so weight next week accordingly.
            </p>
          </div>
        </aside>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Plan a revision session"
        description="Give it a topic — vague sessions never get done."
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submit} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Add to plan
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Subject</span>
            <select
              className="field"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            >
              {["IELTS", "Mathematics", "Physics", "English", "Chemistry", "Economics"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Topic *</span>
            <input
              className="field"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="Writing Task 2 — essay structures"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">
                Planned minutes — {form.plannedMinutes}
              </span>
              <input
                type="range"
                min={15}
                max={240}
                step={15}
                value={form.plannedMinutes}
                onChange={(e) =>
                  setForm({ ...form, plannedMinutes: Number(e.target.value) })
                }
                className="w-full accent-[var(--color-brand-500)]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Date</span>
              <input
                className="field"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
