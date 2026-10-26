"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Building2,
  Crosshair,
  Flame,
  Radar as RadarIcon,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { AreaChart, BarChart, DonutChart, RadarChart } from "@/components/charts";
import { useToast } from "@/store/useUI";
import { cn, relativeTime } from "@/lib/utils";
import {
  seedCompetitors,
  seedRadarSeries,
  seedRadarSignals,
  SIGNAL_SOURCES,
  type RadarSignal,
} from "@/lib/data/radar";

const impactMeta: Record<
  RadarSignal["impact"],
  { label: string; tone: "neutral" | "signal" | "brand" | "danger"; weight: number }
> = {
  low: { label: "Low", tone: "neutral", weight: 1 },
  medium: { label: "Medium", tone: "brand", weight: 2 },
  high: { label: "High", tone: "signal", weight: 3 },
  critical: { label: "Critical", tone: "danger", weight: 4 },
};

function buildChart(series: { history: number[]; forecast: number[] }) {
  const labels: string[] = [];
  const start = 12;
  series.history.forEach((_, i) => labels.push(`W${i - start + 13}`));
  series.forecast.forEach((_, i) => labels.push(`+${i + 1}`));
  return { labels };
}

/** History as a solid line, forecast as a dashed continuation. */
function ForecastChart({
  history,
  forecast,
  labels,
  height = 210,
}: {
  history: number[];
  forecast: number[];
  labels: string[];
  height?: number;
}) {
  const W = 720;
  const H = height;
  const pad = { top: 16, right: 18, bottom: 26, left: 46 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;
  const all = [...history, ...forecast];
  const max = Math.max(...all) * 1.12;
  const min = Math.min(...all) * 0.88;
  const total = history.length + forecast.length - 1;
  const xAt = (i: number) => pad.left + (i / Math.max(1, total - 1)) * iw;
  const yAt = (v: number) => pad.top + ih - ((v - min) / (max - min)) * ih;

  const historyPts = history.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  const bridgeIdx = history.length - 1;
  const forecastPts = [
    `${xAt(bridgeIdx)},${yAt(history[bridgeIdx])}`,
    ...forecast.map((v, i) => `${xAt(history.length + i)},${yAt(v)}`),
  ].join(" ");

  const areaPts = `${xAt(0)},${pad.top + ih} ${historyPts} ${xAt(
    history.length - 1,
  )},${pad.top + ih}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="History and forecast"
    >
      <defs>
        <linearGradient id="fc-hist-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b64f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b64f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={pad.left}
          x2={W - pad.right}
          y1={pad.top + ih * t}
          y2={pad.top + ih * t}
          stroke="var(--fc-grid)"
          strokeWidth="1"
        />
      ))}

      <polygon points={areaPts} fill="url(#fc-hist-grad)" />
      <polyline
        points={historyPts}
        fill="none"
        stroke="#3b64f6"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={forecastPts}
        fill="none"
        stroke="#14b8a6"
        strokeWidth="2.4"
        strokeDasharray="6 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {history.map((v, i) => (
        <circle key={`h${i}`} cx={xAt(i)} cy={yAt(v)} r="2.6" fill="#3b64f6" />
      ))}
      {forecast.map((v, i) => (
        <circle
          key={`f${i}`}
          cx={xAt(history.length + i)}
          cy={yAt(v)}
          r="2.6"
          fill="#14b8a6"
        />
      ))}

      <line
        x1={xAt(bridgeIdx)}
        x2={xAt(bridgeIdx)}
        y1={pad.top}
        y2={pad.top + ih}
        stroke="var(--fc-fg-subtle)"
        strokeWidth="1"
        strokeDasharray="3 3"
        opacity="0.6"
      />
      <text
        x={xAt(bridgeIdx) + 6}
        y={pad.top + 10}
        className="fill-[var(--fc-fg-subtle)] text-[10px] font-semibold"
      >
        forecast
      </text>

      {labels.map((l, i) =>
        i % Math.ceil(labels.length / 7) === 0 || i === labels.length - 1 ? (
          <text
            key={l + i}
            x={xAt(i)}
            y={H - 8}
            textAnchor="middle"
            className="fill-[var(--fc-fg-subtle)] text-[10px]"
          >
            {l}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export default function RadarPage() {
  const toast = useToast();
  const [query, setQuery] = React.useState("");
  const [source, setSource] = React.useState("all");
  const [impact, setImpact] = React.useState<RadarSignal["impact"] | "all">("all");
  const [activeSeries, setActiveSeries] = React.useState(seedRadarSeries[0].id);
  const [showForecast, setShowForecast] = React.useState(true);

  const series = seedRadarSeries.find((s) => s.id === activeSeries)!;
  const chart = buildChart(series);

  const signals = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return seedRadarSignals
      .filter((s) => source === "all" || s.source === source)
      .filter((s) => impact === "all" || s.impact === impact)
      .filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          impactMeta[b.impact].weight - impactMeta[a.impact].weight ||
          b.confidence - a.confidence,
      );
  }, [query, source, impact]);

  const impactData = (["critical", "high", "medium", "low"] as const).map((k) => ({
    label: impactMeta[k].label,
    value: seedRadarSignals.filter((s) => s.impact === k).length,
  }));

  const categoryData = Array.from(new Set(seedRadarSignals.map((s) => s.category))).map(
    (c) => ({
      label: c,
      value: seedRadarSignals.filter((s) => s.category === c).length,
    }),
  );

  const last = series.history[series.history.length - 1];
  const projected = series.forecast[series.forecast.length - 1];
  const delta = ((projected - last) / last) * 100;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        eyebrow="Intelligence"
        title="Market radar"
        description="Signals from competitors, search, social, policy and your own funnel — with a forecast that shows where each series is heading and how confident we are."
        actions={
          <button
            onClick={() => toast.success("Scan complete", "8 new signals found since yesterday.")}
            className="btn btn-primary btn-sm"
          >
            <RadarIcon className="size-3.5" />
            Run a scan
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Live signals"
          value={seedRadarSignals.length}
          deltaLabel={`${seedRadarSignals.filter((s) => s.impact === "critical").length} critical`}
          icon={<Crosshair className="size-4" />}
        />
        <StatCard
          label="Tracked competitors"
          value={seedCompetitors.length}
          deltaLabel="in this market"
          icon={<Building2 className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Avg. confidence"
          value={`${Math.round(seedRadarSignals.reduce((a, s) => a + s.confidence, 0) / seedRadarSignals.length)}%`}
          deltaLabel="across every signal"
          icon={<Brain className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Fastest mover"
          value="+240%"
          deltaLabel="IELTS-free demand"
          icon={<Flame className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        {/* ---------------- Signals ---------------- */}
        <div className="space-y-4">
          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
                <input
                  className="field pl-9"
                  placeholder="Search signals…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <FilterChip active={impact === "all"} onClick={() => setImpact("all")}>
                All impact
              </FilterChip>
              {(["critical", "high", "medium", "low"] as const).map((k) => (
                <FilterChip
                  key={k}
                  active={impact === k}
                  onClick={() => setImpact(impact === k ? "all" : k)}
                  count={seedRadarSignals.filter((s) => s.impact === k).length}
                >
                  {impactMeta[k].label}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 border-b border-[var(--fc-line)] px-3 py-2.5">
              {SIGNAL_SOURCES.map((s) => (
                <FilterChip
                  key={s.id}
                  active={source === s.id}
                  onClick={() => setSource(source === s.id ? "all" : s.id)}
                >
                  {s.label}
                </FilterChip>
              ))}
            </div>

            {signals.length === 0 ? (
              <div className="px-6 py-16">
                <EmptyState
                  icon={<Crosshair className="size-6" />}
                  title="No signals match"
                  description="Widen the filters or run a fresh scan."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--fc-line)]">
                {signals.map((s) => (
                  <li key={s.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={impactMeta[s.impact].tone} dot>
                        {impactMeta[s.impact].label}
                      </Badge>
                      <Badge>{s.category}</Badge>
                      <span className="text-[11px] text-[var(--fc-fg-subtle)]">
                        {s.source} · {relativeTime(s.detectedAt)}
                      </span>
                      <span
                        className={cn(
                          "ml-auto inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums",
                          s.trend >= 0
                            ? "text-emerald-500"
                            : "text-rose-500",
                        )}
                      >
                        {s.trend >= 0 ? (
                          <TrendingUp className="size-3.5" />
                        ) : (
                          <TrendingDown className="size-3.5" />
                        )}
                        {s.trend >= 0 ? "+" : ""}
                        {s.trend}%
                      </span>
                    </div>
                    <h3 className="mt-2 text-[15px] font-semibold leading-snug">{s.title}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {s.summary}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-[11px] text-[var(--fc-fg-subtle)]">
                        Confidence
                      </span>
                      <span className="w-32">
                        <Progress
                          value={s.confidence}
                          tone={s.confidence > 85 ? "success" : s.confidence > 70 ? "brand" : "signal"}
                        />
                      </span>
                      <span className="text-[11.5px] font-semibold tabular-nums">
                        {s.confidence}%
                      </span>
                      <button
                        onClick={() =>
                          toast.info("Signal opened", "Added to your planning queue.")
                        }
                        className="btn btn-ghost btn-sm ml-auto"
                      >
                        <ArrowUpRight className="size-3.5" />
                        Plan against it
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ---------------- Competitors ---------------- */}
          <div className="fc-card p-5">
            <h2 className="text-[17px] font-semibold">Competitive landscape</h2>
            <div className="mt-4 space-y-3">
              {seedCompetitors.map((c) => (
                <article
                  key={c.id}
                  className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-[12px] font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, hsl(${c.hue} 70% 55%), hsl(${c.hue + 30} 70% 45%))`,
                      }}
                    >
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-semibold">{c.name}</h3>
                        <span className="truncate font-mono text-[11px] text-[var(--fc-fg-subtle)]">
                          {c.domain}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[var(--fc-fg-muted)]">
                        {c.positioning} · {c.pricing}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-bold tabular-nums">{c.share}%</div>
                      <div className="text-[10.5px] text-[var(--fc-fg-subtle)]">share</div>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-[15px] font-bold tabular-nums",
                          c.momentum >= 0 ? "text-emerald-500" : "text-rose-500",
                        )}
                      >
                        {c.momentum >= 0 ? "+" : ""}
                        {c.momentum}%
                      </div>
                      <div className="text-[10.5px] text-[var(--fc-fg-subtle)]">momentum</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        Strengths
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {c.strengths.map((x) => (
                          <li
                            key={x}
                            className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]"
                          >
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-rose-500">
                        Weaknesses
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {c.weaknesses.map((x) => (
                          <li
                            key={x}
                            className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]"
                          >
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="mt-3 border-t border-[var(--fc-line)] pt-2.5 text-[12px] text-[var(--fc-fg-subtle)]">
                    Last activity: {c.lastActivity}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* ---------------- Sidebar ---------------- */}
        <aside className="space-y-4">
          <div className="fc-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Forecast</h2>
              <button
                onClick={() => setShowForecast(!showForecast)}
                className="btn btn-ghost btn-sm"
              >
                {showForecast ? "Hide" : "Show"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {seedRadarSeries.map((s) => (
                <FilterChip
                  key={s.id}
                  active={activeSeries === s.id}
                  onClick={() => setActiveSeries(s.id)}
                >
                  {s.name}
                </FilterChip>
              ))}
            </div>

            <div className="mt-4">
              <ForecastChart
                history={series.history}
                forecast={showForecast ? series.forecast : [series.history[series.history.length - 1]]}
                labels={chart.labels}
              />
            </div>
            <div className="mt-2 flex items-center gap-4 text-[11px] text-[var(--fc-fg-subtle)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-[var(--color-brand-500)]" />
                History
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-[var(--color-accent-500)]" />
                Forecast
              </span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--fc-fg-muted)]">Latest</span>
                <span className="font-semibold tabular-nums">
                  {last} {series.unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--fc-fg-muted)]">In 6 periods</span>
                <span className="font-semibold tabular-nums">
                  {projected} {series.unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--fc-fg-muted)]">Projected change</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    delta >= 0 ? "text-emerald-500" : "text-rose-500",
                  )}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--fc-fg-muted)]">Confidence</span>
                <span className="font-semibold tabular-nums">{series.confidence}%</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--color-signal-500)]" />
                <p className="text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  The forecast adds a seasonal factor and a trend fit. It is a
                  planning aid, not a promise — treat the confidence band as the
                  honest part.
                </p>
              </div>
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Impact mix</h2>
            <div className="mt-4">
              <DonutChart
                size={150}
                thickness={22}
                centerLabel="Signals"
                centerValue={String(seedRadarSignals.length)}
                data={impactData}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Category mix</h2>
            <div className="mt-4">
              <BarChart
                height={180}
                labels={categoryData.map((c) => c.label)}
                series={[{ name: "Signals", data: categoryData.map((c) => c.value) }]}
              />
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Market position</h2>
            <div className="mt-4">
              <RadarChart
                size={220}
                axes={["Reach", "Speed", "Price", "Depth", "Proof", "Trust"]}
                series={[
                  { name: "Us", data: [72, 88, 74, 86, 78, 82], color: "#3b64f6" },
                  {
                    name: "Market avg",
                    data: [68, 66, 72, 60, 64, 70],
                    color: "#94a3b8",
                  },
                ]}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
