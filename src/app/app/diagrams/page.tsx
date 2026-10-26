"use client";

import * as React from "react";
import {
  CircleDot,
  Copy,
  Download,
  Diamond,
  FileCode2,
  Layers,
  Link2,
  MousePointerClick,
  Plus,
  Save,
  Square,
  Trash2,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { DiagramCanvas } from "@/components/studio/DiagramCanvas";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, downloadFile, relativeTime, uid } from "@/lib/utils";
import type { Diagram, DiagramNode } from "@/lib/types";

const nodePalette: {
  type: DiagramNode["type"];
  label: string;
  icon: React.ElementType;
  color: string;
  hint: string;
}[] = [
  { type: "start", label: "Start", icon: CircleDot, color: "#3b64f6", hint: "Round terminal" },
  { type: "process", label: "Process", icon: Square, color: "#14b8a6", hint: "Rounded rectangle" },
  { type: "decision", label: "Decision", icon: Diamond, color: "#f59e0b", hint: "Diamond branch" },
  { type: "data", label: "Data", icon: Layers, color: "#8b5cf6", hint: "Store or record" },
  { type: "actor", label: "Actor", icon: MousePointerClick, color: "#ef4444", hint: "Person or team" },
  { type: "end", label: "End", icon: CircleDot, color: "#22c55e", hint: "Round terminal" },
  { type: "note", label: "Note", icon: FileCode2, color: "#64748b", hint: "Annotation" },
];

const templates: {
  id: string;
  name: string;
  description: string;
  build: () => Pick<Diagram, "nodes" | "edges">;
}[] = [
  {
    id: "blank",
    name: "Blank canvas",
    description: "Start from nothing.",
    build: () => ({ nodes: [], edges: [] }),
  },
  {
    id: "funnel",
    name: "Conversion funnel",
    description: "Signal → score → outreach or nurture → won.",
    build: () => ({
      nodes: [
        { id: "n1", type: "start", label: "First signal", x: 60, y: 220, w: 140, h: 56, color: "#3b64f6" },
        { id: "n2", type: "process", label: "Enrich & score", x: 250, y: 220, w: 160, h: 56, color: "#14b8a6" },
        { id: "n3", type: "decision", label: "Score > 70?", x: 460, y: 215, w: 150, h: 66, color: "#f59e0b" },
        { id: "n4", type: "process", label: "Outreach", x: 660, y: 120, w: 170, h: 56, color: "#8b5cf6" },
        { id: "n5", type: "process", label: "Nurture", x: 660, y: 320, w: 170, h: 56, color: "#64748b" },
        { id: "n6", type: "end", label: "Closed won", x: 880, y: 220, w: 150, h: 56, color: "#22c55e" },
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2" },
        { id: "e2", from: "n2", to: "n3" },
        { id: "e3", from: "n3", to: "n4", label: "yes" },
        { id: "e4", from: "n3", to: "n5", label: "no", dashed: true },
        { id: "e5", from: "n4", to: "n6" },
        { id: "e6", from: "n5", to: "n6", dashed: true },
      ],
    }),
  },
  {
    id: "journey",
    name: "Customer journey",
    description: "Enquiry through to enrolment.",
    build: () => ({
      nodes: [
        { id: "j1", type: "start", label: "Enquiry", x: 60, y: 240, w: 130, h: 52, color: "#3b64f6" },
        { id: "j2", type: "process", label: "Counselling", x: 230, y: 240, w: 140, h: 52, color: "#14b8a6" },
        { id: "j3", type: "process", label: "Documents", x: 410, y: 240, w: 140, h: 52, color: "#f59e0b" },
        { id: "j4", type: "decision", label: "Offer?", x: 590, y: 233, w: 130, h: 66, color: "#f59e0b" },
        { id: "j5", type: "process", label: "Visa", x: 770, y: 150, w: 140, h: 52, color: "#8b5cf6" },
        { id: "j6", type: "end", label: "CAS & enrol", x: 770, y: 330, w: 150, h: 52, color: "#22c55e" },
      ],
      edges: [
        { id: "f1", from: "j1", to: "j2" },
        { id: "f2", from: "j2", to: "j3" },
        { id: "f3", from: "j3", to: "j4" },
        { id: "f4", from: "j4", to: "j5", label: "yes" },
        { id: "f5", from: "j4", to: "j6", label: "accepted" },
      ],
    }),
  },
  {
    id: "system",
    name: "System architecture",
    description: "Clients, services and stores.",
    build: () => ({
      nodes: [
        { id: "s1", type: "actor", label: "Student", x: 60, y: 220, w: 130, h: 60, color: "#3b64f6" },
        { id: "s2", type: "actor", label: "Consultant", x: 60, y: 340, w: 130, h: 60, color: "#14b8a6" },
        { id: "s3", type: "process", label: "CRM service", x: 260, y: 220, w: 160, h: 60, color: "#8b5cf6" },
        { id: "s4", type: "process", label: "Portal", x: 260, y: 340, w: 160, h: 60, color: "#14b8a6" },
        { id: "s5", type: "data", label: "Postgres", x: 480, y: 220, w: 150, h: 60, color: "#f59e0b" },
        { id: "s6", type: "data", label: "Object store", x: 480, y: 340, w: 150, h: 60, color: "#f59e0b" },
        { id: "s7", type: "process", label: "Analytics", x: 690, y: 280, w: 150, h: 60, color: "#ef4444" },
      ],
      edges: [
        { id: "s_e1", from: "s1", to: "s3" },
        { id: "s_e2", from: "s2", to: "s4" },
        { id: "s_e3", from: "s3", to: "s5" },
        { id: "s_e4", from: "s4", to: "s6" },
        { id: "s_e5", from: "s5", to: "s7" },
        { id: "s_e6", from: "s6", to: "s7" },
      ],
    }),
  },
  {
    id: "agent",
    name: "Agent loop",
    description: "Bounded tool-calling cycle.",
    build: () => ({
      nodes: [
        { id: "a1", type: "start", label: "Prompt", x: 80, y: 240, w: 120, h: 52, color: "#3b64f6" },
        { id: "a2", type: "process", label: "Call model", x: 250, y: 240, w: 140, h: 52, color: "#14b8a6" },
        { id: "a3", type: "decision", label: "Tool call?", x: 440, y: 233, w: 140, h: 66, color: "#f59e0b" },
        { id: "a4", type: "process", label: "Run tool", x: 630, y: 240, w: 140, h: 52, color: "#8b5cf6" },
        { id: "a5", type: "process", label: "Verify + return", x: 820, y: 240, w: 170, h: 52, color: "#22c55e" },
      ],
      edges: [
        { id: "a_e1", from: "a1", to: "a2" },
        { id: "a_e2", from: "a2", to: "a3" },
        { id: "a_e3", from: "a3", to: "a4", label: "yes" },
        { id: "a_e4", from: "a3", to: "a5", label: "no" },
        { id: "a_e5", from: "a4", to: "a2", label: "loop", dashed: true },
      ],
    }),
  },
];

export default function DiagramsPage() {
  const diagrams = useStore((s) => s.diagrams);
  const saveDiagram = useStore((s) => s.saveDiagram);
  const removeDiagram = useStore((s) => s.removeDiagram);
  const toast = useToast();

  const [activeId, setActiveId] = React.useState<string | null>(diagrams[0]?.id ?? null);
  const [working, setWorking] = React.useState<Diagram | null>(
    diagrams[0] ? { ...diagrams[0] } : null,
  );
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const [linkFrom, setLinkFrom] = React.useState<string | null>(null);
  const [templateModal, setTemplateModal] = React.useState(false);

  React.useEffect(() => {
    if (!working && diagrams[0]) {
      setWorking({ ...diagrams[0] });
      setActiveId(diagrams[0].id);
    }
  }, [diagrams, working]);

  const node = working?.nodes.find((n) => n.id === selectedNode) ?? null;

  const openDiagram = (d: Diagram) => {
    setWorking({ ...d, nodes: [...d.nodes], edges: [...d.edges] });
    setActiveId(d.id);
    setSelectedNode(null);
  };

  const addNode = (type: DiagramNode["type"], color: string) => {
    if (!working) return;
    const id = uid("n");
    const created: DiagramNode = {
      id,
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      x: 140 + Math.random() * 260,
      y: 120 + Math.random() * 220,
      w: type === "decision" ? 150 : 150,
      h: type === "decision" ? 66 : 56,
      color,
    };
    setWorking({ ...working, nodes: [...working.nodes, created] });
    setSelectedNode(id);
    toast.success("Node added", "Drag it into place, then double-click to rename.");
  };

  const updateNode = (id: string, patch: Partial<DiagramNode>) => {
    if (!working) return;
    setWorking({
      ...working,
      nodes: working.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    });
  };

  const removeNode = (id: string) => {
    if (!working) return;
    setWorking({
      ...working,
      nodes: working.nodes.filter((n) => n.id !== id),
      edges: working.edges.filter((e) => e.from !== id && e.to !== id),
    });
    setSelectedNode(null);
  };

  const handleCanvasClick = (id: string | null) => {
    if (!working) return;
    if (linkFrom && id && linkFrom !== id) {
      setWorking({
        ...working,
        edges: [
          ...working.edges,
          { id: uid("e"), from: linkFrom, to: id, label: undefined },
        ],
      });
      toast.success("Edge created", "Label it in the inspector if you need to.");
      setLinkFrom(null);
      setSelectedNode(id);
      return;
    }
    setSelectedNode(id);
  };

  const save = () => {
    if (!working) return;
    const saved = saveDiagram(working);
    setActiveId(saved.id);
    toast.success("Diagram saved", working.name);
  };

  const exportSvg = () => {
    if (!working) return;
    const width = Math.max(...working.nodes.map((n) => n.x + n.w), 900) + 80;
    const height = Math.max(...working.nodes.map((n) => n.y + n.h), 460) + 80;
    const nodeSvg = working.nodes
      .map((n) => {
        const common = `fill="${n.color}22" stroke="${n.color}" stroke-width="2"`;
        const shape =
          n.type === "decision"
            ? `<polygon points="${n.x + n.w / 2},${n.y} ${n.x + n.w},${n.y + n.h / 2} ${n.x + n.w / 2},${n.y + n.h} ${n.x},${n.y + n.h / 2}" ${common}/>`
            : `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.type === "start" || n.type === "end" ? n.h / 2 : 10}" ${common}/>`;
        return `${shape}<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + 5}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="currentColor">${n.label}</text>`;
      })
      .join("\n  ");
    const edgeSvg = working.edges
      .map((e) => {
        const from = working.nodes.find((n) => n.id === e.from);
        const to = working.nodes.find((n) => n.id === e.to);
        if (!from || !to) return "";
        const x1 = from.x + from.w / 2;
        const y1 = from.y + from.h / 2;
        const x2 = to.x + to.w / 2;
        const y2 = to.y + to.h / 2;
        return `<path d="M${x1},${y1} L${x2},${y2}" stroke="#94a3b8" stroke-width="2" fill="none" ${e.dashed ? 'stroke-dasharray="5 4"' : ""}/>`;
      })
      .join("\n  ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">
  ${edgeSvg}
  ${nodeSvg}
</svg>`;
    downloadFile(`${working.name.toLowerCase().replace(/\s+/g, "-")}.svg`, svg, "image/svg+xml");
    toast.success("SVG exported", working.name);
  };

  const exportMermaid = () => {
    if (!working) return;
    const shapes: Record<string, string> = {
      start: "([",
      end: "([",
      process: "[",
      decision: "{",
      data: "[(",
      actor: "[",
      note: "[",
    };
    const closes: Record<string, string> = {
      start: "])",
      end: "])",
      process: "]",
      decision: "}",
      data: ")]",
      actor: "]",
      note: "]",
    };
    const lines = working.nodes.map(
      (n) => `  ${n.id}${shapes[n.type] ?? "["}${n.label}${closes[n.type] ?? "]"}`,
    );
    const edges = working.edges.map(
      (e) => `  ${e.from} ${e.dashed ? "-.->" : "-->"} ${e.to}${e.label ? `  // ${e.label}` : ""}`,
    );
    const mermaid = `flowchart LR\n${lines.join("\n")}\n${edges.join("\n")}\n`;
    downloadFile(
      `${working.name.toLowerCase().replace(/\s+/g, "-")}.mmd`,
      mermaid,
      "text/plain",
    );
    toast.success("Mermaid exported", "Paste into any Mermaid renderer.");
  };

  return (
    <div className="mx-auto max-w-[1700px]">
      <PageHeader
        eyebrow="Studios"
        title="Diagram designer"
        description="Drag nodes, wire edges, export SVG or Mermaid. Seven templates covering funnels, journeys, systems and agent loops."
        actions={
          <>
            <button onClick={() => setTemplateModal(true)} className="btn btn-secondary btn-sm">
              <Layers className="size-3.5" />
              Templates
            </button>
            <button onClick={save} className="btn btn-primary btn-sm">
              <Save className="size-3.5" />
              Save
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[220px_1fr_260px]">
        {/* ---------- Library + palette ---------- */}
        <div className="space-y-4">
          <div className="fc-card overflow-hidden">
            <div className="border-b border-[var(--fc-line)] px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
              Your diagrams
            </div>
            <ul>
              {diagrams.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => openDiagram(d)}
                    className={cn(
                      "w-full border-b border-[var(--fc-line)] px-3.5 py-2.5 text-left transition-colors",
                      activeId === d.id
                        ? "bg-[var(--color-brand-500)]/[0.09]"
                        : "hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <span className="block truncate text-[12.5px] font-medium">{d.name}</span>
                    <span className="block text-[10.5px] text-[var(--fc-fg-subtle)]">
                      {d.nodes.length} nodes · {relativeTime(d.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setTemplateModal(true)}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold text-[var(--color-brand-500)] transition-colors hover:bg-[var(--fc-surface-2)]"
                >
                  <Plus className="size-3.5" />
                  New diagram
                </button>
              </li>
            </ul>
          </div>

          <div className="fc-card p-3.5">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
              Node palette
            </div>
            <div className="space-y-1.5">
              {nodePalette.map((p) => (
                <button
                  key={p.type}
                  onClick={() => addNode(p.type, p.color)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-2 text-left transition-colors hover:border-[var(--color-brand-400)]"
                >
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-md"
                    style={{ backgroundColor: `${p.color}22`, color: p.color }}
                  >
                    <p.icon className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold">{p.label}</span>
                    <span className="block text-[10px] text-[var(--fc-fg-subtle)]">{p.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Canvas ---------- */}
        <div className="fc-card flex min-h-[560px] flex-col overflow-hidden">
          {working ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
                <input
                  className="min-w-[180px] flex-1 bg-transparent text-[14px] font-semibold outline-none"
                  value={working.name}
                  onChange={(e) => setWorking({ ...working, name: e.target.value })}
                />
                <Badge>{working.nodes.length} nodes</Badge>
                <Badge>{working.edges.length} edges</Badge>
                <button
                  onClick={exportSvg}
                  className="btn btn-secondary btn-sm"
                >
                  <Download className="size-3.5" />
                  SVG
                </button>
                <button onClick={exportMermaid} className="btn btn-secondary btn-sm">
                  <FileCode2 className="size-3.5" />
                  Mermaid
                </button>
                <button
                  onClick={() => {
                    if (!working) return;
                    saveDiagram({ ...working, id: undefined as never, name: `${working.name} copy` });
                    toast.success("Duplicated", "A copy was added to your diagrams.");
                  }}
                  className="btn btn-ghost btn-icon size-8"
                  title="Duplicate"
                >
                  <Copy className="size-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (!activeId) return;
                    removeDiagram(activeId);
                    setWorking(null);
                    setActiveId(null);
                    toast.info("Diagram deleted", working.name);
                  }}
                  className="btn btn-ghost btn-icon size-8 text-rose-500"
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {linkFrom && (
                <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--color-brand-500)]/[0.08] px-4 py-2 text-[12.5px] font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]">
                  <Link2 className="size-3.5" />
                  Click a target node to create the edge.
                  <button
                    onClick={() => setLinkFrom(null)}
                    className="btn btn-ghost btn-sm ml-auto"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="relative flex-1">
                <DiagramCanvas
                  diagram={working}
                  selectedId={selectedNode}
                  onSelect={handleCanvasClick}
                  interactive
                  onNodeMove={(id, x, y) =>
                    setWorking((w) =>
                      w
                        ? {
                            ...w,
                            nodes: w.nodes.map((n) =>
                              n.id === id
                                ? { ...n, x: Math.max(0, x), y: Math.max(0, y) }
                                : n,
                            ),
                          }
                        : w,
                    )
                  }
                  className="h-full min-h-[520px] w-full"
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Workflow className="size-6" />}
              title="No diagram open"
              description="Pick one from the list, or start a new one from a template."
              action={
                <button onClick={() => setTemplateModal(true)} className="btn btn-primary btn-sm">
                  <Plus className="size-3.5" />
                  New diagram
                </button>
              }
            />
          )}
        </div>

        {/* ---------- Inspector ---------- */}
        <div className="space-y-4">
          <div className="fc-card p-4">
            <h2 className="text-[14px] font-semibold">Inspector</h2>
            {!node ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                Select a node to edit its label, colour and shape. Then use{" "}
                <strong>Link from</strong> to wire an edge to another node.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    Label
                  </span>
                  <input
                    className="field"
                    value={node.label}
                    onChange={(e) => updateNode(node.id, { label: e.target.value })}
                  />
                </label>
                <div>
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                    Colour
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["#3b64f6", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#22c55e", "#64748b"].map(
                      (c) => (
                        <button
                          key={c}
                          onClick={() => updateNode(node.id, { color: c })}
                          className={cn(
                            "size-6 rounded-md border-2 transition-transform hover:scale-110",
                            node.color === c
                              ? "border-[var(--fc-fg)]"
                              : "border-transparent",
                          )}
                          style={{ backgroundColor: c }}
                          aria-label={`Set colour ${c}`}
                        />
                      ),
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                      Width
                    </span>
                    <input
                      className="field"
                      type="number"
                      value={node.w}
                      onChange={(e) =>
                        updateNode(node.id, { w: Number(e.target.value) || 150 })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                      Height
                    </span>
                    <input
                      className="field"
                      type="number"
                      value={node.h}
                      onChange={(e) =>
                        updateNode(node.id, { h: Number(e.target.value) || 56 })
                      }
                    />
                  </label>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setLinkFrom(node.id);
                      toast.info("Linking", "Click the target node.");
                    }}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    <Link2 className="size-3.5" />
                    Link from
                  </button>
                  <button
                    onClick={() => removeNode(node.id)}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {working && (
            <div className="fc-card p-4">
              <h2 className="text-[14px] font-semibold">Edges</h2>
              {working.edges.length === 0 ? (
                <p className="mt-2 text-[12.5px] text-[var(--fc-fg-muted)]">
                  No edges yet. Select a node and press “Link from”.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {working.edges.map((e) => {
                    const from = working.nodes.find((n) => n.id === e.from);
                    const to = working.nodes.find((n) => n.id === e.to);
                    return (
                      <li
                        key={e.id}
                        className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5"
                      >
                        <div className="flex items-center gap-1.5 text-[11.5px]">
                          <span className="truncate font-medium">{from?.label}</span>
                          <span className="text-[var(--fc-fg-subtle)]">→</span>
                          <span className="truncate font-medium">{to?.label}</span>
                          <button
                            onClick={() =>
                              setWorking({
                                ...working,
                                edges: working.edges.filter((x) => x.id !== e.id),
                              })
                            }
                            className="ml-auto text-rose-500"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                        <input
                          className="field mt-1.5 h-7 py-0 text-[11.5px]"
                          placeholder="Edge label (yes / no)"
                          value={e.label ?? ""}
                          onChange={(ev) =>
                            setWorking({
                              ...working,
                              edges: working.edges.map((x) =>
                                x.id === e.id ? { ...x, label: ev.target.value } : x,
                              ),
                            })
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Templates ---------- */}
      <Modal
        open={templateModal}
        onClose={() => setTemplateModal(false)}
        title="Start from a template"
        description="Every template is fully editable — nodes, colours, labels and edges."
        size="lg"
        footer={
          <button onClick={() => setTemplateModal(false)} className="btn btn-secondary btn-sm">
            Close
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                const built = t.build();
                const created = saveDiagram({
                  name: t.name,
                  description: t.description,
                  template: t.id,
                  nodes: built.nodes,
                  edges: built.edges,
                });
                setWorking({ ...created });
                setActiveId(created.id);
                setTemplateModal(false);
                toast.success("Diagram created", t.name);
              }}
              className="fc-card fc-card-hover p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Workflow className="size-4 text-[var(--color-brand-500)]" />
                <span className="text-[14px] font-semibold">{t.name}</span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-[var(--fc-fg-muted)]">{t.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-500)]">
                Use template
                <Plus className="size-3" />
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
