"use client";

import * as React from "react";
import type { Diagram, DiagramEdge, DiagramNode } from "@/lib/types";
import { cn } from "@/lib/utils";

const NODE_W = 160;
const NODE_H = 56;

export function nodeShape(node: DiagramNode) {
  const { x, y, w, h } = node;
  switch (node.type) {
    case "start":
    case "end":
      return { rx: h / 2, ry: h / 2 };
    case "decision":
      return {
        points: `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`,
      };
    case "data":
      return { rx: 6, ry: 6, skew: true };
    case "actor":
      return { rx: 4, ry: 16 };
    default:
      return { rx: 10, ry: 10 };
  }
}

export function anchorPoint(node: DiagramNode, toward: { x: number; y: number }) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (Math.abs(dx) > Math.abs(dy)) {
    return { x: dx > 0 ? node.x + node.w : node.x, y: cy };
  }
  return { x: cx, y: dy > 0 ? node.y + node.h : node.y };
}

/** Builds a smooth cubic path between two nodes. */
export function edgePath(from: DiagramNode, to: DiagramNode) {
  const a = anchorPoint(from, { x: to.x + to.w / 2, y: to.y + to.h / 2 });
  const b = anchorPoint(to, { x: from.x + from.w / 2, y: from.y + from.h / 2 });
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45);
  return `M${a.x},${a.y} C${a.x + (b.x > a.x ? dx : -dx)},${a.y} ${
    b.x - (b.x > a.x ? dx : -dx)
  },${b.y} ${b.x},${b.y}`;
}

export function DiagramCanvas({
  diagram,
  selectedId,
  onSelect,
  onNodeMove,
  className,
  interactive = false,
}: {
  diagram: Diagram;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onNodeMove?: (id: string, x: number, y: number) => void;
  className?: string;
  interactive?: boolean;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = React.useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [view, setView] = React.useState({ x: 0, y: 0, k: 1 });

  const bounds = React.useMemo(() => {
    const maxX = Math.max(
      ...diagram.nodes.map((n) => n.x + n.w),
      900,
    );
    const maxY = Math.max(
      ...diagram.nodes.map((n) => n.y + n.h),
      460,
    );
    return { w: maxX + 80, h: maxY + 80 };
  }, [diagram.nodes]);

  const toSvg = React.useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / view.k,
        y: (clientY - rect.top) / view.k,
      };
    },
    [view.k],
  );

  React.useEffect(() => {
    if (!dragging || !onNodeMove) return;
    const onMove = (e: MouseEvent) => {
      const p = toSvg(e.clientX, e.clientY);
      onNodeMove(dragging.id, p.x - dragging.offsetX, p.y - dragging.offsetY);
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, onNodeMove, toSvg]);

  const nodeById = (id: string) => diagram.nodes.find((n) => n.id === id);

  const renderEdge = (edge: DiagramEdge) => {
    const from = nodeById(edge.from);
    const to = nodeById(edge.to);
    if (!from || !to) return null;
    const d = edgePath(from, to);
    const midX = (from.x + from.w / 2 + to.x + to.w / 2) / 2;
    const midY = (from.y + from.h / 2 + to.y + to.h / 2) / 2;
    return (
      <g key={edge.id}>
        <path
          d={d}
          fill="none"
          stroke="var(--fc-fg-subtle)"
          strokeWidth={1.75}
          strokeDasharray={edge.dashed ? "5 4" : undefined}
          markerEnd="url(#fc-arrow)"
          className="fc-edge"
        />
        {edge.label && (
          <g>
            <rect
              x={midX - 22}
              y={midY - 10}
              width={44}
              height={19}
              rx={9}
              fill="var(--fc-surface)"
              stroke="var(--fc-line)"
            />
            <text
              x={midX}
              y={midY + 3.5}
              textAnchor="middle"
              className="fill-[var(--fc-fg-muted)] text-[10px] font-semibold"
            >
              {edge.label}
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderNode = (node: DiagramNode) => {
    const shape = nodeShape(node);
    const selected = selectedId === node.id;
    const common = {
      fill: `color-mix(in oklab, ${node.color} 16%, var(--fc-surface))`,
      stroke: node.color,
      strokeWidth: selected ? 2.5 : 1.75,
    };

    return (
      <g
        key={node.id}
        className={cn(interactive && "cursor-grab", dragging?.id === node.id && "cursor-grabbing")}
        onMouseDown={(e) => {
          if (!interactive) return;
          const p = toSvg(e.clientX, e.clientY);
          setDragging({
            id: node.id,
            offsetX: p.x - node.x,
            offsetY: p.y - node.y,
          });
          onSelect?.(node.id);
        }}
        onClick={() => onSelect?.(node.id)}
      >
        {selected && interactive && (
          <rect
            x={node.x - 5}
            y={node.y - 5}
            width={node.w + 10}
            height={node.h + 10}
            rx={12}
            fill="none"
            stroke={node.color}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.7}
          />
        )}
        {shape.points ? (
          <polygon points={shape.points} {...common} />
        ) : (
          <rect x={node.x} y={node.y} width={node.w} height={node.h} {...common} rx={shape.rx} ry={shape.ry} />
        )}
        <text
          x={node.x + node.w / 2}
          y={node.y + node.h / 2 + 4}
          textAnchor="middle"
          className="fill-[var(--fc-fg)] text-[12px] font-semibold"
          style={{ pointerEvents: "none" }}
        >
          {node.label}
        </text>
      </g>
    );
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${bounds.w} ${bounds.h}`}
        className="h-full w-full touch-none select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelect?.(null);
        }}
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--fc-grid) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          transform: `scale(${view.k})`,
          transformOrigin: "0 0",
        }}
      >
        <defs>
          <marker
            id="fc-arrow"
            markerWidth="9"
            markerHeight="9"
            refX="7.5"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L8,3.5 L0,7 Z" fill="var(--fc-fg-subtle)" />
          </marker>
        </defs>
        {diagram.edges.map(renderEdge)}
        {diagram.nodes.map(renderNode)}
      </svg>

      {interactive && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)]/90 p-1 backdrop-blur">
          {[
            { l: "−", k: 0.8 },
            { l: "100%", k: 1 },
            { l: "+", k: 1.25 },
          ].map((b, i) => (
            <button
              key={i}
              onClick={() => setView((v) => ({ ...v, k: b.k }))}
              className="btn btn-ghost btn-sm px-2"
            >
              {b.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { NODE_W, NODE_H };
