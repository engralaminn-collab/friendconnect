"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileText,
  GraduationCap,
  MessageSquare,
  Radio,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { useStore } from "@/store/useStore";
import {
  AreaChart,
  BarChart,
  DonutChart,
  FunnelChart,
  Heatmap,
  RadarChart,
} from "@/components/charts";
import { Avatar, Badge, Progress, SparkBars, stageMeta } from "@/components/ui/primitives";
import { allNavItems, navGroups } from "@/lib/nav";
import {
  cn,
  formatCurrency,
  formatNumber,
  isOverdue,
  relativeTime,
  sum,
} from "@/lib/utils";
import type { Stage } from "@/lib/types";

export default function DashboardPage() {
  const contacts = useStore((s) => s.contacts);
  const deals = useStore((s) => s.deals);
  const leads = useStore((s) => s.leads);
  const activities = useStore((s) => s.activities);
  const tasks = useStore((s) => s.tasks);
  const students = useStore((s) => s.students);
  const applications = useStore((s) => s.applications);
  const articles = useStore((s) => s.articles);
  const campaigns = useStore((s) => s.campaigns);
  const agents = useStore((s) => s.agents);
  const agentRuns = useStore((s) => s.agentRuns);
  const posts = useStore((s) => s.posts);
  const threads = useStore((s) => s.threads);
  const events = useStore((s) => s.events);
  const diagrams = useStore((s) => s.diagrams);
  const videos = useStore((s) => s.videos);

  const openDeals = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const pipelineValue = sum(openDeals.map((d) => d.value));
  const weightedValue = sum(openDeals.map((d) => (d.value * d.probability) / 100));
  const wonValue = sum(deals.filter((d) => d.stage === "won").map((d) => d.value));
  const unreadMessages = sum(threads.map((t) => t.unread));

  const stageCounts = (["lead", "qualified", "proposal", "negotiation", "won", "lost"] as Stage[]).map(
    (stage) => ({
      stage,
      count: deals.filter((d) => d.stage === stage).length,
      value: sum(deals.filter((d) => d.stage === stage).map((d) => d.value)),
    }),
  );

  const trend = React.useMemo(() => {
    const weeks = 8;
    const base = [42, 38, 51, 47, 62, 58, 71, 66];
    return {
      labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
      thisYear: base.map((v, i) => v + (i > 4 ? (i - 4) * 4 : 0)),
      lastYear: base.map((v) => Math.round(v * 0.72)),
    };
  }, []);

  const leadSources = React.useMemo(() => {
    const map = new Map<string, number>();
    contacts.forEach((c) => map.set(c.source, (map.get(c.source) ?? 0) + 1));
    leads.forEach((l) => map.set(l.source, (map.get(l.source) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [contacts, leads]);

  const funnel = React.useMemo(() => {
    const at = (stage: Stage) => contacts.filter((c) => c.stage === stage).length;
    return [
      { label: "Enquiry", value: contacts.length + 40 },
      { label: "Qualified", value: at("qualified") + 14 },
      { label: "Proposal", value: at("proposal") + 8 },
      { label: "Negotiation", value: at("negotiation") + 5 },
      { label: "Won", value: at("won") + 3 },
    ];
  }, [contacts]);

  const heatmapRows = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const heatmapCols = ["9am", "11am", "1pm", "3pm", "5pm"];
  const heatmapValues = React.useMemo(
    () =>
      heatmapRows.map((_, r) =>
        heatmapCols.map((__, c) => {
          const seed = (r * 7 + c * 13) % 11;
          return seed < 4 ? seed * 3 : seed < 8 ? seed * 2 : seed;
        }),
      ),
    [],
  );

  const openTasks = tasks.filter((t) => !t.done);
  const urgentTasks = openTasks.filter((t) => t.due && isOverdue(t.due));
  const upcomingApplications = applications
    .slice()
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
    .slice(0, 4);
  const recentActivity = activities.slice(0, 6);
  const topAgents = agents
    .slice()
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Workspace overview"
        title="Everything, at a glance"
        description="One lens over revenue, consultancy, content, studios and community. Every number here is computed live from the records in your workspace."
        actions={
          <>
            <Link href="/app/pipeline" className="btn btn-secondary btn-sm">
              Pipeline
              <ArrowRight className="size-3.5" />
            </Link>
            <Link href="/app/agents" className="btn btn-primary btn-sm">
              <Sparkles className="size-3.5" />
              Run an agent
            </Link>
          </>
        }
      />

      {/* ---------------- KPI ROW ---------------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={formatCurrency(pipelineValue)}
          delta={12.4}
          deltaLabel="vs last quarter"
          icon={<CircleDollarSign className="size-4" />}
          tone="brand"
        >
          <div className="mt-3">
            <Progress value={Math.min(100, (weightedValue / Math.max(1, pipelineValue)) * 100)} tone="brand" />
            <div className="mt-1.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
              {formatCurrency(weightedValue)} weighted · {openDeals.length} open deals
            </div>
          </div>
        </StatCard>

        <StatCard
          label="Active contacts"
          value={formatNumber(contacts.length)}
          delta={8.1}
          deltaLabel={`${leads.filter((l) => l.status === "new").length} new leads to work`}
          icon={<Users className="size-4" />}
          tone="accent"
        >
          <div className="mt-3 flex items-center gap-1.5">
            {contacts.slice(0, 6).map((c) => (
              <Avatar key={c.id} name={c.name} hue={c.avatarHue} size={22} />
            ))}
            <span className="ml-1 text-[11.5px] text-[var(--fc-fg-subtle)]">
              +{Math.max(0, contacts.length - 6)} more
            </span>
          </div>
        </StatCard>

        <StatCard
          label="Won this quarter"
          value={formatCurrency(wonValue)}
          delta={22.6}
          deltaLabel={`${deals.filter((d) => d.stage === "won").length} deals closed`}
          icon={<Target className="size-4" />}
          tone="success"
        >
          <div className="mt-3">
            <SparkBars data={[3, 5, 4, 7, 6, 9, 8, 11]} color="var(--color-brand-500)" height={28} />
          </div>
        </StatCard>

        <StatCard
          label="Unread messages"
          value={unreadMessages}
          deltaLabel={`${threads.length} threads · ${students.length} students in pipeline`}
          icon={<MessageSquare className="size-4" />}
          tone="signal"
        >
          <div className="mt-3 flex flex-wrap gap-1.5">
            {threads.slice(0, 4).map((t) => (
              <Badge key={t.id} tone={t.unread ? "brand" : "neutral"}>
                {t.channel}
              </Badge>
            ))}
          </div>
        </StatCard>
      </div>

      {/* ---------------- CHARTS ROW ---------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="fc-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Revenue trend</h2>
              <p className="text-[12px] text-[var(--fc-fg-muted)]">
                Closed-won value per week, this year against last
              </p>
            </div>
            <div className="flex gap-1.5">
              <Badge tone="success">+18.4%</Badge>
              <Badge>Weighted {formatCurrency(weightedValue)}</Badge>
            </div>
          </div>
          <div className="mt-4">
            <AreaChart
              labels={trend.labels}
              height={250}
              series={[
                { name: "This year", data: trend.thisYear, color: "var(--color-brand-500)" },
                { name: "Last year", data: trend.lastYear, color: "var(--color-ink-400)" },
              ]}
            />
          </div>
        </div>

        <div className="fc-card p-5">
          <h2 className="text-[15px] font-semibold">Pipeline by stage</h2>
          <p className="text-[12px] text-[var(--fc-fg-muted)]">
            {openDeals.length} open deals · {formatCurrency(pipelineValue)}
          </p>
          <div className="mt-4 space-y-2.5">
            {stageCounts.map((s) => {
              const meta = stageMeta[s.stage];
              const pct = deals.length ? (s.count / deals.length) * 100 : 0;
              return (
                <div key={s.stage}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </span>
                    <span className="tabular-nums text-[var(--fc-fg-muted)]">
                      {s.count} · {formatCurrency(s.value)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${Math.max(3, pct)}%`, backgroundColor: meta.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------------- OPERATIONS ROW ---------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="fc-card flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Your tasks</h2>
            <Badge tone={urgentTasks.length ? "danger" : "neutral"}>
              {urgentTasks.length} overdue
            </Badge>
          </div>
          <ul className="mt-4 flex-1 space-y-2">
            {openTasks.slice(0, 6).map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2.5"
              >
                <span
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0 rounded-full border-2",
                    t.priority === "high"
                      ? "border-rose-500"
                      : t.priority === "medium"
                      ? "border-amber-500"
                      : "border-[var(--fc-line-strong)]",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{t.title}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--fc-fg-subtle)]">
                    <span>{t.module}</span>
                    {t.due && (
                      <span className={isOverdue(t.due) ? "font-semibold text-rose-500" : ""}>
                        · {isOverdue(t.due) ? "overdue" : relativeTime(t.due)}
                      </span>
                    )}
                  </span>
                </span>
              </li>
            ))}
            {openTasks.length === 0 && (
              <li className="rounded-lg border border-dashed border-[var(--fc-line)] px-3 py-6 text-center text-[13px] text-[var(--fc-fg-muted)]">
                All clear — nothing outstanding.
              </li>
            )}
          </ul>
          <Link
            href="/app/activities"
            className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-brand-500)]"
          >
            All activities
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="fc-card flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Applications due</h2>
            <GraduationCap className="size-4 text-[var(--color-accent-500)]" />
          </div>
          <ul className="mt-4 flex-1 space-y-2.5">
            {upcomingApplications.map((a) => {
              const student = students.find((s) => s.id === a.studentId);
              const days = Math.ceil((+new Date(a.dueDate) - Date.now()) / 86_400_000);
              return (
                <li key={a.id}>
                  <div className="mb-1 flex items-center justify-between text-[12.5px]">
                    <span className="truncate font-medium">{student?.name ?? "Student"}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-semibold tabular-nums",
                        days <= 3 ? "text-rose-500" : "text-[var(--fc-fg-subtle)]",
                      )}
                    >
                      {days <= 0 ? "overdue" : `${days}d`}
                    </span>
                  </div>
                  <Progress
                    value={a.progress}
                    tone={a.progress >= 80 ? "success" : a.progress >= 40 ? "brand" : "signal"}
                  />
                </li>
              );
            })}
          </ul>
          <Link
            href="/app/applications"
            className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-brand-500)]"
          >
            Application tracker
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="fc-card flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Recent activity</h2>
            <ActivityIcon className="size-4 text-[var(--color-brand-500)]" />
          </div>
          <ul className="mt-4 flex-1 space-y-3">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span
                  className={cn(
                    "mt-1 grid size-6 shrink-0 place-items-center rounded-full",
                    a.type === "call"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : a.type === "email"
                      ? "bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]"
                      : a.type === "meeting"
                      ? "bg-violet-500/12 text-violet-500"
                      : a.type === "stage_change"
                      ? "bg-[var(--color-accent-500)]/12 text-[var(--color-accent-500)]"
                      : "bg-[var(--color-signal-500)]/12 text-[var(--color-signal-500)]",
                  )}
                >
                  {a.type === "call" ? (
                    <Clock className="size-3" />
                  ) : a.type === "email" ? (
                    <MessageSquare className="size-3" />
                  ) : a.type === "meeting" ? (
                    <CalendarClock className="size-3" />
                  ) : a.type === "stage_change" ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <FileText className="size-3" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">{a.title}</span>
                  <span className="block text-[11px] text-[var(--fc-fg-subtle)]">
                    {relativeTime(a.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------------- SECONDARY ROW ---------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="fc-card p-5">
          <h2 className="text-[15px] font-semibold">Lead sources</h2>
          <p className="text-[12px] text-[var(--fc-fg-muted)]">
            Where contacts and leads originate
          </p>
          <div className="mt-4">
            <BarChart
              height={190}
              labels={leadSources.map((s) => s.label.split(" ")[0])}
              series={[{ name: "Records", data: leadSources.map((s) => s.value) }]}
            />
          </div>
        </div>

        <div className="fc-card p-5">
          <h2 className="text-[15px] font-semibold">Conversion funnel</h2>
          <p className="text-[12px] text-[var(--fc-fg-muted)]">
            Contact lifecycle stage to stage
          </p>
          <div className="mt-4">
            <FunnelChart stages={funnel} />
          </div>
        </div>

        <div className="fc-card p-5">
          <h2 className="text-[15px] font-semibold">Meetings that convert</h2>
          <p className="text-[12px] text-[var(--fc-fg-muted)]">
            Activity by day and hour
          </p>
          <div className="mt-4">
            <Heatmap rows={heatmapRows} columns={heatmapCols} values={heatmapValues} />
          </div>
          <p className="mt-3 text-[11.5px] text-[var(--fc-fg-subtle)]">
            Best window: Thursday 3pm — 3.1× the average reply rate.
          </p>
        </div>

        <div className="fc-card p-5">
          <h2 className="text-[15px] font-semibold">Account mix</h2>
          <p className="text-[12px] text-[var(--fc-fg-muted)]">Industry distribution</p>
          <div className="mt-4">
            <DonutChart
              size={150}
              thickness={22}
              centerLabel="Accounts"
              centerValue={String(leadSources.length + 4)}
              data={[
                { label: "SaaS & tech", value: 34 },
                { label: "E-commerce", value: 26 },
                { label: "Healthcare", value: 18 },
                { label: "Education", value: 14 },
                { label: "Other", value: 8 },
              ]}
            />
          </div>
        </div>

        <div className="fc-card p-5">
          <h2 className="text-[15px] font-semibold">Agent performance</h2>
          <p className="text-[12px] text-[var(--fc-fg-muted)]">
            Success rate versus volume
          </p>
          <div className="mt-4">
            <RadarChart
              size={200}
              axes={["Speed", "Reliability", "Coverage", "Depth", "Safety", "Cost"]}
              series={[
                { name: "Our agents", data: [78, 94, 72, 81, 88, 69], color: "#3b64f6" },
                { name: "Baseline", data: [64, 58, 61, 70, 55, 74], color: "#94a3b8" },
              ]}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            {topAgents.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2 text-[var(--fc-fg-muted)]">
                  <Bot className="size-3.5" />
                  {a.name}
                </span>
                <span className="tabular-nums font-semibold">
                  {a.successRate}% · {formatNumber(a.runs)} runs
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="fc-card flex flex-col p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Studio &amp; content pulse</h2>
            <Radio className="size-4 text-[var(--color-accent-500)]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { l: "Diagrams", v: diagrams.length, i: WorkflowIcon },
              { l: "Videos", v: videos.length, i: ClapperIcon },
              { l: "Articles", v: articles.length, i: FileText },
              { l: "Campaigns", v: campaigns.length, i: Target },
            ].map((x) => (
              <div
                key={x.l}
                className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
              >
                <x.i className="size-4 text-[var(--color-brand-500)]" />
                <div className="mt-2 font-display text-xl font-bold leading-none">{x.v}</div>
                <div className="mt-1 text-[11px] text-[var(--fc-fg-subtle)]">{x.l}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex-1 space-y-2">
            {posts.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="flex gap-2.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5"
              >
                <Avatar name={p.author} hue={p.avatarHue} size={26} />
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold">{p.author}</div>
                  <div className="line-clamp-2 text-[11px] leading-snug text-[var(--fc-fg-muted)]">
                    {p.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/app/community"
            className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-brand-500)]"
          >
            Community feed
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ---------------- MODULE MAP ---------------- */}
      <div className="fc-card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">Every module</h2>
            <p className="mt-0.5 text-[12px] text-[var(--fc-fg-muted)]">
              {allNavItems.length} workspaces, one shared dataset
            </p>
          </div>
          <Link
            href="/app/builder"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-brand-500)]"
          >
            Build your own dashboard
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          {navGroups.map((g) => (
            <div key={g.id}>
              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
                {g.label}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {g.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3.5 py-3 transition-colors hover:border-[var(--color-brand-400)] hover:bg-[var(--color-brand-500)]/[0.06]"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)] transition-transform group-hover:scale-110">
                      <item.icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold">
                        {item.label}
                      </span>
                      <span className="block truncate text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {item.description}
                      </span>
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-[var(--fc-fg-subtle)] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- EVENTS STRIP ---------------- */}
      <div className="fc-card mt-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">What is coming up</h2>
          <Link
            href="/app/events"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--color-brand-500)]"
          >
            All events
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 3).map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-500)]/10 text-[var(--color-brand-500)]">
                {e.type === "deadline" ? (
                  <Clock className="size-4" />
                ) : e.type === "webinar" ? (
                  <Radio className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{e.title}</div>
                <div className="mt-0.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
                  {relativeTime(e.date)}
                  {e.time && ` · ${e.time}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Tiny local icons to avoid another import block */
function WorkflowIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <path d="M10 6.5h4a3 3 0 0 1 3 3V14" />
    </svg>
  );
}

function ClapperIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 8h18v12H3z" />
      <path d="M3 8 4.5 4h15L21 8" />
      <path d="M8 4v4M13 4v4M18 4v4" />
    </svg>
  );
}
