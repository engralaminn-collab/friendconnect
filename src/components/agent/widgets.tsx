"use client";

import * as React from "react";
import { Check, Copy, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolRisk } from "@/lib/agent/types";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement("textarea");
        area.value = value;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" onClick={copy} className={cn("btn btn-sm", className)}>
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

const RISK_STYLE: Record<ToolRisk, { label: string; className: string; icon: typeof Wrench }> = {
  read: {
    label: "Read",
    className: "text-emerald-600 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-400",
    icon: ShieldCheck,
  },
  write: {
    label: "Write",
    className: "text-[var(--color-accent-500)] bg-[var(--color-accent-500)]/10 border-[var(--color-accent-500)]/25",
    icon: Wrench,
  },
  destructive: {
    label: "Destructive",
    className: "text-[var(--color-signal-500)] bg-[var(--color-signal-500)]/10 border-[var(--color-signal-500)]/25",
    icon: ShieldAlert,
  },
};

export function RiskBadge({ risk }: { risk: ToolRisk }) {
  const style = RISK_STYLE[risk];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        style.className,
      )}
    >
      <Icon className="size-3" />
      {style.label}
    </span>
  );
}

export function SectionTitle({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      {children && <div className="mt-3 w-full">{children}</div>}
    </div>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--fc-line-strong)] bg-[var(--fc-surface-2)] px-4 py-6 text-center text-[12.5px] text-[var(--fc-fg-muted)]">
      {children}
    </div>
  );
}

export function timeAgo(input: string): string {
  const then = new Date(input).getTime();
  if (!Number.isFinite(then)) return input;
  const seconds = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
