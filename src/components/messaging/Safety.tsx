"use client";

import * as React from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  Clock,
  Eye,
  FileText,
  Flag,
  Lock,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Badge, Progress } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import {
  AGE_BANDS,
  GUARDIAN_CONTROLS,
  KID_SAFE_PILLARS,
  SAFETY_LOG_SEED,
  SAFETY_RULES,
} from "@/lib/data/safety";
import { REPORT_REASONS } from "@/lib/data/messagingExtras";
import { cn, relativeTime } from "@/lib/utils";
import type { SafetySettings } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* kid-safe panel                                                       */
/* ------------------------------------------------------------------ */

const GROUP_LABEL: Record<string, string> = {
  access: "Who can reach them",
  content: "What they can see",
  time: "When they can use it",
  privacy: "What stays private",
  data: "What the guardian sees",
};

export function KidSafePanel({
  safety,
  onSetControl,
  onToggle,
  onSetAgeBand,
}: {
  safety: SafetySettings;
  onSetControl: (id: string, value: string) => void;
  onToggle: (on: boolean) => void;
  onSetAgeBand: (band: SafetySettings["ageBand"]) => void;
}) {
  const [tab, setTab] = React.useState<"controls" | "rules" | "log">("controls");

  return (
    <div className="space-y-4">
      <div className="fc-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "grid size-11 place-items-center rounded-xl",
              safety.kidSafe
                ? "bg-emerald-500/12 text-emerald-500"
                : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)]",
            )}
          >
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold">Kid-safe mode</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--fc-fg-muted)]">
              {safety.kidSafe
                ? `On. Guardian ${safety.guardian} · ${safety.budgetLeftMin} minutes of screen time left today.`
                : "Off. The messenger behaves like a normal private messenger."}
            </p>
          </div>
          <button
            onClick={() => onToggle(!safety.kidSafe)}
            className={cn(
              "btn btn-sm",
              safety.kidSafe ? "btn-secondary" : "btn-primary",
            )}
          >
            {safety.kidSafe ? "Turn off" : "Turn on"}
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-[var(--fc-fg-muted)]">
              Today&apos;s screen-time budget
            </span>
            <span className="font-semibold tabular-nums">
              {safety.budgetLeftMin} min left
            </span>
          </div>
          <div className="mt-1.5">
            <Progress
              value={(safety.budgetLeftMin / 45) * 100}
              tone={safety.budgetLeftMin > 10 ? "success" : "danger"}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {KID_SAFE_PILLARS.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
            >
              <span className="text-[18px]">{p.icon}</span>
              <div className="mt-1 text-[12.5px] font-semibold">{p.title}</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--fc-fg-muted)]">
                {p.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: "controls", label: "Guardian controls" },
            { id: "rules", label: "Safety rules" },
            { id: "log", label: "Safety log" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              tab === t.id
                ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "controls" && (
        <div className="space-y-4">
          <div className="fc-card p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold">
              <UserCheck className="size-4 text-[var(--color-brand-500)]" />
              Age band
            </h3>
            <p className="mt-1 text-[12px] text-[var(--fc-fg-subtle)]">
              Choosing a band loads its defaults. Every one stays editable below.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {AGE_BANDS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSetAgeBand(b.id as SafetySettings["ageBand"])}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-colors",
                    safety.ageBand === b.id
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.06]"
                      : "border-[var(--fc-line)] hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold">{b.label}</span>
                    <span className="text-[10.5px] text-[var(--fc-fg-subtle)]">
                      {b.range}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {b.note}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {Object.keys(GROUP_LABEL).map((group) => (
            <div key={group} className="fc-card p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                {GROUP_LABEL[group]}
              </h3>
              <ul className="mt-3 space-y-2">
                {GUARDIAN_CONTROLS.filter((c) => c.group === group).map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px]">{c.icon}</span>
                      <span className="text-[12.5px] font-semibold">{c.label}</span>
                      <select
                        className="field ml-auto h-7 w-auto min-w-[150px] py-0 text-[11.5px]"
                        value={safety.controls[c.id] ?? c.default}
                        onChange={(e) => onSetControl(c.id, e.target.value)}
                      >
                        {c.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {c.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === "rules" && (
        <div className="fc-card p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Ban className="size-4 text-rose-500" />
            What the filter blocks
          </h3>
          <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
            Rules run on the server before anything reaches the device. A blocked
            message is never downloaded.
          </p>
          <ul className="mt-4 space-y-2">
            {SAFETY_RULES.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold uppercase",
                    r.severity === "block"
                      ? "bg-rose-500/15 text-rose-500"
                      : r.severity === "hold"
                      ? "bg-amber-500/15 text-amber-500"
                      : "bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)]",
                  )}
                >
                  {r.severity === "block" ? <Ban className="size-3.5" /> : null}
                  {r.severity === "hold" ? <Clock className="size-3.5" /> : null}
                  {r.severity === "warn" ? <AlertTriangle className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold">{r.title}</span>
                    <Badge
                      tone={
                        r.severity === "block"
                          ? "danger"
                          : r.severity === "hold"
                          ? "signal"
                          : "accent"
                      }
                    >
                      {r.severity}
                    </Badge>
                    <Badge>{r.category}</Badge>
                  </span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {r.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "log" && (
        <div className="fc-card p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <FileText className="size-4 text-[var(--color-accent-500)]" />
            Safety log
          </h3>
          <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
            A dated record of every filter hit and guardian decision. The guardian
            sees this — not the transcript.
          </p>
          <ul className="mt-4 space-y-2">
            {SAFETY_LOG_SEED.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      e.kind === "blocked"
                        ? "danger"
                        : e.kind === "held"
                        ? "signal"
                        : e.kind === "warned"
                        ? "accent"
                        : e.kind === "approved"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {e.kind}
                  </Badge>
                  <span className="text-[12.5px] font-semibold">{e.what}</span>
                  <span className="ml-auto text-[10.5px] text-[var(--fc-fg-subtle)]">
                    {relativeTime(e.at)}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {e.detail}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2.5 text-[11.5px] text-[var(--fc-fg-muted)]">
            <Lock className="size-3.5 shrink-0" />
            The log is exportable on demand and signed with a date so it can be
            handed to a school or a regulator.
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* report dialog                                                        */
/* ------------------------------------------------------------------ */

export function ReportDialog({
  open,
  onClose,
  threadName,
  messageBody,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  threadName: string;
  messageBody: string;
  onSubmit: (reason: string, detail: string) => void;
}) {
  const [reason, setReason] = React.useState(REPORT_REASONS[0].id);
  const [detail, setDetail] = React.useState("");
  const active = REPORT_REASONS.find((r) => r.id === reason)!;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report this message"
      description={`Reporting to the safety team. The message from ${threadName} is attached to the report.`}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button
            onClick={() => {
              onSubmit(reason, detail);
              setDetail("");
              onClose();
            }}
            className="btn btn-primary btn-sm"
          >
            <Flag className="size-3.5" />
            Send report
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
            Reported message
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed">{messageBody}</p>
        </div>

        <div>
          <span className="mb-1.5 block text-[12.5px] font-semibold">
            What is wrong with it?
          </span>
          <ul className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setReason(r.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
                    reason === r.id
                      ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.06]"
                      : "border-[var(--fc-line)] hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                      reason === r.id
                        ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]"
                        : "border-[var(--fc-line)]",
                    )}
                  >
                    {reason === r.id && (
                      <Check className="size-2.5 text-white" strokeWidth={3} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold">
                      {r.label}
                    </span>
                    <span className="block text-[11px] text-[var(--fc-fg-muted)]">
                      {r.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold">
            Anything else we should know?
          </span>
          <textarea
            className="field min-h-[80px] resize-y text-[12.5px]"
            placeholder="Optional — what happened, and what you would like us to do."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </label>

        <div className="flex items-start gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
          <Eye className="mt-0.5 size-3.5 shrink-0" />
          Reporting is not blocking. The sender is not told who reported them, and
          the conversation stays where it is.
        </div>
      </div>
    </Modal>
  );
}
