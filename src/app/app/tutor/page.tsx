"use client";

import * as React from "react";
import {
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Headphones,
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Star,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard, FilterChip } from "@/components/app/PageHeader";
import { Badge, Progress } from "@/components/ui/primitives";
import {
  BUDDY_STAGES,
  CERTIFICATES,
  CLOZE_ITEMS,
  DICTIONARY,
  EXAM_TRACKS,
  LEARNER_PROFILES,
  PRACTICE_QUESTIONS,
  REFLECTION_REPORTS,
  SPEAKING_TOPICS,
  SPEECH_PIPELINE,
  TUTOR_LESSONS,
  TUTOR_LEVELS,
} from "@/lib/data/tutor";
import { analyseSentence, predictMasked, tutorReply } from "@/lib/tutor";
import { cn } from "@/lib/utils";
import { useToast } from "@/store/useUI";

export default function TutorPage() {
  const toast = useToast();
  const [profileId, setProfileId] = React.useState(LEARNER_PROFILES[0].id);
  const [levelId, setLevelId] = React.useState("l1");
  const [tab, setTab] = React.useState<
    "map" | "speak" | "practice" | "words" | "exam"
  >("map");
  const [sentence, setSentence] = React.useState("i have a apple and two books");
  const [recording, setRecording] = React.useState(false);
  const [recordSec, setRecordSec] = React.useState(0);
  const [wordIndex, setWordIndex] = React.useState(0);
  const [answer, setAnswer] = React.useState<number | null>(null);
  const [speakingTopic, setSpeakingTopic] = React.useState(SPEAKING_TOPICS[0].id);
  const [clozeId, setClozeId] = React.useState(CLOZE_ITEMS[0].id);
  const [clozePick, setClozePick] = React.useState<string | null>(null);
  const [reportId, setReportId] = React.useState(REFLECTION_REPORTS[0].id);

  const profile = LEARNER_PROFILES.find((p) => p.id === profileId)!;
  const level = TUTOR_LEVELS.find((l) => l.id === levelId)!;
  const analysis = React.useMemo(() => analyseSentence(sentence), [sentence]);
  const question = PRACTICE_QUESTIONS[wordIndex % PRACTICE_QUESTIONS.length];
  const topic = SPEAKING_TOPICS.find((t) => t.id === speakingTopic)!;

  const timer = React.useRef<number>(0);
  React.useEffect(() => {
    if (!recording) return;
    timer.current = window.setInterval(
      () => setRecordSec((s) => s + 1),
      1000,
    );
    return () => window.clearInterval(timer.current);
  }, [recording]);

  const unlockedLevel = TUTOR_LEVELS.find(
    (l) => TUTOR_LEVELS.indexOf(l) <= TUTOR_LEVELS.indexOf(TUTOR_LEVELS.find((x) => x.id === profile.levelId)!),
  );

  return (
    <div className="mx-auto max-[1700px]">
      <PageHeader
        eyebrow="Education"
        title="Language tutor"
        description="A voice-first English tutor that runs entirely on your own machine — a seven-level map, a fully local speech pipeline, one correction at a time, and a dictionary that works offline."
        actions={
          <div className="flex gap-1.5">
            {LEARNER_PROFILES.map((p) => (
              <button
                key={p.id}
                onClick={() => setProfileId(p.id)}
                className={cn(
                  "btn btn-sm",
                  profileId === p.id ? "btn-primary" : "btn-secondary",
                )}
              >
                <span className="text-[14px]">{p.avatar}</span>
                {p.name}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Words known"
          value={profile.wordsKnown}
          deltaLabel={`of ${profile.wordsTotal} in the offline dictionary`}
          icon={<BookOpen className="size-4" />}
        />
        <StatCard
          label="Accuracy"
          value={`${Math.round(profile.accuracy * 100)}%`}
          deltaLabel="across every practice answer"
          icon={<Check className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Streak"
          value={`${profile.streak} days`}
          deltaLabel={`${profile.minutesToday} minutes today`}
          icon={<Flame className="size-4" />}
          tone="signal"
        />
        <StatCard
          label="Certificates"
          value={profile.certificates}
          deltaLabel={`${profile.magic} magic points`}
          icon={<Award className="size-4" />}
          tone="success"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(
          [
            { id: "map", label: "Learning map", icon: BookOpen },
            { id: "speak", label: "Speaking", icon: Mic },
            { id: "practice", label: "Practice", icon: Zap },
            { id: "words", label: "Dictionary", icon: Volume2 },
            { id: "exam", label: "Exam lab", icon: Award },
          ] as const
        ).map((t) => (
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

      {/* =================== MAP =================== */}
      {tab === "map" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Seven levels</h2>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              A lesson unlocks at 60 points. Downloading higher-level audio never
              unlocks a lesson — progress comes from the practice.
            </p>
            <div className="mt-4 space-y-3">
              {TUTOR_LEVELS.map((l) => {
                const lessons = TUTOR_LESSONS.filter((x) => x.levelId === l.id);
                const done = lessons.filter((x) => x.unlocked).length;
                const active = l.id === levelId;
                const locked = TUTOR_LEVELS.findIndex((x) => x.id === l.id) >
                  TUTOR_LEVELS.findIndex((x) => x.id === profile.levelId) + 1;
                return (
                  <div
                    key={l.id}
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      active
                        ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.05]"
                        : "border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
                      locked && "opacity-60",
                    )}
                  >
                    <button
                      onClick={() => setLevelId(l.id)}
                      className="flex w-full flex-wrap items-center gap-3 text-left"
                    >
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-xl text-[18px]"
                        style={{ backgroundColor: `${l.colour}22` }}
                      >
                        {l.zoneEmoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13.5px] font-semibold">{l.zone}</span>
                          <Badge tone="accent">{l.cefr}</Badge>
                          {locked && <Badge tone="neutral">locked</Badge>}
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-[var(--fc-fg-muted)]">
                          {l.summary}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold tabular-nums">
                          {done}/{lessons.length}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          lessons
                        </div>
                      </div>
                    </button>

                    {active && (
                      <ul className="mt-3 space-y-1.5 border-t border-[var(--fc-line)] pt-3">
                        {lessons.map((ls) => (
                          <li
                            key={ls.id}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-2.5 py-1.5"
                          >
                            <span className="text-[12px] font-semibold">{ls.title}</span>
                            <Badge>{ls.topic}</Badge>
                            <span className="text-[10.5px] text-[var(--fc-fg-subtle)]">
                              {ls.words} words · {ls.sentences} sentences · {ls.minutes} min
                            </span>
                            {ls.starred && (
                              <Star className="size-3 fill-[var(--color-signal-500)] text-[var(--color-signal-500)]" />
                            )}
                            <span
                              className={cn(
                                "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                                ls.unlocked
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)]",
                              )}
                            >
                              {ls.unlocked ? "unlocked" : "locked"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <Headphones className="size-4 text-[var(--color-accent-500)]" />
                The local speech pipeline
              </h3>
              <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
                Nothing is uploaded. Recording, recognition, synthesis and the dialogue
                all run on this machine.
              </p>
              <ol className="mt-4 space-y-2">
                {SPEECH_PIPELINE.map((p, i) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)] text-[9px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-[12.5px] font-semibold">{p.label}</span>
                      <Badge tone="success">offline</Badge>
                      <span className="ml-auto text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {p.technology}
                      </span>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {p.detail}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Your buddy</h3>
              <div className="mt-3 space-y-2">
                {BUDDY_STAGES.map((s) => {
                  const reached = profile.magic >= s.threshold;
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-2",
                        reached
                          ? "border-[var(--fc-line)] bg-[var(--fc-surface-2)]"
                          : "border-dashed border-[var(--fc-line)] opacity-55",
                      )}
                    >
                      <span className="text-[22px]">{s.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold">{s.name}</span>
                        <span className="block text-[11px] text-[var(--fc-fg-muted)]">
                          {s.description}
                        </span>
                      </span>
                      <span className="text-[11px] tabular-nums text-[var(--fc-fg-subtle)]">
                        {s.threshold}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3">
                <Progress
                  value={(profile.magic / 1500) * 100}
                  tone="accent"
                />
                <p className="mt-1.5 text-[11px] text-[var(--fc-fg-subtle)]">
                  {profile.magic} magic points · next stage at 1,500
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== SPEAK =================== */}
      {tab === "speak" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="fc-card p-5">
            <h2 className="text-[15px] font-semibold">Speak it back</h2>
            <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
              The tutor hears one mistake at a time. Say the sentence, and it will
              tell you exactly what to change.
            </p>

            <div className="mt-4 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{level.cefr}</Badge>
                <Badge>{level.name}</Badge>
                <span className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                  estimated level for your sentence
                </span>
              </div>
              <textarea
                className="field mt-3 min-h-[84px] resize-y text-[14px]"
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="Type what you would say…"
              />

              {analysis.corrections.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {analysis.corrections.map((c, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-2.5 py-1.5 text-[12px]"
                    >
                      <Badge
                        tone={
                          c.severity === "must"
                            ? "danger"
                            : c.severity === "should"
                            ? "signal"
                            : "neutral"
                        }
                      >
                        {c.kind}
                      </Badge>
                      <span className="font-mono line-through opacity-60">{c.wrong}</span>
                      <ChevronRight className="size-3 text-[var(--fc-fg-subtle)]" />
                      <span className="font-mono font-semibold text-emerald-500">
                        {c.right}
                      </span>
                      <span className="min-w-0 flex-1 text-[11.5px] text-[var(--fc-fg-muted)]">
                        {c.why}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 rounded-xl border border-[var(--color-violet-500)]/25 bg-[var(--color-violet-500)]/[0.07] p-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--color-violet-500)]">
                  <Wand2 className="size-3.5" />
                  What the tutor would say
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed">
                  {tutorReply(analysis)}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[11.5px] text-[var(--fc-fg-subtle)]">
                <span>CEFR {analysis.cefr}</span>
                <span>confidence {Math.round(analysis.confidence * 100)}%</span>
                <span>
                  length {analysis.lengthOk ? "good" : "adjust"}
                </span>
              </div>
              {analysis.notes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {analysis.notes.map((n) => (
                    <li key={n} className="text-[11.5px] text-[var(--fc-fg-muted)]">
                      · {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Record and compare</h3>
              <div className="mt-3 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4 text-center">
                {recording ? (
                  <>
                    <span className="mx-auto grid size-14 place-items-center rounded-full bg-rose-500/15 text-rose-500">
                      <span className="size-3 animate-pulse rounded-full bg-rose-500" />
                    </span>
                    <p className="mt-2 text-[13px] font-semibold tabular-nums">
                      Recording · 0:{String(recordSec).padStart(2, "0")}
                    </p>
                    <div className="mt-2 flex h-6 items-end justify-center gap-[2px]">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <span
                          key={i}
                          className="w-[2px] rounded-full bg-rose-500/60"
                          style={{
                            height: `${4 + ((i * 19 + recordSec * 11) % 18)}px`,
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setRecording(false);
                        toast.success("Recorded", "Compare it with the model next.");
                      }}
                      className="btn btn-primary btn-sm mt-3"
                    >
                      <Square className="size-3.5" />
                      Stop
                    </button>
                  </>
                ) : (
                  <>
                    <span className="mx-auto grid size-14 place-items-center rounded-full bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]">
                      <Mic className="size-6" />
                    </span>
                    <p className="mt-2 text-[12.5px] text-[var(--fc-fg-muted)]">
                      Your recording stays in this session only.
                    </p>
                    <button
                      onClick={() => {
                        setRecordSec(0);
                        setRecording(true);
                      }}
                      className="btn btn-primary btn-sm mt-3"
                    >
                      <Mic className="size-3.5" />
                      Record
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Speaking topics</h3>
              <ul className="mt-3 space-y-1.5">
                {SPEAKING_TOPICS.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setSpeakingTopic(t.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                        speakingTopic === t.id
                          ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)]/[0.06]"
                          : "border-[var(--fc-line)] hover:bg-[var(--fc-surface-2)]",
                      )}
                    >
                      <span className="text-[16px]">{t.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold">{t.title}</span>
                        <span className="block truncate text-[11px] text-[var(--fc-fg-muted)]">
                          {t.prompt}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-[var(--fc-fg-subtle)]">
                        {t.seconds}s
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =================== PRACTICE =================== */}
      {tab === "practice" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="fc-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-semibold">{question.prompt}</h2>
              <Badge tone="accent">{question.kind.replace(/-/g, " ")}</Badge>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
              <div className="flex items-center gap-2.5">
                <button className="grid size-9 place-items-center rounded-full bg-[var(--color-brand-500)] text-white">
                  <Play className="size-4 fill-white" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">{question.audioLabel}</div>
                  <div className="text-[11px] text-[var(--fc-fg-subtle)]">
                    Pre-generated audio, 0.8× / 1.0× / 1.2×
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {question.options.map((o, i) => (
                <button
                  key={o}
                  onClick={() => setAnswer(i)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left text-[13px] transition-colors",
                    answer === i
                      ? answer === question.answer
                        ? "border-emerald-500 bg-emerald-500/[0.08] font-semibold text-emerald-600"
                        : "border-rose-500 bg-rose-500/[0.08] font-semibold text-rose-500"
                      : "border-[var(--fc-line)] hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>

            {answer !== null && (
              <div
                className={cn(
                  "mt-4 rounded-xl border p-3.5",
                  answer === question.answer
                    ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                    : "border-amber-500/30 bg-amber-500/[0.06]",
                )}
              >
                <div className="flex items-center gap-2 text-[12.5px] font-semibold">
                  {answer === question.answer ? (
                    <>
                      <Check className="size-4 text-emerald-500" /> Correct — +3 points
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-4 text-amber-500" /> Not quite. Hint:{" "}
                      {question.hint}
                    </>
                  )}
                </div>
                <p className="mt-1 text-[11.5px] text-[var(--fc-fg-muted)]">
                  The saved answer state survives a refresh, so you can close the page
                  and come back to the same question.
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setAnswer(null);
                  setWordIndex((i) => i + 1);
                }}
                className="btn btn-primary btn-sm"
              >
                Next question
                <ChevronRight className="size-3.5" />
              </button>
              <button
                onClick={() => setAnswer(null)}
                className="btn btn-secondary btn-sm"
              >
                Use a hint (−5)
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Scoring</h3>
              <ul className="mt-3 space-y-1.5 text-[12.5px] text-[var(--fc-fg-muted)]">
                {[
                  "A lesson passes at 60 points.",
                  "Each correct answer is +3; each hint is −5.",
                  "The bonus never drops below zero.",
                  "Replaying a passed lesson does not pay the bonus twice.",
                  "Saved drafts for questions that no longer apply are discarded.",
                ].map((r) => (
                  <li key={r} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Progress</h3>
              <div className="mt-3 space-y-3">
                {TUTOR_LEVELS.map((l) => {
                  const lessons = TUTOR_LESSONS.filter((x) => x.levelId === l.id);
                  const done = lessons.filter((x) => x.unlocked).length;
                  return (
                    <div key={l.id}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="truncate text-[var(--fc-fg-muted)]">
                          {l.zoneEmoji} {l.name}
                        </span>
                        <span className="tabular-nums">
                          {done}/{lessons.length}
                        </span>
                      </div>
                      <div className="mt-1">
                        <Progress
                          value={(done / Math.max(1, lessons.length)) * 100}
                          tone="accent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== EXAM =================== */}
      {tab === "exam" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-4">
            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Sparkles className="size-4 text-[var(--color-violet-500)]" />
                Masked-language cloze
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                The standard business-English gap fill. The token is masked, the
                offline model ranks the candidates against the context, and you
                check whether the top guess was right.
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {CLOZE_ITEMS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClozeId(c.id);
                      setClozePick(null);
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                      clozeId === c.id
                        ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                        : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    {c.track.toUpperCase()} · {c.level}
                  </button>
                ))}
              </div>

              {(() => {
                const item = CLOZE_ITEMS.find((c) => c.id === clozeId)!;
                const candidates = [item.answer, ...item.distractors];
                const prediction = predictMasked(item.passage, candidates);
                return (
                  <div className="mt-4">
                    <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                      <p className="text-[14.5px] leading-[1.9]">
                        {item.passage.split("___")[0]}
                        <span className="mx-1 rounded bg-[var(--color-violet-500)]/15 px-2 py-0.5 font-mono text-[13px] font-bold text-[var(--color-violet-500)]">
                          ▁▁▁
                        </span>
                        {item.passage.split("___")[1] ?? ""}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {candidates.map((cand) => {
                        const rank =
                          prediction.ranked.findIndex((r) => r.candidate === cand) + 1;
                        const chosen = clozePick === cand;
                        const right = cand === item.answer;
                        return (
                          <button
                            key={cand}
                            onClick={() => setClozePick(cand)}
                            className={cn(
                              "rounded-xl border px-3 py-3 text-left transition-colors",
                              chosen
                                ? right
                                  ? "border-emerald-500 bg-emerald-500/[0.08]"
                                  : "border-rose-500 bg-rose-500/[0.08]"
                                : "border-[var(--fc-line)] hover:bg-[var(--fc-surface-2)]",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold">
                                {cand}
                              </span>
                              <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                                rank {rank}
                              </span>
                            </div>
                            <div className="mt-1.5">
                              <Progress
                                value={
                                  (prediction.ranked.find((r) => r.candidate === cand)
                                    ?.score ?? 0) * 100
                                }
                                tone={rank === 1 ? "accent" : "brand"}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px] text-[var(--fc-fg-subtle)]">
                      <span>confidence {prediction.confidence}</span>
                      <span>margin {prediction.margin}</span>
                      <Badge
                        tone={
                          prediction.ranked[0]?.candidate === item.answer
                            ? "success"
                            : "danger"
                        }
                      >
                        model top guess:{" "}
                        {prediction.ranked[0]?.candidate}
                      </Badge>
                    </div>

                    {clozePick && (
                      <div
                        className={cn(
                          "mt-3 rounded-xl border p-3.5",
                          clozePick === item.answer
                            ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                            : "border-amber-500/30 bg-amber-500/[0.06]",
                        )}
                      >
                        <div className="text-[12.5px] font-semibold">
                          {clozePick === item.answer
                            ? "Correct — that is the collocation."
                            : `Not quite. The answer is “${item.answer}”.`}
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                          {item.gloss}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="fc-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                <Award className="size-4 text-[var(--color-signal-500)]" />
                Exam tracks
              </h2>
              <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                Three tracks, section by section, with the scoring bands that decide
                what a result means.
              </p>
              <div className="mt-4 space-y-3">
                {EXAM_TRACKS.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold">{t.name}</span>
                      <Badge>{t.body}</Badge>
                      <Badge tone="accent">
                        {t.totalMinutes} min · {t.totalQuestions} questions
                      </Badge>
                    </div>
                    <div className="mt-2.5 overflow-x-auto">
                      <table className="w-full text-left text-[11.5px]">
                        <thead className="text-[10px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          <tr>
                            <th className="py-1.5 pr-3 font-semibold">Section</th>
                            <th className="py-1.5 pr-3 font-semibold">Time</th>
                            <th className="py-1.5 pr-3 font-semibold">Questions</th>
                            <th className="py-1.5 font-semibold">Format</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--fc-line)]">
                          {t.sections.map((sec) => (
                            <tr key={sec.name}>
                              <td className="py-1.5 pr-3 font-semibold">
                                {sec.name}
                              </td>
                              <td className="py-1.5 pr-3 tabular-nums">
                                {sec.minutes}m
                              </td>
                              <td className="py-1.5 pr-3 tabular-nums">
                                {sec.questions}
                              </td>
                              <td className="py-1.5 text-[var(--fc-fg-muted)]">
                                {sec.detail}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {t.bands.map((b) => (
                        <span
                          key={b.label}
                          className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-2 py-1 text-[10.5px]"
                        >
                          <span className="font-semibold">{b.label}</span>
                          {b.min && (
                            <span className="ml-1.5 text-[var(--fc-fg-subtle)]">
                              {b.min}
                            </span>
                          )}
                          {b.note && (
                            <span className="ml-1.5 text-[var(--fc-fg-muted)]">
                              {b.note}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Reflection report</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REFLECTION_REPORTS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setReportId(r.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                      reportId === r.id
                        ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                        : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    {r.learner}
                  </button>
                ))}
              </div>

              {(() => {
                const r = REFLECTION_REPORTS.find((x) => x.id === reportId)!;
                return (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3.5">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                        {r.period}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed">{r.headline}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {r.evidence.map((e) => (
                        <div
                          key={e.label}
                          className="rounded-xl border border-[var(--fc-line)] px-3 py-2"
                        >
                          <div className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                            {e.label}
                          </div>
                          <div className="mt-0.5 flex items-baseline gap-2">
                            <span className="text-[15px] font-semibold">{e.value}</span>
                            <span className="text-[11px] text-emerald-500">
                              {e.change}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-emerald-500">
                        What improved
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {r.strengths.map((s) => (
                          <li
                            key={s}
                            className="flex items-start gap-2 text-[11.5px] leading-relaxed"
                          >
                            <Check className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-[var(--color-signal-500)]/25 bg-[var(--color-signal-500)]/[0.06] p-3">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--color-signal-500)]">
                        What to work on
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {r.focus.map((s) => (
                          <li
                            key={s}
                            className="flex items-start gap-2 text-[11.5px] leading-relaxed"
                          >
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-signal-500)]" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p className="rounded-xl border-l-2 border-[var(--color-brand-500)] bg-[var(--fc-surface-2)] px-3 py-2 text-[12px] italic leading-relaxed text-[var(--fc-fg-muted)]">
                      “{r.quote}”
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Certificates</h3>
              <ul className="mt-3 space-y-2">
                {CERTIFICATES.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Award className="size-3.5 text-[var(--color-signal-500)]" />
                      <span className="text-[12.5px] font-semibold">{c.learner}</span>
                      <Badge
                        tone={
                          c.kind === "exam"
                            ? "accent"
                            : c.kind === "milestone"
                            ? "violet"
                            : "success"
                        }
                      >
                        {c.kind}
                      </Badge>
                      <span className="ml-auto text-[10.5px] text-[var(--fc-fg-subtle)]">
                        {c.issuedAt}
                      </span>
                    </div>
                    <div className="mt-1 text-[12.5px]">{c.title}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--fc-fg-muted)]">
                      {c.score} · {c.expiresAt}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =================== WORDS =================== */}
      {tab === "words" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="fc-card overflow-hidden">
            <div className="border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-5 py-3">
              <h2 className="text-[15px] font-semibold">Offline dictionary</h2>
              <p className="text-[11.5px] text-[var(--fc-fg-subtle)]">
                {DICTIONARY.length} entries in this preview · 1,074 in the full offline
                pack, normalised and de-duplicated.
              </p>
            </div>
            <ul className="divide-y divide-[var(--fc-line)]">
              {DICTIONARY.map((w) => (
                <li key={w.word} className="flex flex-wrap items-center gap-2.5 px-5 py-3">
                  <span className="min-w-[120px]">
                    <span className="block text-[13.5px] font-semibold">{w.word}</span>
                    <span className="block font-mono text-[10.5px] text-[var(--fc-fg-subtle)]">
                      {w.ipa}
                    </span>
                  </span>
                  <Badge tone="accent">{w.level}</Badge>
                  <Badge>{w.pos}</Badge>
                  <span className="min-w-0 flex-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                    {w.meaning}
                  </span>
                  <span className="text-[12px] text-[var(--fc-fg-subtle)]">{w.chinese}</span>
                  <button className="grid size-7 place-items-center rounded-lg bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)]">
                    <Volume2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Word cards</h3>
              <p className="mt-1 text-[11.5px] text-[var(--fc-fg-muted)]">
                Saved words get their own card, and come back for review.
              </p>
              <div className="mt-3 space-y-1.5">
                {DICTIONARY.slice(0, 4).map((w) => (
                  <div
                    key={w.word}
                    className="flex items-center gap-2 rounded-lg border border-[var(--fc-line)] px-2.5 py-1.5"
                  >
                    <Star className="size-3 fill-[var(--color-signal-500)] text-[var(--color-signal-500)]" />
                    <span className="text-[12px] font-semibold">{w.word}</span>
                    <span className="ml-auto text-[10.5px] text-[var(--fc-fg-subtle)]">
                      review in 2 days
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="fc-card p-5">
              <h3 className="text-[15px] font-semibold">Offline audio</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                1,721 pre-generated files, about 25 MB, covering the lessons, the
                listening questions, the lesson words and every dictionary
                pronunciation. Downloading them never unlocks a level.
              </p>
              <div className="mt-3">
                <Progress value={72} tone="accent" />
                <p className="mt-1.5 text-[11px] text-[var(--fc-fg-subtle)]">
                  18.1 MB of 25.3 MB downloaded for this profile
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
