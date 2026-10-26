"use client";

import * as React from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  ListTodo,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, isOverdue, relativeTime } from "@/lib/utils";
import type { Activity } from "@/lib/types";

const typeMeta: Record<
  Activity["type"],
  { label: string; icon: React.ElementType; cls: string }
> = {
  call: { label: "Call", icon: Phone, cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  email: { label: "Email", icon: Mail, cls: "bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]" },
  meeting: { label: "Meeting", icon: CalendarClock, cls: "bg-violet-500/12 text-violet-500" },
  note: { label: "Note", icon: FileText, cls: "bg-[var(--color-signal-500)]/12 text-[var(--color-signal-500)]" },
  task: { label: "Task", icon: ListTodo, cls: "bg-[var(--color-accent-500)]/12 text-[var(--color-accent-500)]" },
  stage_change: { label: "Stage", icon: TrendingUp, cls: "bg-ink-400/15 text-[var(--fc-fg-muted)]" },
};

const modules = ["CRM", "Marketing", "Education", "Studio", "Community"];

export default function ActivitiesPage() {
  const activities = useStore((s) => s.activities);
  const contacts = useStore((s) => s.contacts);
  const tasks = useStore((s) => s.tasks);
  const addActivity = useStore((s) => s.addActivity);
  const toggleActivity = useStore((s) => s.toggleActivity);
  const toggleTask = useStore((s) => s.toggleTask);
  const addTask = useStore((s) => s.addTask);
  const removeTask = useStore((s) => s.removeTask);
  const toast = useToast();

  const [tab, setTab] = React.useState<"timeline" | "tasks">("timeline");
  const [typeFilter, setTypeFilter] = React.useState<Activity["type"] | "all">("all");
  const [modal, setModal] = React.useState(false);
  const [form, setForm] = React.useState({
    type: "call" as Activity["type"],
    title: "",
    detail: "",
    contactId: "",
    due: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  });
  const [newTask, setNewTask] = React.useState({
    title: "",
    priority: "medium" as "low" | "medium" | "high",
    module: "CRM",
  });

  const filtered = React.useMemo(
    () =>
      activities.filter((a) => typeFilter === "all" || a.type === typeFilter),
    [activities, typeFilter],
  );

  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);
  const overdueTasks = openTasks.filter((t) => t.due && isOverdue(t.due));

  const submitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.warning("Missing title", "Describe the activity.");
      return;
    }
    addActivity({
      type: form.type,
      title: form.title.trim(),
      detail: form.detail || undefined,
      contactId: form.contactId || undefined,
      due: form.due ? new Date(form.due).toISOString() : undefined,
      done: false,
    });
    setModal(false);
    setForm({
      type: "call",
      title: "",
      detail: "",
      contactId: "",
      due: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    });
    toast.success("Activity logged", "Added to the timeline.");
  };

  const submitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.warning("Missing title", "What needs doing?");
      return;
    }
    addTask(newTask);
    setNewTask({ title: "", priority: "medium", module: "CRM" });
    toast.success("Task added", "It is on your list.");
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Workspace"
        title="Activities & tasks"
        description="Everything that happened, everything that must happen, and who owns it."
        actions={
          <button onClick={() => setModal(true)} className="btn btn-primary btn-sm">
            <Plus className="size-3.5" />
            Log activity
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open tasks"
          value={openTasks.length}
          deltaLabel={`${doneTasks.length} completed`}
          icon={<ListTodo className="size-4" />}
        />
        <StatCard
          label="Overdue"
          value={overdueTasks.length}
          deltaLabel="needs attention now"
          icon={<Clock className="size-4" />}
          tone="signal"
        />
        <StatCard
          label="Logged this week"
          value={activities.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 7 * 86_400_000).length}
          deltaLabel="activities recorded"
          icon={<TrendingUp className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Completion rate"
          value={`${Math.round((doneTasks.length / Math.max(1, tasks.length)) * 100)}%`}
          deltaLabel="of all tasks"
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-5 flex gap-1.5">
        {(["timeline", "tasks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-2 text-[13px] font-semibold capitalize transition-colors",
              tab === t
                ? "bg-[var(--color-brand-500)] text-white"
                : "bg-[var(--fc-surface)] text-[var(--fc-fg-muted)] hover:text-[var(--fc-fg)]",
            )}
          >
            {t === "timeline" ? "Activity timeline" : "Task list"}
          </button>
        ))}
      </div>

      {tab === "timeline" ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-4 flex flex-wrap gap-1.5">
              <button
                onClick={() => setTypeFilter("all")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  typeFilter === "all"
                    ? "bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]"
                    : "bg-[var(--fc-surface)] text-[var(--fc-fg-muted)] hover:text-[var(--fc-fg)]",
                )}
              >
                All types
              </button>
              {(Object.keys(typeMeta) as Activity["type"][]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
                    typeFilter === t
                      ? "bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]"
                      : "bg-[var(--fc-surface)] text-[var(--fc-fg-muted)] hover:text-[var(--fc-fg)]",
                  )}
                >
                  {typeMeta[t].label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<Clock className="size-6" />}
                title="No activity yet"
                description="Log a call, an email or a meeting to build the timeline."
              />
            ) : (
              <ol className="relative space-y-2 border-l border-[var(--fc-line)] pl-6">
                {filtered.map((a) => {
                  const meta = typeMeta[a.type];
                  const Icon = meta.icon;
                  const contact = contacts.find((c) => c.id === a.contactId);
                  return (
                    <li key={a.id} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[31px] grid size-6 place-items-center rounded-full ring-4 ring-[var(--fc-surface-2)]",
                          meta.cls,
                        )}
                      >
                        <Icon className="size-3" />
                      </span>
                      <div
                        className={cn(
                          "fc-card flex items-start gap-3 p-3.5",
                          !a.done && a.due && isOverdue(a.due) && "border-rose-300 dark:border-rose-900",
                        )}
                      >
                        <button
                          onClick={() => toggleActivity(a.id)}
                          className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-[var(--fc-line-strong)] transition-colors hover:border-emerald-500 hover:text-emerald-500"
                          aria-label="Toggle done"
                        >
                          {a.done && <Check className="size-3" strokeWidth={3.5} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "text-[13.5px] font-medium",
                                a.done && "text-[var(--fc-fg-subtle)] line-through",
                              )}
                            >
                              {a.title}
                            </span>
                            <Badge>{meta.label}</Badge>
                            {a.due && !a.done && (
                              <Badge tone={isOverdue(a.due) ? "danger" : "neutral"}>
                                {isOverdue(a.due) ? "overdue" : relativeTime(a.due)}
                              </Badge>
                            )}
                          </div>
                          {a.detail && (
                            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                              {a.detail}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-[var(--fc-fg-subtle)]">
                            {contact && (
                              <span className="flex items-center gap-1.5">
                                <Avatar name={contact.name} hue={contact.avatarHue} size={16} />
                                {contact.name}
                              </span>
                            )}
                            <span>· {relativeTime(a.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <aside className="space-y-4">
            <div className="fc-card p-5">
              <h2 className="text-[15px] font-semibold">Activity mix</h2>
              <div className="mt-4 space-y-2.5">
                {(Object.keys(typeMeta) as Activity["type"][]).map((t) => {
                  const count = activities.filter((a) => a.type === t).length;
                  const pct = activities.length ? (count / activities.length) * 100 : 0;
                  const meta = typeMeta[t];
                  return (
                    <div key={t}>
                      <div className="mb-1 flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-2 text-[var(--fc-fg-muted)]">
                          <meta.icon className="size-3.5" />
                          {meta.label}
                        </span>
                        <span className="tabular-nums font-semibold">{count}</span>
                      </div>
                      <Progress value={pct} height={5} />
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="fc-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">
                {openTasks.length} open task{openTasks.length === 1 ? "" : "s"}
              </h2>
              {overdueTasks.length > 0 && (
                <Badge tone="danger">{overdueTasks.length} overdue</Badge>
              )}
            </div>
            <ul className="space-y-2">
              {[...overdueTasks, ...openTasks.filter((t) => !overdueTasks.includes(t))].map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                >
                  <button
                    onClick={() => toggleTask(t.id)}
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-[var(--fc-line-strong)] transition-colors hover:border-emerald-500 hover:text-emerald-500"
                    aria-label="Toggle task"
                  >
                    {t.done && <Check className="size-3" strokeWidth={3.5} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">{t.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11.5px] text-[var(--fc-fg-subtle)]">
                      <Badge
                        tone={
                          t.priority === "high"
                            ? "danger"
                            : t.priority === "medium"
                            ? "signal"
                            : "neutral"
                        }
                      >
                        {t.priority}
                      </Badge>
                      <span>{t.module}</span>
                      {t.due && (
                        <span className={isOverdue(t.due) ? "font-semibold text-rose-500" : ""}>
                          · {isOverdue(t.due) ? "overdue" : relativeTime(t.due)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeTask(t.id)}
                    className="btn btn-ghost btn-icon size-7 text-rose-500"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
              {openTasks.length === 0 && (
                <li>
                  <EmptyState title="All clear" description="Nothing outstanding. Nice." />
                </li>
              )}
            </ul>

            {doneTasks.length > 0 && (
              <>
                <h3 className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
                  Completed ({doneTasks.length})
                </h3>
                <ul className="space-y-1.5">
                  {doneTasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-1 py-1.5">
                      <button
                        onClick={() => toggleTask(t.id)}
                        className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"
                      >
                        <Check className="size-3" strokeWidth={3.5} />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--fc-fg-subtle)] line-through">
                        {t.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="fc-card h-fit p-5">
            <h2 className="text-[15px] font-semibold">Add a task</h2>
            <form onSubmit={submitTask} className="mt-4 space-y-3">
              <textarea
                className="field min-h-[80px] resize-y"
                placeholder="What needs doing?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="field"
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      priority: e.target.value as "low" | "medium" | "high",
                    })
                  }
                >
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
                <select
                  className="field"
                  value={newTask.module}
                  onChange={(e) => setNewTask({ ...newTask, module: e.target.value })}
                >
                  {modules.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary w-full">
                <Plus className="size-3.5" />
                Add task
              </button>
            </form>
          </div>
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Log an activity"
        description="Calls, emails, meetings and notes all land on the same timeline."
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={submitActivity} className="btn btn-primary btn-sm">
              Log it
            </button>
          </>
        }
      >
        <form onSubmit={submitActivity} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(typeMeta) as Activity["type"][]).map((t) => {
              const Icon = typeMeta[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition-colors",
                    form.type === t
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]"
                      : "border-[var(--fc-line)] text-[var(--fc-fg-muted)] hover:text-[var(--fc-fg)]",
                  )}
                >
                  <Icon className="size-3.5" />
                  {typeMeta[t].label}
                </button>
              );
            })}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Title *</span>
            <input
              className="field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Pricing call with Northwind"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Detail</span>
            <textarea
              className="field min-h-[90px] resize-y"
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Contact</span>
              <select
                className="field"
                value={form.contactId}
                onChange={(e) => setForm({ ...form, contactId: e.target.value })}
              >
                <option value="">No contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Due date</span>
              <input
                className="field"
                type="date"
                value={form.due}
                onChange={(e) => setForm({ ...form, due: e.target.value })}
              />
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
