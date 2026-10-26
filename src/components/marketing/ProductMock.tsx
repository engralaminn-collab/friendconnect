"use client";

import * as React from "react";
import { Sparkline } from "@/components/charts";

/**
 * A composited miniature of the workspace used in the marketing hero.
 * Pure CSS/SVG — no images, so it stays crisp at any resolution.
 */
export function ProductMock() {
  const pipeline = [
    { label: "Qualify", value: 62, color: "#14b8a6" },
    { label: "Proposal", value: 44, color: "#3b64f6" },
    { label: "Negotiate", value: 28, color: "#8b5cf6" },
    { label: "Won", value: 17, color: "#22c55e" },
  ];

  const bars = [38, 52, 41, 66, 58, 74, 62, 88, 71, 94, 83, 100];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[var(--fc-line)] bg-[var(--fc-surface)] shadow-[0_40px_90px_-40px_rgba(10,12,32,.55)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3.5 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex-1 truncate rounded-md bg-[var(--fc-surface-3)] px-2.5 py-1 text-[10px] font-medium text-[var(--fc-fg-subtle)]">
          friendconnect.app / app / pipeline
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-3 p-3.5">
        {/* left: pipeline board */}
        <div className="min-w-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
              Pipeline
            </div>
            <span className="chip border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
              £186k open
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {pipeline.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate text-[10px] font-semibold text-[var(--fc-fg-muted)]">
                    {s.label}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--fc-surface-3)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.value}%`, backgroundColor: s.color }}
                  />
                </div>
                <div className="mt-1.5 text-[10px] font-semibold tabular-nums text-[var(--fc-fg-subtle)]">
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
                Revenue trend
              </span>
              <span className="text-[10px] font-semibold text-emerald-500">+18.4%</span>
            </div>
            <div className="flex h-14 items-end gap-[3px]">
              {bars.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${b}%`,
                    backgroundImage:
                      i > 7
                        ? "linear-gradient(180deg, var(--color-accent-400), var(--color-brand-500))"
                        : "linear-gradient(180deg, var(--color-brand-400), var(--color-brand-600))",
                    opacity: 0.35 + (i / bars.length) * 0.65,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* right: activity + agent */}
        <div className="min-w-0 space-y-2.5">
          <div className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
              Agent run
            </div>
            <div className="space-y-1.5">
              {["read_csv", "search_web", "enrich_company", "score_lead"].map((t, i) => (
                <div key={t} className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate font-mono text-[9.5px] text-[var(--fc-fg-muted)]">
                    {t}
                  </span>
                  <span className="ml-auto text-[9px] tabular-nums text-[var(--fc-fg-subtle)]">
                    {120 + i * 340}ms
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2.5">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--fc-fg-subtle)]">
              Voice
            </div>
            <Sparkline
              data={[12, 26, 18, 34, 22, 40, 30, 48, 36, 44, 28, 38]}
              color="var(--color-accent-500)"
              height={34}
            />
            <div className="mt-1 text-[9px] tabular-nums text-[var(--fc-fg-subtle)]">
              00:24 · 3 voices
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
