"use client";

import * as React from "react";
import { cn, formatCompact } from "@/lib/utils";

/* ============================================================
   Lightweight SVG chart primitives.
   Every chart is resolution independent, theme aware and
   hover interactive without any external dependency.
   ============================================================ */

const PALETTE = [
  "#3b64f6",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#0ea5e9",
  "#ec4899",
  "#22c55e",
];

function niceMax(value: number) {
  if (value <= 0) return 10;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const n = value / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * base;
}

function buildPath(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/* ------------------------------- Area chart ------------------------------- */

export interface Series {
  name: string;
  data: number[];
  color?: string;
}

export function AreaChart({
  labels,
  series,
  height = 240,
  format = formatCompact,
  showLegend = true,
  curve = true,
  className,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  format?: (v: number) => string;
  showLegend?: boolean;
  curve?: boolean;
  className?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const W = 720;
  const H = height;
  const pad = { top: 16, right: 16, bottom: 28, left: 44 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.data)));
  const ticks = 4;
  const xAt = (i: number) =>
    pad.left + (labels.length === 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
  const yAt = (v: number) => pad.top + ih - (v / max) * ih;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Area chart"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const ratio = (x - pad.left) / iw;
          const idx = Math.round(ratio * (labels.length - 1));
          setHover(Math.max(0, Math.min(labels.length - 1, idx)));
        }}
      >
        <defs>
          {series.map((s, i) => (
            <linearGradient
              key={i}
              id={`ac-grad-${i}-${s.name.replace(/\W/g, "")}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={s.color ?? PALETTE[i % PALETTE.length]}
                stopOpacity={0.34}
              />
              <stop
                offset="100%"
                stopColor={s.color ?? PALETTE[i % PALETTE.length]}
                stopOpacity={0.02}
              />
            </linearGradient>
          ))}
        </defs>

        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const v = (max / ticks) * i;
          const y = yAt(v);
          return (
            <g key={i}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y}
                y2={y}
                stroke="var(--fc-line)"
                strokeWidth={1}
                strokeDasharray={i === 0 ? undefined : "3 4"}
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[var(--fc-fg-subtle)] text-[10px]"
              >
                {format(v)}
              </text>
            </g>
          );
        })}

        {series.map((s, si) => {
          const color = s.color ?? PALETTE[si % PALETTE.length];
          const pts = s.data.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
          const line = buildPath(pts);
          const area = `${line} L${pts[pts.length - 1]?.x ?? pad.left},${pad.top + ih} L${
            pts[0]?.x ?? pad.left
          },${pad.top + ih} Z`;
          return (
            <g key={s.name}>
              <path d={area} fill={`url(#ac-grad-${si}-${s.name.replace(/\W/g, "")})`} />
              <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hover === i ? 4.5 : 2.4}
                  fill={color}
                  stroke="var(--fc-surface)"
                  strokeWidth={hover === i ? 2 : 0}
                />
              ))}
            </g>
          );
        })}

        {hover !== null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={pad.top}
            y2={pad.top + ih}
            stroke="var(--color-brand-500)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {labels.map((l, i) => (
          <text
            key={l + i}
            x={xAt(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-[var(--fc-fg-subtle)] text-[10px]"
          >
            {l}
          </text>
        ))}
      </svg>

      {showLegend && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {series.map((s, i) => (
            <span
              key={s.name}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--fc-fg-muted)]"
            >
              <span
                className="size-2.5 rounded-[3px]"
                style={{ backgroundColor: s.color ?? PALETTE[i % PALETTE.length] }}
              />
              {s.name}
              {hover !== null && (
                <strong className="font-semibold text-[var(--fc-fg)]">
                  {format(s.data[hover] ?? 0)}
                </strong>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Bar chart ------------------------------- */

export function BarChart({
  labels,
  series,
  height = 240,
  stacked = false,
  format = formatCompact,
  className,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  stacked?: boolean;
  format?: (v: number) => string;
  className?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const W = 720;
  const H = height;
  const pad = { top: 16, right: 16, bottom: 28, left: 44 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  const totals = labels.map((_, i) =>
    stacked
      ? series.reduce((a, s) => a + (s.data[i] ?? 0), 0)
      : Math.max(...series.map((s) => s.data[i] ?? 0)),
  );
  const max = niceMax(Math.max(1, ...totals));
  const groupW = iw / labels.length;
  const barGap = 6;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img">
        {Array.from({ length: 5 }).map((_, i) => {
          const v = (max / 4) * i;
          const y = pad.top + ih - (v / max) * ih;
          return (
            <g key={i}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y}
                y2={y}
                stroke="var(--fc-line)"
                strokeDasharray={i === 0 ? undefined : "3 4"}
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[var(--fc-fg-subtle)] text-[10px]"
              >
                {format(v)}
              </text>
            </g>
          );
        })}

        {labels.map((l, i) => {
          const gx = pad.left + i * groupW;
          const count = series.length;
          const barW = stacked
            ? Math.min(38, groupW * 0.55)
            : (groupW * 0.62 - barGap * (count - 1)) / count;
          let stackY = pad.top + ih;

          return (
            <g
              key={l + i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <rect
                x={gx}
                y={pad.top}
                width={groupW}
                height={ih}
                fill="transparent"
              />
              {series.map((s, si) => {
                const v = s.data[i] ?? 0;
                const h = (v / max) * ih;
                const x = stacked
                  ? gx + (groupW - barW) / 2
                  : gx + groupW * 0.19 + si * (barW + barGap);
                const y = stacked ? stackY - h : pad.top + ih - h;
                if (stacked) stackY -= h;
                return (
                  <rect
                    key={s.name}
                    x={x}
                    y={y}
                    width={Math.max(2, barW)}
                    height={Math.max(0, h)}
                    rx={4}
                    fill={s.color ?? PALETTE[si % PALETTE.length]}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                    style={{ transition: "opacity .18s" }}
                  />
                );
              })}
              <text
                x={gx + groupW / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-[var(--fc-fg-subtle)] text-[10px]"
              >
                {l}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--fc-fg-muted)]">
          <span className="font-semibold text-[var(--fc-fg)]">{labels[hover]}</span>
          {series.map((s, si) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-[3px]"
                style={{ backgroundColor: s.color ?? PALETTE[si % PALETTE.length] }}
              />
              {s.name} · <strong className="text-[var(--fc-fg)]">{format(s.data[hover] ?? 0)}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Donut chart ------------------------------ */

export function DonutChart({
  data,
  size = 190,
  thickness = 26,
  centerLabel,
  centerValue,
  format = (v: number) => String(v),
  className,
}: {
  data: { label: string; value: number; color?: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  format?: (v: number) => string;
  className?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={cn("flex items-center gap-6", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--fc-surface-3)"
          strokeWidth={thickness}
        />
        {data.map((d, i) => {
          const len = (d.value / total) * circumference;
          const el = (
            <circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={d.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - 2)} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            >
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
        {centerValue && (
          <>
            <text
              x={cx}
              y={cy - 2}
              textAnchor="middle"
              className="fill-[var(--fc-fg)] text-[22px] font-semibold"
            >
              {centerValue}
            </text>
            {centerLabel && (
              <text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                className="fill-[var(--fc-fg-subtle)] text-[10px] uppercase tracking-widest"
              >
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: d.color ?? PALETTE[i % PALETTE.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-[var(--fc-fg-muted)]">{d.label}</span>
            <span className="font-semibold tabular-nums">{format(d.value)}</span>
            <span className="w-11 text-right text-xs tabular-nums text-[var(--fc-fg-subtle)]">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------- Sparkline -------------------------------- */

export function Sparkline({
  data,
  color = "var(--color-brand-500)",
  height = 40,
  fill = true,
  className,
}: {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
  className?: string;
}) {
  const W = 120;
  const H = height;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / Math.max(1, data.length - 1)) * W,
    y: H - 3 - ((v - min) / span) * (H - 6),
  }));
  const line = buildPath(pts);
  const id = React.useId().replace(/:/g, "");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      aria-hidden
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${line} L${W},${H} L0,${H} Z`}
            fill={`url(#sp-${id})`}
          />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------- Radar chart ------------------------------ */

export function RadarChart({
  axes,
  series,
  size = 240,
  className,
}: {
  axes: string[];
  series: { name: string; data: number[]; color?: string }[];
  size?: number;
  className?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const n = axes.length;

  const pointAt = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = (value / max) * r;
    return { x: cx + Math.cos(angle) * rad, y: cy + Math.sin(angle) * rad };
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={cn("w-full", className)} role="img">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={axes
            .map((_, i) => {
              const p = pointAt(i, max * ring);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="var(--fc-line)"
          strokeWidth={1}
        />
      ))}
      {axes.map((a, i) => {
        const p = pointAt(i, max);
        return (
          <g key={a}>
            <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--fc-line)" />
            <text
              x={cx + ((p.x - cx) / r) * (r + 20)}
              y={cy + ((p.y - cy) / r) * (r + 20) + 3}
              textAnchor="middle"
              className="fill-[var(--fc-fg-subtle)] text-[9px]"
            >
              {a}
            </text>
          </g>
        );
      })}
      {series.map((s, si) => {
        const color = s.color ?? PALETTE[si % PALETTE.length];
        const pts = s.data.map((v, i) => pointAt(i, v));
        return (
          <g key={s.name}>
            <polygon
              points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={color}
              fillOpacity={0.16}
              stroke={color}
              strokeWidth={2}
            />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.6} fill={color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------------------- Funnel ---------------------------------- */

export function FunnelChart({
  stages,
  className,
}: {
  stages: { label: string; value: number; color?: string }[];
  className?: string;
}) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className={cn("space-y-2.5", className)}>
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = prev ? Math.round((s.value / prev) * 100) : 100;
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium">{s.label}</span>
              <span className="tabular-nums text-[var(--fc-fg-muted)]">
                {s.value.toLocaleString()}
                {prev !== null && (
                  <span className="ml-2 text-[var(--fc-fg-subtle)]">{conv}%</span>
                )}
              </span>
            </div>
            <div className="h-8 w-full overflow-hidden rounded-lg bg-[var(--fc-surface-3)]">
              <div
                className="flex h-full items-center justify-end rounded-lg pr-2.5 transition-[width] duration-700"
                style={{
                  width: `${Math.max(12, pct)}%`,
                  backgroundImage: `linear-gradient(90deg, ${
                    s.color ?? PALETTE[i % PALETTE.length]
                  }cc, ${s.color ?? PALETTE[i % PALETTE.length]})`,
                }}
              >
                <span className="text-[11px] font-bold text-white drop-shadow">
                  {Math.round(pct)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- Heatmap ---------------------------------- */

export function Heatmap({
  rows,
  columns,
  values,
  className,
}: {
  rows: string[];
  columns: string[];
  values: number[][];
  className?: string;
}) {
  const max = Math.max(1, ...values.flat());
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="min-w-max">
        <div className="flex gap-1.5 pb-1.5 pl-24">
          {columns.map((c) => (
            <div
              key={c}
              className="w-8 text-center text-[10px] font-medium text-[var(--fc-fg-subtle)]"
            >
              {c}
            </div>
          ))}
        </div>
        {rows.map((r, ri) => (
          <div key={r} className="mb-1.5 flex items-center gap-1.5">
            <div className="w-24 shrink-0 truncate pr-2 text-right text-[11px] text-[var(--fc-fg-muted)]">
              {r}
            </div>
            {columns.map((c, ci) => {
              const v = values[ri]?.[ci] ?? 0;
              const intensity = v / max;
              return (
                <div
                  key={c}
                  title={`${r} · ${c}: ${v}`}
                  className="h-7 w-8 rounded-[5px] transition-transform hover:scale-110"
                  style={{
                    backgroundColor: `color-mix(in oklab, var(--color-brand-500) ${Math.round(
                      intensity * 92,
                    )}%, var(--fc-surface-3))`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
