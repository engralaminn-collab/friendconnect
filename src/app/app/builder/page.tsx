"use client";

import * as React from "react";
import {
  AlignLeft,
  BarChart3,
  Copy,
  Database,
  GripVertical,
  Hash,
  LineChart,
  PieChart,
  Plus,
  Save,
  Table2,
  Trash2,
  Filter,
  Rows3,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { AreaChart, BarChart, DonutChart, FunnelChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, uid } from "@/lib/utils";
import type { DashBoard, DashWidget, WidgetKind } from "@/lib/types";

const WIDGET_META: {
  kind: WidgetKind;
  label: string;
  icon: React.ElementType;
  hint: string;
  w: number;
  h: number;
}[] = [
  {
    kind: "metric",
    label: "Metric",
    icon: Hash,
    hint: "One headline number with a delta",
    w: 1,
    h: 1,
  },
  {
    kind: "bar",
    label: "Bar chart",
    icon: BarChart3,
    hint: "Compare a value across categories",
    w: 2,
    h: 2,
  },
  {
    kind: "line",
    label: "Area chart",
    icon: LineChart,
    hint: "A value over time",
    w: 2,
    h: 2,
  },
  {
    kind: "donut",
    label: "Donut",
    icon: PieChart,
    hint: "Share of a whole",
    w: 1,
    h: 2,
  },
  {
    kind: "table",
    label: "Table",
    icon: Table2,
    hint: "Top rows from a dataset",
    w: 2,
    h: 2,
  },
  {
    kind: "funnel",
    label: "Funnel",
    icon: Filter,
    hint: "Stage-by-stage drop-off",
    w: 2,
    h: 2,
  },
  {
    kind: "text",
    label: "Text",
    icon: AlignLeft,
    hint: "A note or a headline",
    w: 2,
    h: 1,
  },
];

export default function BuilderPage() {
  const contacts = useStore((s) => s.contacts);
  const deals = useStore((s) => s.deals);
  const companies = useStore((s) => s.companies);
  const leads = useStore((s) => s.leads);
  const students = useStore((s) => s.students);
  const applications = useStore((s) => s.applications);
  const universities = useStore((s) => s.universities);
  const articles = useStore((s) => s.articles);
  const campaigns = useStore((s) => s.campaigns);
  const agents = useStore((s) => s.agents);

  const toast = useToast();
  const [boards, setBoards] = React.useState<DashBoard[]>([]);
  const [name, setName] = React.useState("Untitled dashboard");
  const [widgets, setWidgets] = React.useState<DashWidget[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [dragKind, setDragKind] = React.useState<WidgetKind | null>(null);
  const [saveModal, setSaveModal] = React.useState(false);
  const [saveName, setSaveName] = React.useState("Untitled dashboard");

  const selected = widgets.find((w) => w.id === selectedId) ?? null;

  /* ---------------- dataset resolution ---------------- */

  const datasets = React.useMemo(() => {
    const stageCounts = ["lead", "qualified", "proposal", "negotiation", "won", "lost"].map(
      (st) => ({
        label: st,
        value: contacts.filter((c) => c.stage === st).length,
      }),
    );

    const dealStages = ["lead", "qualified", "proposal", "negotiation", "won", "lost"].map(
      (st) => ({
        label: st,
        value: deals.filter((d) => d.stage === st).length,
      }),
    );

    return {
      contacts: {
        label: "Contacts",
        rows: contacts.map((c) => ({
          name: c.name,
          company: c.company ?? "—",
          stage: c.stage,
          value: c.value ?? 0,
        })),
        value: contacts.length,
        series: [
          { label: "Leads", value: contacts.filter((c) => c.stage === "lead").length },
          { label: "Qualified", value: contacts.filter((c) => c.stage === "qualified").length },
          { label: "Proposal", value: contacts.filter((c) => c.stage === "proposal").length },
          { label: "Won", value: contacts.filter((c) => c.stage === "won").length },
        ],
        time: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
          label: m,
          value: 40 + i * 9 + (i % 2 ? 6 : 0),
        })),
      },
      deals: {
        label: "Deals",
        rows: deals.map((d) => ({
          name: d.title,
          company: d.tags.join(", ") || "—",
          stage: d.stage,
          value: d.value,
        })),
        value: deals.length,
        series: dealStages.filter((s) => s.label !== "lost"),
        time: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
          label: m,
          value: 90 + i * 14 + (i % 2 ? 8 : 0),
        })),
      },
      companies: {
        label: "Companies",
        rows: companies.map((c) => ({
          name: c.name,
          company: c.industry ?? "—",
          stage: c.size ?? "—",
          value: c.revenue ?? 0,
        })),
        value: companies.length,
        series: Array.from(new Set(companies.map((c) => c.industry ?? "Other"))).map(
          (i) => ({
            label: i,
            value: companies.filter((c) => (c.industry ?? "Other") === i).length,
          }),
        ),
        time: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
          label: m,
          value: 12 + i * 3,
        })),
      },
      leads: {
        label: "Leads",
        rows: leads.map((l) => ({
          name: l.name,
          company: l.company ?? "—",
          stage: l.status,
          value: l.score ?? 0,
        })),
        value: leads.length,
        series: ["new", "enriched", "scored", "qualified", "nurture"].map((s) => ({
          label: s,
          value: leads.filter((l) => l.status === s).length,
        })),
        time: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
          label: m,
          value: 22 + i * 6,
        })),
      },
      students: {
        label: "Students",
        rows: students.map((s) => ({
          name: s.name,
          company: s.country ?? "—",
          stage: s.status,
          value: s.budget ?? 0,
        })),
        value: students.length,
        series: Array.from(new Set(students.map((s) => s.country ?? "Other"))).map((c) => ({
          label: c,
          value: students.filter((s) => (s.country ?? "Other") === c).length,
        })),
        time: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
          label: m,
          value: 8 + i * 2,
        })),
      },
      applications: {
        label: "Applications",
        rows: applications.map((a) => ({
          name: students.find((s) => s.id === a.studentId)?.name ?? "—",
          company: universities.find((u) => u.id === a.universityId)?.name ?? "—",
          stage: a.status,
          value: a.progress ?? 0,
        })),
        value: applications.length,
        series: ["drafting", "documents", "submitted", "interview", "offer"].map((s) => ({
          label: s,
          value: applications.filter((a) => a.status === s).length,
        })),
        time: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
          label: m,
          value: 14 + i * 5,
        })),
      },
      articles: {
        label: "Articles",
        rows: articles.map((a) => ({
          name: a.title,
          company: a.keywords.join(", ") || "—",
          stage: a.status,
          value: a.views ?? 0,
        })),
        value: articles.length,
        series: ["draft", "review", "published"].map((s) => ({
          label: s,
          value: articles.filter((a) => a.status === s).length,
        })),
        time: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
          label: m,
          value: 5 + i * 2,
        })),
      },
      campaigns: {
        label: "Campaigns",
        rows: campaigns.map((c) => ({
          name: c.name,
          company: c.channel,
          stage: c.status,
          value: c.sent ?? 0,
        })),
        value: campaigns.length,
        series: ["email", "social", "ads", "webinar", "sms"].map((ch) => ({
          label: ch,
          value: campaigns.filter((c) => c.channel === ch).length,
        })),
        time: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
          label: m,
          value: 3 + i * 2,
        })),
      },
      agents: {
        label: "Agents",
        rows: agents.map((a) => ({
          name: a.name,
          company: a.role,
          stage: a.model,
          value: a.runs,
        })),
        value: agents.length,
        series: ["success", "error"].map((s) => ({
          label: s,
          value: s === "success" ? 5 : 1,
        })),
        time: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
          label: m,
          value: 10 + i * 4,
        })),
      },
    } as Record<
      string,
      {
        label: string;
        rows: { name: string; company: string; stage: string; value: number }[];
        value: number;
        series: { label: string; value: number }[];
        time: { label: string; value: number }[];
      }
    >;
  }, [contacts, deals, companies, leads, students, applications, universities, articles, campaigns, agents]);

  const SOURCES = Object.keys(datasets);

  /* ---------------- widget rendering ---------------- */

  const renderWidget = (w: DashWidget) => {
    const ds = datasets[w.source] ?? datasets.contacts;
    switch (w.kind) {
      case "metric":
        return (
          <div className="flex h-full flex-col justify-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
              {w.title}
            </div>
            <div className="mt-1 font-display text-[30px] font-bold leading-none tabular-nums">
              {ds.value.toLocaleString()}
            </div>
            <div className="mt-1.5 text-[11.5px] text-[var(--fc-fg-muted)]">
              {ds.label} · {w.metric}
            </div>
          </div>
        );
      case "bar":
        return (
          <BarChart
            height={Math.max(120, w.h * 60 - 44)}
            labels={ds.series.map((s) => s.label)}
            series={[{ name: ds.label, data: ds.series.map((s) => s.value) }]}
          />
        );
      case "line":
        return (
          <AreaChart
            height={Math.max(120, w.h * 60 - 44)}
            labels={ds.time.map((t) => t.label)}
            series={[{ name: ds.label, data: ds.time.map((t) => t.value) }]}
            showLegend={false}
          />
        );
      case "donut":
        return (
          <DonutChart
            size={Math.min(w.w * 130, 170)}
            thickness={22}
            centerLabel={ds.label}
            centerValue={String(ds.value)}
            data={ds.series.slice(0, 6)}
          />
        );
      case "funnel":
        return (
          <FunnelChart
            stages={ds.series.slice(0, 5).map((s) => ({
              label: s.label,
              value: s.value,
            }))}
          />
        );
      case "table":
        return (
          <div className="h-full overflow-hidden">
            <table className="w-full text-left text-[11.5px]">
              <thead className="text-[10px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                <tr>
                  <th className="pb-1.5 font-semibold">Name</th>
                  <th className="pb-1.5 font-semibold">{w.metric || "Detail"}</th>
                  <th className="pb-1.5 text-right font-semibold">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--fc-line)]">
                {ds.rows.slice(0, 6).map((r, i) => (
                  <tr key={i}>
                    <td className="max-w-[120px] truncate py-1 font-medium">{r.name}</td>
                    <td className="max-w-[100px] truncate py-1 text-[var(--fc-fg-muted)]">
                      {r.company}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {r.value.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "text":
        return (
          <div className="flex h-full flex-col justify-center">
            <h3 className="text-[16px] font-semibold leading-snug">{w.title}</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              {w.note || "Add a note in the inspector to explain what this panel is for."}
            </p>
          </div>
        );
    }
  };

  /* ---------------- interactions ---------------- */

  const addWidget = (kind: WidgetKind, x = 0, y = 0) => {
    const meta = WIDGET_META.find((m) => m.kind === kind)!;
    const id = uid("w");
    const w: DashWidget = {
      id,
      kind,
      title:
        kind === "text"
          ? "A note worth reading"
          : `${meta.label} · ${datasets.contacts.label}`,
      x,
      y,
      w: meta.w,
      h: meta.h,
      source: "contacts",
      metric: "Total records",
    };
    setWidgets((ws) => [...ws, w]);
    setSelectedId(id);
  };

  const updateWidget = (id: string, patch: Partial<DashWidget>) =>
    setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const removeWidget = (id: string) => {
    setWidgets((ws) => ws.filter((w) => w.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateWidget = (id: string) => {
    setWidgets((ws) => {
      const src = ws.find((w) => w.id === id);
      if (!src) return ws;
      const copy = { ...src, id: uid("w"), x: src.x + 1, y: src.y + 1 };
      setSelectedId(copy.id);
      return [...ws, copy];
    });
  };

  const save = () => {
    const board: DashBoard = {
      id: uid("db"),
      name: saveName.trim() || "Untitled dashboard",
      description: `${widgets.length} widgets`,
      widgets,
      updatedAt: new Date().toISOString(),
    };
    setBoards((b) => [board, ...b]);
    setSaveModal(false);
    toast.success("Dashboard saved", board.name);
  };

  const load = (b: DashBoard) => {
    setWidgets(b.widgets);
    setName(b.name);
    setSelectedId(null);
    toast.info("Dashboard loaded", b.name);
  };

  const COLS = 6;
  const rowH = 60;

  return (
    <div className="mx-auto max-w-[1700px]">
      <PageHeader
        eyebrow="Engineering"
        title="Dashboard builder"
        description="Drag widgets onto a grid, point them at any dataset, and save the result. No code, no config file — the same canvas every time."
        actions={
          <>
            <button onClick={() => setSaveModal(true)} className="btn btn-secondary btn-sm">
              <Save className="size-3.5" />
              Save dashboard
            </button>
            <button onClick={() => addWidget("metric")} className="btn btn-primary btn-sm">
              <Plus className="size-3.5" />
              Add widget
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Datasets"
          value={SOURCES.length}
          deltaLabel="connectable sources"
          icon={<Database className="size-4" />}
        />
        <StatCard
          label="Widgets"
          value={widgets.length}
          deltaLabel="on this canvas"
          icon={<Rows3 className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Saved dashboards"
          value={boards.length}
          deltaLabel="in this browser"
          icon={<Save className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Widget types"
          value={WIDGET_META.length}
          deltaLabel="metric, chart, table, funnel, note"
          icon={<BarChart3 className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[210px_1fr_280px]">
        {/* ---------------- Palette ---------------- */}
        <aside className="space-y-4">
          <div className="fc-card overflow-hidden">
            <div className="border-b border-[var(--fc-line)] px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
              Widgets
            </div>
            <ul className="p-2">
              {WIDGET_META.map((m) => (
                <li key={m.kind}>
                  <button
                    draggable
                    onDragStart={() => setDragKind(m.kind)}
                    onDragEnd={() => setDragKind(null)}
                    onClick={() => addWidget(m.kind)}
                    className="flex w-full cursor-grab items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--fc-surface-2)] active:cursor-grabbing"
                  >
                    <GripVertical className="mt-0.5 size-3.5 shrink-0 text-[var(--fc-fg-subtle)]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <m.icon className="size-3.5 text-[var(--color-brand-500)]" />
                        <span className="text-[12.5px] font-semibold">{m.label}</span>
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-snug text-[var(--fc-fg-subtle)]">
                        {m.hint}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {boards.length > 0 && (
            <div className="fc-card overflow-hidden">
              <div className="border-b border-[var(--fc-line)] px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                Saved
              </div>
              <ul>
                {boards.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => load(b)}
                      className="w-full border-b border-[var(--fc-line)] px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--fc-surface-2)]"
                    >
                      <span className="block truncate text-[12.5px] font-semibold">
                        {b.name}
                      </span>
                      <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {b.widgets.length} widgets
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* ---------------- Canvas ---------------- */}
        <div className="fc-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
            <input
              className="min-w-[180px] flex-1 bg-transparent text-[14.5px] font-semibold outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Badge>{widgets.length} widgets</Badge>
            <button
              onClick={() => {
                setWidgets([]);
                setSelectedId(null);
                toast.info("Canvas cleared", "All widgets removed.");
              }}
              className="btn btn-ghost btn-sm"
            >
              Clear
            </button>
          </div>

          {widgets.length === 0 ? (
            <div className="px-6 py-24">
              <EmptyState
                icon={<BarChart3 className="size-6" />}
                title="Empty canvas"
                description="Drag a widget from the left, or click one to drop it in. Then point it at a dataset."
                action={
                  <button onClick={() => addWidget("metric")} className="btn btn-primary btn-sm">
                    <Plus className="size-3.5" />
                    Add the first widget
                  </button>
                }
              />
            </div>
          ) : (
            <div
              className={cn(
                "fc-scroll-thin relative overflow-x-auto bg-[var(--fc-surface-2)] p-4",
                dragKind && "ring-2 ring-inset ring-[var(--color-brand-500)]/40",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragKind) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const col = Math.max(
                  0,
                  Math.min(
                    COLS - 1,
                    Math.floor(((e.clientX - rect.left) / rect.width) * COLS),
                  ),
                );
                const row = Math.max(
                  0,
                  Math.floor((e.clientY - rect.top + e.currentTarget.scrollTop) / rowH),
                );
                addWidget(dragKind, col, row);
                setDragKind(null);
              }}
            >
              <div
                className="relative"
                style={{
                  minWidth: 720,
                  minHeight: Math.max(360, (maxRow() + 2) * rowH),
                }}
              >
                {/* grid */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, var(--fc-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--fc-grid) 1px, transparent 1px)",
                    backgroundSize: `${100 / COLS}% ${rowH}px`,
                  }}
                />

                {widgets.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => setSelectedId(w.id)}
                    className={cn(
                      "absolute overflow-hidden rounded-xl border bg-[var(--fc-surface)] p-3 transition-shadow",
                      selectedId === w.id
                        ? "border-[var(--color-brand-500)] shadow-[0_0_0_2px_var(--color-brand-500)]/25"
                        : "border-[var(--fc-line)] hover:border-[var(--color-brand-400)]",
                    )}
                    style={{
                      left: `calc(${(w.x / COLS) * 100}% + 4px)`,
                      top: w.y * rowH + 4,
                      width: `calc(${(w.w / COLS) * 100}% - 8px)`,
                      height: w.h * rowH - 8,
                    }}
                  >
                    {w.kind !== "text" && w.kind !== "metric" && (
                      <div className="mb-1 truncate text-[11.5px] font-semibold text-[var(--fc-fg-muted)]">
                        {w.title}
                      </div>
                    )}
                    <div className={cn(w.kind === "metric" ? "h-full" : "h-[calc(100%-20px)]")}>
                      {renderWidget(w)}
                    </div>
                    {selectedId === w.id && (
                      <div className="absolute right-1.5 top-1.5 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateWidget(w.id);
                          }}
                          className="grid size-6 place-items-center rounded-md bg-[var(--fc-surface)]/90 text-[var(--fc-fg-muted)] shadow-sm backdrop-blur hover:text-[var(--fc-fg)]"
                        >
                          <Copy className="size-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeWidget(w.id);
                          }}
                          className="grid size-6 place-items-center rounded-md bg-[var(--fc-surface)]/90 text-rose-500 shadow-sm backdrop-blur"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---------------- Inspector ---------------- */}
        <aside className="fc-card h-fit overflow-hidden">
          <div className="border-b border-[var(--fc-line)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
            Inspector
          </div>
          {!selected ? (
            <div className="px-4 py-12 text-center">
              <p className="text-[13px] font-semibold">Nothing selected</p>
              <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
                Click a widget on the canvas to edit it.
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold">Title</span>
                <input
                  className="field"
                  value={selected.title}
                  onChange={(e) =>
                    updateWidget(selected.id, { title: e.target.value })
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold">Dataset</span>
                <select
                  className="field"
                  value={selected.source}
                  onChange={(e) =>
                    updateWidget(selected.id, { source: e.target.value })
                  }
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {datasets[s].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold">Metric label</span>
                <input
                  className="field"
                  value={selected.metric}
                  onChange={(e) =>
                    updateWidget(selected.id, { metric: e.target.value })
                  }
                />
              </label>

              {selected.kind === "text" && (
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold">Note</span>
                  <textarea
                    className="field min-h-[90px] resize-y text-[12.5px]"
                    value={selected.note ?? ""}
                    onChange={(e) =>
                      updateWidget(selected.id, { note: e.target.value })
                    }
                  />
                </label>
              )}

              <div>
                <span className="mb-1.5 block text-[12px] font-semibold">Size</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                      Width (cols)
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={COLS}
                      className="field"
                      value={selected.w}
                      onChange={(e) =>
                        updateWidget(selected.id, {
                          w: Math.max(1, Math.min(COLS, Number(e.target.value))),
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                      Height (rows)
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      className="field"
                      value={selected.h}
                      onChange={(e) =>
                        updateWidget(selected.id, {
                          h: Math.max(1, Math.min(6, Number(e.target.value))),
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[12px] font-semibold">Position</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                      Column
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={COLS - 1}
                      className="field"
                      value={selected.x}
                      onChange={(e) =>
                        updateWidget(selected.id, {
                          x: Math.max(0, Math.min(COLS - 1, Number(e.target.value))),
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10.5px] text-[var(--fc-fg-subtle)]">
                      Row
                    </span>
                    <input
                      type="number"
                      min={0}
                      className="field"
                      value={selected.y}
                      onChange={(e) =>
                        updateWidget(selected.id, {
                          y: Math.max(0, Number(e.target.value)),
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              <button
                onClick={() => removeWidget(selected.id)}
                className="btn btn-ghost btn-sm w-full text-rose-500"
              >
                <Trash2 className="size-3.5" />
                Remove widget
              </button>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={saveModal}
        onClose={() => setSaveModal(false)}
        title="Save dashboard"
        description="Saved dashboards live in this browser until you clear site data."
        size="sm"
        footer={
          <>
            <button onClick={() => setSaveModal(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={save} className="btn btn-primary btn-sm">
              <Save className="size-3.5" />
              Save
            </button>
          </>
        }
      >
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold">Name</span>
          <input
            className="field"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
          />
        </label>
      </Modal>
    </div>
  );

  function maxRow() {
    return widgets.reduce((a, w) => Math.max(a, w.y + w.h), 0);
  }
}
