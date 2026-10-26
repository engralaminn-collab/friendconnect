"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";
import type { Stage } from "@/lib/types";

/* ---------------------------------- Badge --------------------------------- */

const badgeTones = {
  neutral: "bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)] border-[var(--fc-line)]",
  brand: "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800",
  accent: "bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-900/40 dark:text-accent-300 dark:border-accent-800",
  signal: "bg-signal-400/15 text-signal-600 border-signal-400/30 dark:text-signal-300",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
  violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span className={cn("chip", badgeTones[tone], className)}>
      {dot && (
        <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      )}
      {children}
    </span>
  );
}

export const stageMeta: Record<
  Stage,
  { label: string; tone: BadgeTone; color: string }
> = {
  lead: { label: "Lead", tone: "neutral", color: "#94a3b8" },
  qualified: { label: "Qualified", tone: "accent", color: "#14b8a6" },
  proposal: { label: "Proposal", tone: "brand", color: "#3b64f6" },
  negotiation: { label: "Negotiation", tone: "violet", color: "#8b5cf6" },
  won: { label: "Won", tone: "success", color: "#22c55e" },
  lost: { label: "Lost", tone: "danger", color: "#ef4444" },
};

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const meta = stageMeta[stage];
  return (
    <Badge tone={meta.tone} className={className} dot>
      {meta.label}
    </Badge>
  );
}

/* --------------------------------- Avatar --------------------------------- */

export function Avatar({
  name,
  hue = 220,
  size = 36,
  className,
  ring,
}: {
  name: string;
  hue?: number;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
        ring && "ring-2 ring-[var(--fc-surface)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.36),
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 72% 52%), hsl(${(hue + 42) % 360} 74% 44%))`,
      }}
      title={name}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
  size = 28,
}: {
  people: { name: string; avatarHue: number }[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((p, i) => (
          <Avatar key={`${p.name}-${i}`} name={p.name} hue={p.avatarHue} size={size} ring />
        ))}
      </div>
      {rest > 0 && (
        <span className="ml-2 text-xs font-medium text-[var(--fc-fg-subtle)]">
          +{rest}
        </span>
      )}
    </div>
  );
}

/* -------------------------------- Progress -------------------------------- */

export function Progress({
  value,
  tone = "brand",
  className,
  height = 6,
}: {
  value: number;
  tone?: "brand" | "accent" | "success" | "signal" | "danger";
  className?: string;
  height?: number;
}) {
  const colors = {
    brand: "var(--color-brand-500)",
    accent: "var(--color-accent-500)",
    success: "#22c55e",
    signal: "var(--color-signal-500)",
    danger: "#ef4444",
  };
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-[var(--fc-surface-3)]", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundImage:
            tone === "brand"
              ? "linear-gradient(90deg, var(--color-brand-500), var(--color-accent-500))"
              : undefined,
          backgroundColor: colors[tone],
        }}
      />
    </div>
  );
}

/* --------------------------------- Kbd ----------------------------------- */

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--fc-line)] bg-[var(--fc-surface-3)] px-1.5 font-mono text-[10px] font-semibold text-[var(--fc-fg-muted)]">
      {children}
    </kbd>
  );
}

/* ------------------------------ Empty state ------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 grid size-12 place-items-center rounded-xl bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm text-[var(--fc-fg-muted)]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------------------- Section heading ----------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-500)]">
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--fc-fg-muted)]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------- Toggle --------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-[var(--fc-fg-muted)]">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-[var(--color-brand-500)]" : "bg-[var(--fc-surface-3)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

/* --------------------------------- Meter --------------------------------- */

export function Meter({
  value,
  max = 100,
  label,
  suffix,
  color,
}: {
  value: number;
  max?: number;
  label?: string;
  suffix?: string;
  color?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="font-medium text-[var(--fc-fg-muted)]">{label}</span>
          <span className="font-semibold tabular-nums">
            {value}
            {suffix}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, backgroundColor: color ?? "var(--color-brand-500)" }}
        />
      </div>
    </div>
  );
}

/* ------------------------------ Spark bars -------------------------------- */

export function SparkBars({
  data,
  color = "var(--color-brand-500)",
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} aria-hidden>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm opacity-80 transition-opacity hover:opacity-100"
          style={{
            height: `${Math.max(4, (v / max) * 100)}%`,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}
