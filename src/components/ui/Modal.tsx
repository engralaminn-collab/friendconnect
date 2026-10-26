"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const widths = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-[#07091a]/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--fc-line)] bg-[var(--fc-surface)] shadow-xl sm:rounded-2xl",
          widths[size],
        )}
        style={{ animation: "rise .32s cubic-bezier(.16,1,.3,1) both" }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--fc-line)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-[var(--fc-fg-muted)]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon -mr-1 shrink-0"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="fc-scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
