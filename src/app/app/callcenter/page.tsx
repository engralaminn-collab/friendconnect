"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Ban,
  BarChart3,
  Bot,
  CalendarClock,
  Check,
  ChevronRight,
  Download,
  CircleDot,
  ClipboardCheck,
  Clock,
  FileText,
  Gauge,
  Headphones,
  ListChecks,
  MessageSquareText,
  Mic,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Play,
  Radio,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  Timer,
  UserCheck,
  Users,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { AreaChart, BarChart, DonutChart } from "@/components/charts";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";
import { cn, downloadFile, formatDuration } from "@/lib/utils";
import {
  AUTO_TRIGGERS,
  BOOKMARKED_MOMENTS,
  MEETING_PREPS,
  POLICY_LIMITS,
  RECORDING_HISTORY,
  RESUME_RULES,
  FLOW_PHASES,
  FLOW_TOOLS,
  MCP_TOOLS,
  MEETING_WIZARDS,
  OUTBOUND_RECIPES,
  WORKFLOW_PLUGINS,
  auditTranscript,
  CHANNELS,
  checkConsent,
  computeMetrics,
  generateCall,
  liveAssist,
  coachingNudges,
  matchAutoTriggers,
  recordingToMarkdown,
  scoreCall,
  summariseCall,
  type Utterance,
} from "@/lib/callcenter";

type Tab = "live" | "after" | "flow" | "outbound" | "integrations" | "prep";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "live", label: "Live desk", icon: Headphones },
  { id: "after", label: "Post-call", icon: ScrollText },
  { id: "flow", label: "Bot flow", icon: Bot },
  { id: "outbound", label: "Outbound", icon: Target },
  { id: "integrations", label: "Integrations", icon: Zap },
  { id: "prep", label: "Prep & policy", icon: CalendarClock },
];

export default function CallCentrePage() {
  const calls = useStore((s) => s.calls);
  const contacts = useStore((s) => s.contacts);
  const toast = useToast();

  const [tab, setTab] = React.useState<Tab>("live");
  const [scenario, setScenario] = React.useState("billing");
  const [live, setLive] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const [wallboard, setWallboard] = React.useState(false);
  const [recipeOpen, setRecipeOpen] = React.useState(false);
  const [recipeId, setRecipeId] = React.useState(OUTBOUND_RECIPES[0].id);
  const [prepId, setPrepId] = React.useState(MEETING_PREPS[0].contact);
  const [wizardId, setWizardId] = React.useState(MEETING_WIZARDS[0].id);
  const [recordingId, setRecordingId] = React.useState(RECORDING_HISTORY[0].id);
  const [triggerProbe, setTriggerProbe] = React.useState(
    "I was charged twice for invoice 44821 and the app keeps showing an error.",
  );
  const [consentArtifact, setConsentArtifact] = React.useState(
    "Booking confirmation #FC-88213 — reminder opted in on 12 Oct.",
  );
  const [requestedFields, setRequestedFields] = React.useState(
    "first name, appointment time, salary band, location",
  );
  const [scheduled, setScheduled] = React.useState<
    { id: string; recipe: string; to: string; at: string; attempts: number; state: string }[]
  >([
    { id: "ob1", recipe: "Appointment reminder", to: "+44 7700 900221", at: "Today 14:30", attempts: 0, state: "queued" },
    { id: "ob2", recipe: "Form submission callback", to: "+44 7700 900884", at: "Today 16:00", attempts: 1, state: "callback-booked" },
    { id: "ob3", recipe: "Lead qualification", to: "+44 7700 900117", at: "Tomorrow 09:15", attempts: 3, state: "unreachable" },
  ]);

  const generated = React.useMemo(() => generateCall(scenario, scenario), [scenario]);
  const shown: Utterance[] = generated.utterances.slice(
    0,
    live ? Math.max(1, cursor) : generated.utterances.length,
  );

  React.useEffect(() => {
    if (!live) return;
    if (cursor >= generated.utterances.length) {
      setLive(false);
      return;
    }
    const t = window.setTimeout(
      () => setCursor((c) => c + 1),
      1100,
    );
    return () => window.clearTimeout(t);
  }, [live, cursor, generated.utterances.length]);

  const metrics = computeMetrics(shown);
  const assists = liveAssist(shown, {
    product: "FriendConnect",
    policy: "30-day refund",
  });
  const nudges = coachingNudges(shown);
  const summary = summariseCall(shown, { agent: "Northwind support", topic: scenario });
  const qa = scoreCall(shown);

  const startLive = () => {
    setCursor(0);
    setLive(true);
    toast.info("Call connected", "Live transcription and assist are running.");
  };

  const consent = React.useMemo(
    () =>
      checkConsent(OUTBOUND_RECIPES.find((r) => r.id === recipeId)!, {
        consentArtifact,
        requestedFields: requestedFields
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      }),
    [recipeId, consentArtifact, requestedFields],
  );

  const totalSec = calls.reduce((a, c) => a + c.durationSec, 0);
  const avgMos = calls.filter((c) => c.quality.mos > 0);
  const avgQuality = avgMos.length
    ? (avgMos.reduce((a, c) => a + c.quality.mos, 0) / avgMos.length).toFixed(2)
    : "—";

  return (
    <div className="mx-auto max-[1700px]">
      <PageHeader
        eyebrow="Agentic contact centre"
        title="Call centre"
        description="A call centre where the AI is the default answer, not an add-on — with live transcription, live assist, coaching, sentiment, PII redaction, a bot flow that hands over cleanly, and consent-gated outbound calling."
        actions={
          <>
            <button
              onClick={() => setWallboard((v) => !v)}
              className={cn("btn btn-sm", wallboard ? "btn-primary" : "btn-secondary")}
            >
              <Gauge className="size-3.5" />
              Wallboard
            </button>
            <button
              onClick={() => setRecipeOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <PhoneCall className="size-3.5" />
              Plan an outbound call
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Calls today"
          value={calls.length}
          deltaLabel={`${calls.filter((c) => c.status === "missed").length} missed`}
          icon={<Phone className="size-4" />}
        />
        <StatCard
          label="Talk time"
          value={`${Math.round(totalSec / 60)}m`}
          deltaLabel="across the queue"
          icon={<Clock className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Average MOS"
          value={avgQuality}
          deltaLabel="call quality across every call"
          icon={<Radio className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Sent to a human"
          value="38%"
          deltaLabel="the rest handled by the bot"
          icon={<UserCheck className="size-4" />}
          tone="violet"
        />
      </div>

      {/* ---------------- wallboard ---------------- */}
      {wallboard && (
        <div className="fc-card mt-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[15px] font-semibold">Supervisor wallboard</h2>
            <Badge tone="success" dot>
              4 agents available
            </Badge>
            <Badge tone="signal" dot>
              2 in conversation
            </Badge>
            <Badge tone="danger" dot>
              1 waiting longest
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { name: "Dana Whitfield", state: "on call", since: "04:12", queue: "Billing" },
              { name: "Luis Marchetti", state: "available", since: "—", queue: "—" },
              { name: "Aisha Rahman", state: "wrap-up", since: "09:48", queue: "Outage" },
              { name: "Tom Delaney", state: "on call", since: "11:02", queue: "Onboarding" },
            ].map((a) => (
              <div
                key={a.name}
                className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={a.name} hue={(a.name.length * 47) % 360} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-semibold">{a.name}</div>
                    <div className="text-[10.5px] text-[var(--fc-fg-subtle)]">
                      {a.state} · {a.since}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-[var(--fc-fg-muted)]">
                  Queue: {a.queue}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Queue depth
              </div>
              <BarChart
                height={150}
                labels={["Billing", "Outage", "Onboarding", "Security"]}
                series={[{ name: "Waiting", data: [3, 5, 1, 2] }]}
              />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Handled by
              </div>
              <DonutChart
                size={150}
                centerLabel="calls"
                centerValue="184"
                data={[
                  { label: "Bot", value: 114 },
                  { label: "Human", value: 70 },
                ]}
              />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Sentiment by hour
              </div>
              <AreaChart
                height={150}
                labels={["09", "10", "11", "12", "14", "15", "16", "17"]}
                series={[
                  { name: "Positive", data: [12, 18, 15, 9, 22, 26, 19, 14] },
                  { name: "Negative", data: [8, 5, 9, 14, 6, 4, 7, 9] },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------- tabs ---------------- */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              tab === t.id
                ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* =================== LIVE DESK =================== */}
      {tab === "live" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="fc-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-lg",
                  live
                    ? "bg-rose-500/12 text-rose-500"
                    : "bg-[var(--fc-surface)] text-[var(--fc-fg-muted)]",
                )}
              >
                {live ? <Volume2 className="size-4" /> : <Headphones className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">Agent desktop</h2>
                <p className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                  {live
                    ? `Live · ${shown.length} utterances`
                    : "Idle — the transcript loads from the last call"}
                </p>
              </div>
              <select
                className="field h-8 w-auto py-0 text-[12px]"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                <option value="billing">Billing dispute</option>
                <option value="outage">Service outage</option>
                <option value="onboarding">Onboarding</option>
              </select>
              {live ? (
                <button
                  onClick={() => setLive(false)}
                  className="btn btn-secondary btn-sm"
                >
                  <Square className="size-3.5" />
                  Stop
                </button>
              ) : (
                <button onClick={startLive} className="btn btn-primary btn-sm">
                  <Play className="size-3.5" />
                  Connect
                </button>
              )}
            </div>

            {/* transcript */}
            <div className="fc-scroll-thin max-h-[460px] space-y-2 overflow-y-auto p-5">
              {shown.map((u) => (
                <div
                  key={u.id}
                  className={cn(
                    "flex gap-3",
                    u.speaker === "agent" ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                      u.speaker === "agent"
                        ? "bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)]"
                        : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)]",
                    )}
                  >
                    {u.speaker === "agent" ? "AG" : "CU"}
                  </span>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-2",
                      u.speaker === "agent"
                        ? "rounded-tr-md bg-[var(--color-brand-500)]/[0.1]"
                        : "rounded-tl-md bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-[var(--fc-fg-subtle)]">
                      <span className="font-semibold">
                        {u.speaker === "agent" ? "Agent" : "Caller"}
                      </span>
                      <span className="tabular-nums">
                        {formatDuration(u.t)}
                      </span>
                      <span className="rounded bg-[var(--fc-surface-3)] px-1 text-[9px] uppercase">
                        {u.channel}
                      </span>
                      {u.pii.length > 0 && (
                        <span className="rounded bg-amber-500/15 px-1 text-[9px] font-bold uppercase text-amber-600">
                          {u.pii.length} pii
                        </span>
                      )}
                      {u.flags.map((f) => (
                        <span
                          key={f}
                          className="rounded bg-rose-500/15 px-1 text-[9px] font-bold uppercase text-rose-500"
                        >
                          {f}
                        </span>
                      ))}
                      <span
                        className={cn(
                          "font-bold",
                          u.sentiment > 0.2
                            ? "text-emerald-500"
                            : u.sentiment < -0.2
                            ? "text-rose-500"
                            : "text-[var(--fc-fg-subtle)]",
                        )}
                      >
                        {u.sentiment > 0 ? "+" : ""}
                        {u.sentiment.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed">{u.text}</p>
                    {u.pii.length > 0 && (
                      <p className="mt-1 font-mono text-[10.5px] text-[var(--fc-fg-subtle)]">
                        redacted → {u.redacted}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {live && (
                <div className="flex items-center gap-2 pl-10 text-[11.5px] text-[var(--fc-fg-subtle)]">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  listening…
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* live assist */}
            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <Sparkles className="size-4 text-[var(--color-violet-500)]" />
                Live assist
              </h3>
              <p className="mt-1 text-[11.5px] text-[var(--fc-fg-subtle)]">
                Generated from the conversation so far, not from a script.
              </p>
              {assists.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-[var(--fc-line)] px-3 py-6 text-center text-[12px] text-[var(--fc-fg-muted)]">
                  Nothing to suggest yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {assists.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={
                            a.priority === "high"
                              ? "danger"
                              : a.priority === "medium"
                              ? "signal"
                              : "neutral"
                          }
                        >
                          {a.kind}
                        </Badge>
                        {a.priority === "high" && (
                          <AlertTriangle className="size-3.5 text-rose-500" />
                        )}
                      </div>
                      <p className="mt-1.5 text-[13px] font-semibold">{a.text}</p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                        {a.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* coaching nudges */}
            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <Gauge className="size-4 text-[var(--color-accent-500)]" />
                Coaching nudges
              </h3>
              <ul className="mt-3 space-y-1.5">
                {nudges.length === 0 && (
                  <li className="text-[12px] text-[var(--fc-fg-muted)]">
                    Nothing to correct yet.
                  </li>
                )}
                {nudges.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-3 py-2 text-[12.5px]",
                      n.tone === "warn"
                        ? "bg-amber-500/[0.08] text-amber-700 dark:text-amber-400"
                        : n.tone === "good"
                        ? "bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-400"
                        : "bg-[var(--fc-surface-2)]",
                    )}
                  >
                    {n.tone === "good" ? (
                      <Check className="mt-0.5 size-3.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    )}
                    {n.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* metrics */}
            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <Activity className="size-4 text-[var(--color-brand-500)]" />
                Conversation metrics
              </h3>
              <dl className="mt-3 grid grid-cols-2 gap-2.5">
                {[
                  { l: "Talk ratio (you)", v: `${Math.round(metrics.agentShare * 100)}%` },
                  { l: "Speaking pace", v: `${metrics.wpm} wpm` },
                  { l: "Questions asked", v: String(metrics.questionsAsked) },
                  { l: "Longest monologue", v: `${metrics.longestMonologueSec}s` },
                  { l: "Interruptions", v: String(metrics.interruptions) },
                  { l: "Empathy signals", v: String(metrics.empathyPhrases) },
                ].map((r) => (
                  <div
                    key={r.l}
                    className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                  >
                    <dt className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                      {r.l}
                    </dt>
                    <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{r.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3">
                <Progress
                  value={metrics.agentShare * 100}
                  tone={metrics.agentShare > 0.7 ? "danger" : "success"}
                />
                <p className="mt-1.5 text-[11px] text-[var(--fc-fg-subtle)]">
                  Aim for 50–65% — the agent should not be the loudest voice.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== POST-CALL =================== */}
      {tab === "after" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div className="fc-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-[15px] font-semibold">Call summary</h2>
                <Badge
                  tone={
                    summary.sentiment.label === "positive"
                      ? "success"
                      : summary.sentiment.label === "negative"
                      ? "danger"
                      : "neutral"
                  }
                >
                  {summary.sentiment.label} {summary.sentiment.score}
                </Badge>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                {summary.overview}
              </p>

              <h3 className="mt-5 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Key points by topic
              </h3>
              <ul className="mt-2 space-y-2">
                {summary.keyPoints.map((k, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge tone="accent">{k.topic}</Badge>
                      <span className="text-[11px] font-semibold text-[var(--fc-fg-subtle)]">
                        {k.speaker}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed">{k.point}</p>
                  </li>
                ))}
              </ul>

              <h3 className="mt-5 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                Action items
              </h3>
              <ul className="mt-2 space-y-1.5">
                {summary.actionItems.length === 0 && (
                  <li className="rounded-lg border border-dashed border-[var(--fc-line)] px-3 py-4 text-center text-[12px] text-[var(--fc-fg-muted)]">
                    No follow-up was captured on this call.
                  </li>
                )}
                {summary.actionItems.map((a, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--fc-line)] px-3 py-2"
                  >
                    <Check className="size-3.5 shrink-0 text-emerald-500" />
                    <span className="min-w-0 flex-1 text-[12.5px]">{a.action}</span>
                    <Badge>{a.owner}</Badge>
                    <Badge tone="signal">{a.due}</Badge>
                  </li>
                ))}
              </ul>

              {summary.riskFlags.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-4" />
                    Risk flags
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[12px] text-[var(--fc-fg-muted)]">
                    {summary.riskFlags.map((r) => (
                      <li key={r} className="flex items-start gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <MessageSquareText className="size-4 text-[var(--color-brand-500)]" />
                Transcript with redaction
              </h3>
              <div className="fc-scroll-thin mt-3 max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                {generated.utterances.map((u) => (
                  <div key={u.id} className="flex gap-2 text-[12px]">
                    <span className="w-14 shrink-0 tabular-nums text-[var(--fc-fg-subtle)]">
                      {formatDuration(u.t)}
                    </span>
                    <span className="w-10 shrink-0 font-semibold uppercase text-[10px] text-[var(--fc-fg-subtle)]">
                      {u.speaker}
                    </span>
                    <span className="min-w-0 flex-1">
                      {u.pii.length ? (
                        <>
                          <span className="line-through opacity-50">{u.text}</span>{" "}
                          <span className="font-mono text-[11px] text-[var(--color-violet-500)]">
                            {u.redacted}
                          </span>
                        </>
                      ) : (
                        u.text
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold">Quality scorecard</h3>
                <span
                  className={cn(
                    "text-[26px] font-bold tabular-nums",
                    qa.total >= 80
                      ? "text-emerald-500"
                      : qa.total >= 65
                      ? "text-[var(--color-signal-500)]"
                      : "text-rose-500",
                  )}
                >
                  {qa.grade}
                </span>
              </div>
              <p className="text-[11.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                {qa.total} / 100
              </p>
              <ul className="mt-3 space-y-2.5">
                {[
                  { l: "Greeting", v: qa.greeting, w: 15 },
                  { l: "Discovery", v: qa.discovery, w: 25 },
                  { l: "Empathy", v: qa.empathy, w: 20 },
                  { l: "Ownership", v: qa.ownership, w: 15 },
                  { l: "Resolution", v: qa.resolution, w: 15 },
                  { l: "Compliance", v: qa.compliance, w: 10 },
                ].map((r) => (
                  <li key={r.l}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--fc-fg-muted)]">{r.l}</span>
                      <span className="font-semibold tabular-nums">
                        {Math.round(r.v * 100)}
                        <span className="ml-1 text-[10px] text-[var(--fc-fg-subtle)]">
                          ({r.w}%)
                        </span>
                      </span>
                    </div>
                    <div className="mt-1">
                      <Progress
                        value={r.v * 100}
                        tone={r.v >= 0.8 ? "success" : r.v >= 0.5 ? "signal" : "danger"}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {qa.notes.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-[var(--fc-line)] pt-3">
                  {qa.notes.map((n) => (
                    <li
                      key={n}
                      className="flex items-start gap-2 text-[12px] text-[var(--fc-fg-muted)]"
                    >
                      <Wand2 className="mt-0.5 size-3.5 shrink-0 text-[var(--color-violet-500)]" />
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Entity & topic extraction</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...new Set(generated.utterances.flatMap((u) => u.entities))].map((e) => (
                  <Badge key={e} tone="accent">
                    {e}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[...new Set(generated.utterances.flatMap((u) => u.topics))].map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <h4 className="mt-4 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[var(--fc-fg-subtle)]">
                PII found
              </h4>
              <ul className="mt-1.5 space-y-1">
                {generated.utterances
                  .flatMap((u) => u.pii.map((p) => ({ ...p, t: u.t })))
                  .map((p, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5 text-[11.5px]"
                    >
                      <ShieldCheck className="size-3.5 shrink-0 text-[var(--color-violet-500)]" />
                      <span className="font-mono">{p.value}</span>
                      <Badge tone="violet">{p.type}</Badge>
                      <span className="ml-auto tabular-nums text-[var(--fc-fg-subtle)]">
                        {formatDuration(p.t)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =================== BOT FLOW =================== */}
      {tab === "flow" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Phases</h2>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              The model owns the dialogue; the flow owns the phase. A phase carries
              instructions and a list of tools, and transitions fire on tool results.
            </p>
            <ol className="mt-4 space-y-3">
              {FLOW_PHASES.map((p, i) => (
                <li
                  key={p.id}
                  className="relative rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-[var(--color-brand-500)] text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-[13.5px] font-semibold">{p.name}</span>
                    <span className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                      {p.goal}
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {p.instructions}
                  </p>
                  {p.scripted && (
                    <p className="mt-2 rounded-lg border-l-2 border-[var(--color-accent-500)] bg-[var(--fc-surface)] px-2.5 py-1.5 font-mono text-[12px] italic">
                      “{p.scripted}”
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {p.tools.map((t) => (
                      <span key={t} className="chip font-mono text-[10.5px]">
                        {t}
                      </span>
                    ))}
                    {p.tools.length === 0 && (
                      <span className="text-[11px] text-[var(--fc-fg-subtle)]">
                        no tools
                      </span>
                    )}
                  </div>
                  {p.transitions.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2 border-t border-[var(--fc-line)] pt-2.5">
                      {p.transitions.map((t) => (
                        <span
                          key={t.goto}
                          className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--fc-fg-muted)]"
                        >
                          <span className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 font-mono text-[10.5px]">
                            {t.when}
                          </span>
                          <ArrowRight className="size-3" />
                          <span className="font-semibold text-[var(--color-brand-500)]">
                            {t.goto}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Tools</h3>
              <p className="mt-1 text-[11.5px] text-[var(--fc-fg-subtle)]">
                A tool may refuse. “The queue is closed” is something to talk about,
                not an error.
              </p>
              <ul className="mt-3 space-y-2">
                {FLOW_TOOLS.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-[12px] font-bold text-[var(--color-brand-500)]">
                        {t.name}
                      </code>
                      {t.canRefuse && (
                        <Badge tone="signal">may refuse</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {t.description}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {t.parameters.map((p) => (
                        <span
                          key={p.name}
                          className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          {p.name}:{p.type}
                          {p.required ? "*" : ""}
                        </span>
                      ))}
                    </div>
                    {t.refusalExample && (
                      <p className="mt-1.5 rounded-lg bg-amber-500/[0.08] px-2 py-1.5 text-[11.5px] italic text-amber-700 dark:text-amber-400">
                        “{t.refusalExample}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Channels</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                The same flow runs over voice and over SMS. What changes is how
                much can be streamed, and how a half-finished message reads.
              </p>
              <ul className="mt-3 space-y-2">
                {CHANNELS.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] font-semibold">{c.label}</span>
                      <Badge tone={c.direction === "outbound" ? "signal" : "accent"}>
                        {c.direction}
                      </Badge>
                      <Badge>{c.medium}</Badge>
                      {c.supportsStreaming && (
                        <Badge tone="success">streaming</Badge>
                      )}
                      {c.resumable && <Badge tone="violet">resumable</Badge>}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {c.note}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Resuming a conversation</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                A conversation is suspended, not ended. These are the five cases
                where that matters.
              </p>
              <ul className="mt-3 space-y-2">
                {RESUME_RULES.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="text-[12.5px] font-semibold">{r.situation}</div>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {r.behaviour}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-accent-500)]">
                      Keeps: {r.keeps}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">One record per conversation</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                A call the bot answered, handed to a queue and an agent finished is one
                CDR with one transcript and one recording — not three fragments. The
                call id is minted before any leg exists, so it survives the transfer.
              </p>
              <div className="mt-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                <div className="flex items-center gap-2 text-[11.5px] font-semibold">
                  <CircleDot className="size-3.5 text-emerald-500" />
                  call_9f2c… · bot → queue → agent
                </div>
                <ul className="mt-2 space-y-1 text-[11.5px] text-[var(--fc-fg-muted)]">
                  <li>Transcript — 1 file, both legs</li>
                  <li>Recording — 1 file, full call</li>
                  <li>Sentiment — per utterance, one call</li>
                  <li>Action items — captured once</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== OUTBOUND =================== */}
      {tab === "outbound" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-4">
            <div className="fc-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
                <Target className="size-4 text-[var(--color-accent-500)]" />
                <h2 className="text-[15px] font-semibold">Recipes</h2>
                <span className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                  explicit intent · safe to try without a real call
                </span>
              </div>
              <ul className="divide-y divide-[var(--fc-line)]">
                {OUTBOUND_RECIPES.map((r) => (
                  <li key={r.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold">{r.name}</span>
                      <Badge tone="accent">{r.purpose}</Badge>
                    </div>
                    <dl className="mt-2.5 grid gap-2 text-[12px] sm:grid-cols-2">
                      <div>
                        <dt className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          Consent artefact
                        </dt>
                        <dd className="text-[var(--fc-fg-muted)]">{r.consentArtifact}</dd>
                      </div>
                      <div>
                        <dt className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          Gatekeeper
                        </dt>
                        <dd className="text-[var(--fc-fg-muted)]">{r.gatekeeper}</dd>
                      </div>
                      <div>
                        <dt className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          Permitted
                        </dt>
                        <dd className="flex flex-wrap gap-1">
                          {r.permittedFields.map((f) => (
                            <Badge key={f} tone="success">
                              {f}
                            </Badge>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          Stripped
                        </dt>
                        <dd className="flex flex-wrap gap-1">
                          {r.strippedFields.map((f) => (
                            <Badge key={f} tone="danger">
                              {f}
                            </Badge>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          Window
                        </dt>
                        <dd className="text-[var(--fc-fg-muted)]">{r.window}</dd>
                      </div>
                      <div>
                        <dt className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          Disposition
                        </dt>
                        <dd className="font-mono text-[11px] text-[var(--fc-fg-muted)]">
                          {r.disposition}
                        </dd>
                      </div>
                    </dl>
                    <ul className="mt-2 space-y-1">
                      {r.notes.map((n) => (
                        <li
                          key={n}
                          className="flex items-start gap-2 text-[11.5px] text-[var(--fc-fg-muted)]"
                        >
                          <ShieldCheck className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                          {n}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>

            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <CalendarClock className="size-4 text-[var(--color-brand-500)]" />
                Scheduler
              </h3>
              <ul className="mt-3 space-y-2">
                {scheduled.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2.5"
                  >
                    <PhoneCall className="size-3.5 shrink-0 text-[var(--fc-fg-muted)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold">{s.recipe}</span>
                      <span className="block font-mono text-[11px] text-[var(--fc-fg-subtle)]">
                        {s.to} · {s.at} · {s.attempts} attempt
                        {s.attempts === 1 ? "" : "s"}
                      </span>
                    </span>
                    <Badge
                      tone={
                        s.state === "unreachable"
                          ? "danger"
                          : s.state === "queued"
                          ? "neutral"
                          : "success"
                      }
                    >
                      {s.state}
                    </Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                The unreached count is the product. A queue that looks tidy because it
                ignores dialling failures is a broken queue — every attempt is counted
                and the disposition is written down.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <ShieldCheck className="size-4 text-emerald-500" />
                Consent gate
              </h3>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12px] font-semibold">Recipe</span>
                <select
                  className="field"
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                >
                  {OUTBOUND_RECIPES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12px] font-semibold">
                  Consent artefact
                </span>
                <textarea
                  className="field min-h-[72px] resize-y text-[12.5px]"
                  value={consentArtifact}
                  onChange={(e) => setConsentArtifact(e.target.value)}
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12px] font-semibold">
                  Requested fields
                </span>
                <input
                  className="field"
                  value={requestedFields}
                  onChange={(e) => setRequestedFields(e.target.value)}
                />
              </label>

              <div
                className={cn(
                  "mt-3 rounded-xl border p-3.5",
                  consent.allowed
                    ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                    : "border-rose-500/30 bg-rose-500/[0.06]",
                )}
              >
                <div className="flex items-center gap-2">
                  {consent.allowed ? (
                    <BadgeCheck className="size-4 text-emerald-500" />
                  ) : (
                    <Ban className="size-4 text-rose-500" />
                  )}
                  <span className="text-[13px] font-semibold">
                    {consent.allowed ? "Permitted to dial" : "Fail closed — do not dial"}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {consent.reason}
                </p>
                {consent.permitted.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                      Permitted
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {consent.permitted.map((f) => (
                        <Badge key={f} tone="success">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {consent.stripped.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                      Stripped before the call
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {consent.stripped.map((f) => (
                        <Badge key={f} tone="danger">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (!consent.allowed) {
                    toast.error("Blocked", "No consent artefact on file.");
                    return;
                  }
                  const r = OUTBOUND_RECIPES.find((x) => x.id === recipeId)!;
                  setScheduled((s) => [
                    {
                      id: `ob${Date.now()}`,
                      recipe: r.name,
                      to: "+44 7700 900342",
                      at: "Tomorrow 11:00",
                      attempts: 0,
                      state: "queued",
                    },
                    ...s,
                  ]);
                  toast.success("Queued", `${r.name} scheduled for tomorrow 11:00.`);
                }}
                className="btn btn-primary btn-sm mt-3 w-full"
              >
                <PhoneCall className="size-3.5" />
                Schedule the call
              </button>
            </div>

            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <ListChecks className="size-4 text-[var(--color-accent-500)]" />
                Batch runner
              </h3>
              <p className="mt-1 text-[11.5px] text-[var(--fc-fg-subtle)]">
                Fixture replay by default — a run that makes real calls has to be asked
                for explicitly.
              </p>
              <div className="mt-3 space-y-1.5">
                {[
                  { l: "Mode", v: "fixture replay" },
                  { l: "Records in batch", v: "128" },
                  { l: "Consent verified", v: "128 / 128" },
                  { l: "Third-party gate", v: "6 held for a human" },
                  { l: "Reached", v: "94" },
                  { l: "Unreached", v: "28" },
                  { l: "Held", v: "6" },
                ].map((r) => (
                  <div
                    key={r.l}
                    className="flex items-center justify-between rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5 text-[12px]"
                  >
                    <span className="text-[var(--fc-fg-muted)]">{r.l}</span>
                    <span className="font-semibold tabular-nums">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== INTEGRATIONS =================== */}
      {tab === "prep" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-4">
            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <CalendarClock className="size-4 text-[var(--color-brand-500)]" />
                Meeting preparation
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                Everything the agent needs before the call connects, pulled from the
                CRM, the billing system, the schedule and the consent record.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {MEETING_PREPS.map((b) => (
                  <button
                    key={b.contact}
                    onClick={() => setPrepId(b.contact)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                      prepId === b.contact
                        ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                        : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    {b.contact}
                  </button>
                ))}
              </div>

              {(() => {
                const brief = MEETING_PREPS.find((b) => b.contact === prepId)!;
                return (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Avatar name={brief.contact} hue={226} size={34} />
                        <span className="text-[13.5px] font-semibold">
                          {brief.contact}
                        </span>
                        <span className="text-[11.5px] text-[var(--fc-fg-muted)]">
                          {brief.company}
                        </span>
                        <Badge tone="accent">{brief.reason}</Badge>
                      </div>
                      <div className="mt-2.5 rounded-lg border-l-2 border-[var(--color-brand-500)] bg-[var(--fc-surface)] px-3 py-2">
                        <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                          Suggested opening
                        </div>
                        <p className="mt-1 text-[12.5px] leading-relaxed">
                          {brief.opening}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-1.5">
                      {brief.items.map((it) => (
                        <li
                          key={it.id}
                          className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone={
                                it.source === "consent"
                                  ? it.value.includes("not")
                                    ? "danger"
                                    : "success"
                                  : it.source === "billing"
                                  ? "signal"
                                  : "accent"
                              }
                            >
                              {it.source}
                            </Badge>
                            <span className="text-[12px] font-semibold">
                              {it.label}
                            </span>
                            <span className="ml-auto text-[12px] font-semibold">
                              {it.value}
                            </span>
                          </div>
                          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                            {it.note}
                          </p>
                        </li>
                      ))}
                    </ul>

                    <div className="rounded-xl border border-[var(--color-signal-500)]/25 bg-[var(--color-signal-500)]/[0.06] p-3.5">
                      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.13em] text-[var(--color-signal-500)]">
                        <AlertTriangle className="size-3.5" />
                        Risks on this call
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {brief.risks.map((r) => (
                          <li
                            key={r}
                            className="flex items-start gap-2 text-[12px] leading-relaxed"
                          >
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-signal-500)]" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <ClipboardCheck className="size-4 text-[var(--color-violet-500)]" />
                Transcript reliability gate
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                An offline auditor that looks for the shapes a speech recogniser
                makes when it goes wrong — a loop, a boilerplate phantom, a run of
                one speaker, a harm category nobody escalated. It reports what it
                saw; it is not a certificate of accuracy.
              </p>

              {(() => {
                const audit = auditTranscript(generated.utterances);
                return (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
                      <span
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-[12px] font-bold tracking-wide",
                          audit.grade === "RELIABLE"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : audit.grade === "SUSPECT"
                            ? "bg-[var(--color-signal-500)]/15 text-[var(--color-signal-500)]"
                            : "bg-rose-500/15 text-rose-500",
                        )}
                      >
                        {audit.grade}
                      </span>
                      <span className="text-[13px] font-semibold">
                        {audit.score} / 100
                      </span>
                      <span className="min-w-0 flex-1 text-[11.5px] text-[var(--fc-fg-muted)]">
                        {audit.note}
                      </span>
                    </div>

                    {audit.symptoms.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-dashed border-[var(--fc-line)] p-4 text-center text-[12px] text-[var(--fc-fg-subtle)]">
                        No hallucination symptoms visible in the text.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {audit.symptoms.map((s) => (
                          <li
                            key={s.id}
                            className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[12.5px] font-semibold">
                                {s.label}
                              </span>
                              <Badge
                                tone={s.severity === "major" ? "danger" : "signal"}
                              >
                                {s.severity}
                              </Badge>
                              <span className="ml-auto text-[10.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                                −{s.weight}
                              </span>
                            </div>
                            <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                              {s.detail}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <ShieldCheck className="size-4 text-emerald-500" />
                Policy and limits
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                The rules the platform enforces, and where the enforcement lives. A
                rule enforced only in the application is not a rule.
              </p>
              <ul className="mt-4 space-y-2">
                {POLICY_LIMITS.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] font-semibold">{p.title}</span>
                      <Badge tone={p.severity === "hard" ? "danger" : "neutral"}>
                        {p.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed">{p.rule}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {p.enforcement}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <CalendarClock className="size-4 text-[var(--color-accent-500)]" />
                Setup wizard
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                The description of the call becomes probing questions and a
                checklist, and the calendar comes with it.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {MEETING_WIZARDS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setWizardId(w.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                      wizardId === w.id
                        ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                        : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    {w.title}
                  </button>
                ))}
              </div>

              {(() => {
                const w = MEETING_WIZARDS.find((x) => x.id === wizardId)!;
                return (
                  <div className="mt-3 space-y-3">
                    <p className="text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {w.description}
                    </p>

                    <div>
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                        Probing questions
                      </span>
                      <ol className="mt-1.5 space-y-1">
                        {w.probingQuestions.map((q, i) => (
                          <li
                            key={q}
                            className="flex items-start gap-2 text-[11.5px] leading-relaxed"
                          >
                            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)]/12 text-[9px] font-bold text-[var(--color-brand-500)]">
                              {i + 1}
                            </span>
                            {q}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                        Checklist
                      </span>
                      <ul className="mt-1.5 space-y-1">
                        {w.checklist.map((c) => (
                          <li
                            key={c.id}
                            className="flex items-center gap-2 rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5"
                          >
                            <span
                              className={cn(
                                "grid size-4 shrink-0 place-items-center rounded text-[9px] font-bold",
                                c.done
                                  ? "bg-emerald-500 text-white"
                                  : "border border-[var(--fc-line)] text-[var(--fc-fg-subtle)]",
                              )}
                            >
                              {c.done ? "✓" : ""}
                            </span>
                            <span className="min-w-0 flex-1 text-[11.5px]">
                              {c.item}
                            </span>
                            <Badge>{c.owner}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                        Calendar
                      </span>
                      <ul className="mt-1.5 space-y-1">
                        {w.calendar.map((c) => (
                          <li
                            key={c.id}
                            className="flex items-center gap-2 rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5"
                          >
                            <span className="text-[11.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                              {c.startsAt}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[11.5px]">
                              {c.title}
                            </span>
                            {c.synced && <Badge tone="success">synced</Badge>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Radio className="size-4 text-[var(--color-brand-500)]" />
                Recording history
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                Local-first: every recording with its transcript, its summary and
                its metrics, exportable as one markdown file.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {RECORDING_HISTORY.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRecordingId(r.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                      recordingId === r.id
                        ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                        : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    {r.contact}
                  </button>
                ))}
              </div>

              {(() => {
                const rec = RECORDING_HISTORY.find((x) => x.id === recordingId)!;
                const moments = BOOKMARKED_MOMENTS.filter(
                  (m) => m.recordingId === rec.id,
                );
                return (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                        <span className="font-semibold">{rec.contact}</span>
                        <Badge>{rec.channel}</Badge>
                        <span className="tabular-nums text-[var(--fc-fg-subtle)]">
                          {formatDuration(rec.durationSec)}
                        </span>
                        <span className="ml-auto text-[var(--fc-fg-subtle)]">
                          {rec.startedAt.slice(0, 10)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                        {rec.summaryText}
                      </p>
                      <p className="mt-1.5 font-mono text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {rec.metricsText}
                      </p>
                    </div>

                    {moments.length > 0 && (
                      <div>
                        <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                          Bookmarked moments
                        </span>
                        <ul className="mt-1.5 space-y-1.5">
                          {moments.map((m) => (
                            <li
                              key={m.id}
                              className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[11.5px] font-semibold">
                                  {m.label}
                                </span>
                                <span className="ml-auto text-[10.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                                  {formatDuration(m.atSec)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--fc-fg-muted)]">
                                {m.note}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <pre className="fc-scroll-thin max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3 font-mono text-[10.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {rec.transcriptText}
                    </pre>

                    <button
                      onClick={() => {
                        downloadFile(
                          `${rec.contact.toLowerCase().replace(/\s+/g, "-")}-${rec.startedAt.slice(0, 10)}.md`,
                          recordingToMarkdown(rec),
                        );
                        toast.success("Exported", "Transcript, summary and metrics.");
                      }}
                      className="btn btn-secondary btn-sm w-full"
                    >
                      <Download className="size-3.5" />
                      Export markdown
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Zap className="size-4 text-[var(--color-violet-500)]" />
                MCP auto-trigger
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                When a caller says something that matches a rule, the tool fires by
                itself and the answer lands on the assist card.
              </p>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11.5px] font-semibold">
                  Test a live utterance
                </span>
                <textarea
                  className="field min-h-[64px] resize-y text-[12.5px]"
                  value={triggerProbe}
                  onChange={(e) => setTriggerProbe(e.target.value)}
                />
              </label>

              {(() => {
                const hits = matchAutoTriggers(triggerProbe);
                return (
                  <div className="mt-3">
                    {hits.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[var(--fc-line)] p-4 text-center text-[12px] text-[var(--fc-fg-subtle)]">
                        Nothing matched. The call continues with no tool fired.
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {hits.map((t) => (
                          <li
                            key={t.id}
                            className="rounded-xl border border-[var(--color-violet-500)]/25 bg-[var(--color-violet-500)]/[0.07] p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="violet">{t.server}</Badge>
                              <code className="font-mono text-[11.5px] font-bold">
                                {t.tool}
                              </code>
                              <span className="ml-auto text-[10.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                                {t.latencyMs}ms
                              </span>
                            </div>
                            <p className="mt-1 text-[11.5px] leading-relaxed">
                              {t.action}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {t.keywords.map((k) => (
                                <span
                                  key={k}
                                  className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 font-mono text-[10px]"
                                >
                                  {k}
                                </span>
                              ))}
                              {t.consent === "required" && (
                                <Badge tone="danger">consent required</Badge>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}

              <div className="mt-4 space-y-2">
                {AUTO_TRIGGERS.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{t.server}</Badge>
                      <code className="font-mono text-[11px] font-bold">
                        {t.tool}
                      </code>
                      {t.consent === "required" && (
                        <Badge tone="danger">consent</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {t.when}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Workflow plugins</h2>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              When a call ends, the result is pushed into the tools your team already
              uses.
            </p>
            <ul className="mt-4 space-y-2">
              {WORKFLOW_PLUGINS.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2.5"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.platform.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{p.platform}</div>
                    <div className="text-[11.5px] text-[var(--fc-fg-muted)]">
                      {p.description}
                    </div>
                  </div>
                  <Badge>{p.kind}</Badge>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                Events
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "call.ended",
                  "call.transferred",
                  "call.missed",
                  "call.assisted",
                  "agent.available",
                  "queue.entered",
                ].map((e) => (
                  <span key={e} className="chip font-mono text-[10.5px]">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">MCP tools during a call</h2>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              The agent detects an information need and calls the tool itself. The
              result is shown inline, as markdown, links and structured data.
            </p>
            <ul className="mt-4 space-y-2.5">
              {MCP_TOOLS.map((t) => (
                <li
                  key={t.name}
                  className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-[12px] font-bold text-[var(--color-brand-500)]">
                      {t.name}
                    </code>
                    <Badge tone="violet">{t.server}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {t.description}
                  </p>
                  <p className="mt-1.5 text-[11.5px] italic text-[var(--fc-fg-subtle)]">
                    Fires when: {t.trigger}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {t.schema.map((s) => (
                      <span
                        key={s.name}
                        className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 font-mono text-[10px]"
                      >
                        {s.name}:{s.type}
                        {s.required ? "*" : ""}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                Inline result
              </div>
              <pre className="fc-scroll-thin max-h-40 overflow-auto rounded-lg border border-[var(--fc-line)] bg-[#0d1024] p-3 font-mono text-[10.5px] leading-relaxed text-emerald-300">
{`→ search_docs({ "query": "duplicate charge refund window" })

{
  "guide": "Billing → Duplicate charges",
  "answer": "A duplicate charge is refunded automatically when detected
             within 30 days of the invoice date.",
  "source": "billing/duplicate-charges",
  "readMore": "https://docs.friendconnect.test/billing/duplicate-charges"
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- outbound modal ---------------- */}
      <Modal
        open={recipeOpen}
        onClose={() => setRecipeOpen(false)}
        title="Plan an outbound call"
        description="Pick a recipe, attach the consent artefact, and the scheduler does the rest."
        size="md"
        footer={
          <button onClick={() => setRecipeOpen(false)} className="btn btn-ghost btn-sm">
            Close
          </button>
        }
      >
        <div className="space-y-3">
          {OUTBOUND_RECIPES.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRecipeId(r.id);
                setRecipeOpen(false);
              }}
              className="flex w-full items-start gap-3 rounded-xl border border-[var(--fc-line)] px-3 py-3 text-left transition-colors hover:bg-[var(--fc-surface-2)]"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-500)]/12 text-[var(--color-accent-500)]">
                <PhoneCall className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">{r.name}</span>
                <span className="block text-[11.5px] text-[var(--fc-fg-muted)]">
                  {r.purpose}
                </span>
              </span>
              <ChevronRight className="mt-1 size-4 shrink-0 text-[var(--fc-fg-subtle)]" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
