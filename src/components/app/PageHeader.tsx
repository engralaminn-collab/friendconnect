"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-500)]">
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[26px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
        active
          ? "bg-[var(--color-brand-500)] text-white shadow-[0_6px_16px_-8px_rgba(59,100,246,.9)]"
          : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-3)] hover:text-[var(--fc-fg)]",
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "rounded px-1 text-[10.5px] tabular-nums",
            active ? "bg-white/20" : "bg-[var(--fc-surface-3)]",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  tone = "brand",
  children,
}: {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  tone?: "brand" | "accent" | "success" | "signal" | "violet";
  children?: React.ReactNode;
}) {
  const tones = {
    brand: "text-[var(--color-brand-500)] bg-[var(--color-brand-500)]/10",
    accent: "text-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10",
    success: "text-emerald-500 bg-emerald-500/10",
    signal: "text-[var(--color-signal-500)] bg-[var(--color-signal-500)]/10",
    violet: "text-violet-500 bg-violet-500/10",
  };
  return (
    <div className="fc-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
          {label}
        </span>
        {icon && (
          <span className={cn("grid size-8 place-items-center rounded-lg", tones[tone])}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="font-display text-[26px] font-bold leading-none tracking-tight tabular-nums">
          {value}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              "text-[12px] font-semibold tabular-nums",
              delta >= 0 ? "text-emerald-500" : "text-rose-500",
            )}
          >
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      {deltaLabel && (
        <div className="mt-1 text-[11.5px] text-[var(--fc-fg-subtle)]">{deltaLabel}</div>
      )}
      {children}
    </div>
  );
}

export function DataTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fc-card overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Th({
  children,
  className,
  onClick,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "px-4 py-3 text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--fc-fg-subtle)]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        onClick && "cursor-pointer select-none hover:text-[var(--fc-fg)]",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-3 text-[13.5px]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}
