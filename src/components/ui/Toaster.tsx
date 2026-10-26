"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from "lucide-react";
import { useUI, type ToastKind } from "@/store/useUI";
import { cn } from "@/lib/utils";

const icons: Record<ToastKind, React.ElementType> = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
  error: XCircle,
};

const tones: Record<ToastKind, string> = {
  success: "text-emerald-500",
  info: "text-[var(--color-brand-500)]",
  warning: "text-[var(--color-signal-500)]",
  error: "text-rose-500",
};

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(92vw,380px)] flex-col gap-2.5">
      {toasts.map((t) => {
        const Icon = icons[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-3.5 shadow-lg"
            style={{ animation: "rise .3s cubic-bezier(.16,1,.3,1) both" }}
          >
            <Icon className={cn("mt-0.5 size-4.5 shrink-0", tones[t.kind])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--fc-fg-muted)]">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="btn btn-ghost btn-icon -mr-1 -mt-1 size-7 shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
