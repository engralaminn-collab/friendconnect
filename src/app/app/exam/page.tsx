"use client";

/* ============================================================
   Computer-based English test
   ------------------------------------------------------------
   A complete sitting can happen on this page:
     pick a paper → timed sections → answers and flags →
     submit → objective marking → self-assessed productive
     sections → band, CEFR and per-question review → history.

   Drafts save as you type, so closing the tab does not lose an
   attempt. Every attempt is stored in the workspace store, which
   means Bill Agent can read and grade them too.
   ============================================================ */

import * as React from "react";
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Headphones,
  ListChecks,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  Target,
  Trash2,
  Volume2,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { EXAM_PAPERS, getPaper } from "@/lib/data/exams";
import {
  answeredCount,
  emptyAttempt,
  formatBand,
  gradeAttempt,
  isObjective,
  objectiveCount,
  paperMinutes,
  productiveCount,
  wordCount,
  writingFeedback,
  type ExamAttempt,
  type ExamPaper,
  type ExamQuestion,
  type ExamSection,
} from "@/lib/exam";
import { cn, formatDate, uid } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useToast } from "@/store/useUI";

type Stage = "papers" | "runner" | "result" | "history";

function clock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const SKILL_ICON = {
  listening: Headphones,
  reading: ListChecks,
  writing: Target,
  speaking: Mic,
} as const;

export default function ExamPage() {
  const toast = useToast();
  const attempts = useStore((s) => s.examAttempts);
  const saveAttempt = useStore((s) => s.saveExamAttempt);
  const removeAttempt = useStore((s) => s.removeExamAttempt);

  const [stage, setStage] = React.useState<Stage>("papers");
  const [paper, setPaper] = React.useState<ExamPaper | null>(null);
  const [attempt, setAttempt] = React.useState<ExamAttempt | null>(null);
  const [sectionIndex, setSectionIndex] = React.useState(0);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [showScript, setShowScript] = React.useState(false);

  const section: ExamSection | null = paper?.sections[sectionIndex] ?? null;
  const question: ExamQuestion | null = section?.questions[questionIndex] ?? null;

  const started = React.useRef<number>(0);
  const submittedRef = React.useRef(false);

  const persist = React.useCallback(
    (next: ExamAttempt) => {
      setAttempt(next);
      saveAttempt(next);
    },
    [saveAttempt],
  );

  const start = (nextPaper: ExamPaper, resume?: ExamAttempt) => {
    const draft = resume ?? emptyAttempt(nextPaper.id, uid("exam"));
    submittedRef.current = false;
    setPaper(nextPaper);
    setAttempt(draft);
    setSectionIndex(0);
    setQuestionIndex(0);
    setFlags({});
    setSecondsLeft(nextPaper.sections[0].minutes * 60);
    setPaused(false);
    setShowScript(false);
    started.current = Date.now();
    setStage("runner");
    if (!resume) saveAttempt(draft);
    toast.success(resume ? "Attempt resumed" : "Timer started", nextPaper.title);
  };

  const finish = React.useCallback(
    (paperToGrade: ExamPaper, attemptToGrade: ExamAttempt) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const result = gradeAttempt(paperToGrade, attemptToGrade);
      const submitted: ExamAttempt = {
        ...attemptToGrade,
        status: "submitted",
        submittedAt: result.finishedAt,
        timeSpentSec: Math.round((Date.now() - started.current) / 1000),
        result,
      };
      persist(submitted);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      }
      setStage("result");
      toast.success(
        "Paper submitted",
        `${paperToGrade.title} — band ${paperToGrade.scale === "toefl" ? result.toeflTotal : formatBand(result.finalBand)}`,
      );
    },
    [persist, toast],
  );

  /* --------------------------- timer --------------------------- */
  React.useEffect(() => {
    if (stage !== "runner" || paused || !paper || !section || !attempt) return;
    const id = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          const last = sectionIndex >= paper.sections.length - 1;
          if (last) {
            finish(paper, attempt);
          } else {
            const nextIndex = sectionIndex + 1;
            setSectionIndex(nextIndex);
            setQuestionIndex(0);
            toast.warning(
              "Section time up",
              `Moved you to ${paper.sections[nextIndex].title}.`,
            );
            return paper.sections[nextIndex].minutes * 60;
          }
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [stage, paused, paper, section, sectionIndex, attempt, finish, toast]);

  /* Save elapsed time every 15 seconds so an interrupted attempt keeps it. */
  React.useEffect(() => {
    if (stage !== "runner" || !attempt) return;
    const id = window.setInterval(() => {
      const current = useStore.getState().examAttempts.find((item) => item.id === attempt.id);
      if (!current) return;
      saveAttempt({
        ...current,
        timeSpentSec: Math.round((Date.now() - started.current) / 1000),
      });
    }, 15_000);
    return () => window.clearInterval(id);
  }, [stage, attempt, saveAttempt]);

  /* --------------------------- speech --------------------------- */
  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.warning("No speech engine", "This browser cannot read the script aloud.");
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.lang = "en-GB";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
    setSpeaking(true);
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  React.useEffect(() => () => stopSpeech(), []);

  /* ------------------------- answering ------------------------- */
  const setAnswer = (questionId: string, patch: { selected?: string[]; text?: string }) => {
    if (!attempt) return;
    persist({
      ...attempt,
      answers: {
        ...attempt.answers,
        [questionId]: { ...attempt.answers[questionId], ...patch },
      },
    });
  };

  const toggleOption = (q: ExamQuestion, optionId: string) => {
    if (!attempt) return;
    const current = attempt.answers[q.id]?.selected ?? [];
    if (q.kind === "multi") {
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setAnswer(q.id, { selected: next });
    } else {
      setAnswer(q.id, { selected: [optionId] });
    }
  };

  const goToSection = (index: number) => {
    if (!paper) return;
    setSectionIndex(index);
    setQuestionIndex(0);
    setSecondsLeft(paper.sections[index].minutes * 60);
    stopSpeech();
    setShowScript(false);
  };

  /* --------------------------- views --------------------------- */
  const inProgress = attempts.filter((item) => item.status === "in-progress");
  const submitted = attempts.filter((item) => item.status === "submitted");

  return (
    <div>
      <PageHeader
        eyebrow="English testing"
        title="Computer-based exam room"
        description="Sit a timed paper, get the objective sections marked instantly, self-assess the productive ones against the public descriptors, and keep a band-scored history. Everything saves as you go."
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setStage("history")}>
              <Award size={14} /> {submitted.length} submitted
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setStage("papers")}>
              <Play size={14} /> Papers
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Papers" value={String(EXAM_PAPERS.length)} icon={<ListChecks size={16} />}  />
          <StatCard
            label="Objective marks"
            value={String(EXAM_PAPERS.reduce((total, item) => total + objectiveCount(item), 0))}
            icon={<Check size={16} />}
          />
          <StatCard
            label="Productive tasks"
            value={String(EXAM_PAPERS.reduce((total, item) => total + productiveCount(item), 0))}
            icon={<Mic size={16} />}
          />
          <StatCard
            label="Best band"
            value={
              submitted.length
                ? formatBand(Math.max(...submitted.map((item) => item.result?.finalBand ?? 0)))
                : "—"
            }
            icon={<Award size={16} />}

          />
        </div>
      </PageHeader>

      {stage === "papers" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {EXAM_PAPERS.map((item) => {
            const draft = inProgress.find((attemptItem) => attemptItem.paperId === item.id);
            return (
              <article key={item.id} className="fc-card flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">{item.title}</h2>
                    <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-500)]">
                      {item.level}
                    </p>
                  </div>
                  <Badge tone={item.scale === "ielts" ? "brand" : "accent"}>
                    {item.scale === "ielts" ? "IELTS" : "TOEFL"}
                  </Badge>
                </div>
                <p className="text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">{item.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  {item.sections.map((sec) => {
                    const Icon = SKILL_ICON[sec.skill];
                    return (
                      <span key={sec.id} className="chip">
                        <Icon size={12} /> {sec.title} · {sec.minutes}m
                      </span>
                    );
                  })}
                </div>

                <dl className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-center">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">Time</dt>
                    <dd className="text-sm font-bold">{paperMinutes(item)}m</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">Marked</dt>
                    <dd className="text-sm font-bold">{objectiveCount(item)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">Tasks</dt>
                    <dd className="text-sm font-bold">{productiveCount(item)}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-wrap gap-2">
                  <button className="btn btn-primary btn-sm" onClick={() => start(item)}>
                    <Play size={14} /> {draft ? "Start again" : "Start paper"}
                  </button>
                  {draft && (
                    <button className="btn btn-secondary btn-sm" onClick={() => start(item, draft)}>
                      <RotateCcw size={14} /> Resume draft
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          <article className="fc-card flex flex-col gap-3 p-5">
            <h2 className="font-display text-lg font-bold">Attempt history</h2>
            {submitted.length === 0 ? (
              <EmptyState
                title="No submitted attempts"
                description="Finish a paper and the band, CEFR level and per-question review appear here."
                icon={<Award size={16} />}
              />
            ) : (
              <ul className="space-y-2">
                {submitted.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <button
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--fc-line)] px-3 py-2 text-left transition hover:border-[var(--color-brand-400)]"
                      onClick={() => {
                        const chosen = getPaper(item.paperId);
                        if (!chosen) return;
                        setPaper(chosen);
                        setAttempt(item);
                        setStage("result");
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">
                          {getPaper(item.paperId)?.title ?? item.paperId}
                        </span>
                        <span className="block text-[11px] text-[var(--fc-fg-muted)]">
                          {item.submittedAt ? formatDate(item.submittedAt) : "—"} ·{" "}
                          {item.result?.cefr ?? "—"}
                        </span>
                      </span>
                      <Badge tone="brand">
                        {formatBand(item.result?.finalBand ?? 0)}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button className="btn btn-ghost btn-sm mt-auto" onClick={() => setStage("history")}>
              See all attempts <ChevronRight size={14} />
            </button>
          </article>
        </div>
      )}

      {stage === "runner" && paper && attempt && section && question && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="fc-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                {paper.sections.map((sec, index) => {
                  const Icon = SKILL_ICON[sec.skill];
                  const answered = answeredCount(sec, attempt);
                  return (
                    <button
                      key={sec.id}
                      className={cn(
                        "btn btn-sm",
                        index === sectionIndex ? "btn-primary" : "btn-ghost",
                      )}
                      onClick={() => goToSection(index)}
                    >
                      <Icon size={14} /> {sec.title}
                      <span className="ml-1 text-[10px] opacity-80">
                        {answered}/{sec.questions.length}
                      </span>
                    </button>
                  );
                })}
                <div className="ml-auto flex items-center gap-2">
                  <span
                    className={cn(
                      "chip font-mono",
                      secondsLeft <= 60 && "border-[var(--color-signal-500)] text-[var(--color-signal-500)]",
                    )}
                    aria-live="polite"
                  >
                    <Clock size={12} /> {clock(secondsLeft)}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPaused((value) => !value)}
                    aria-label={paused ? "Resume timer" : "Pause timer"}
                  >
                    {paused ? <Play size={14} /> : <Pause size={14} />}
                    {paused ? "Resume" : "Pause"}
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => finish(paper, attempt)}
                  >
                    <Send size={14} /> Submit
                  </button>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] text-[var(--fc-fg-muted)]">{section.instructions}</p>
            </div>

            {(section.passage || section.script) && (
              <div className="fc-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    {section.script ? "Recording" : "Passage"}
                  </h3>
                  {section.script && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => speak(section.script ?? "")}
                      >
                        <Volume2 size={14} /> {speaking ? "Playing…" : "Play recording"}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={stopSpeech}>
                        <Square size={12} /> Stop
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowScript((value) => !value)}
                      >
                        {showScript ? "Hide transcript" : "Show transcript"}
                      </button>
                      <span className="text-[11px] text-[var(--fc-fg-muted)]">
                        Practice aid — the real test does not show the script.
                      </span>
                    </>
                  )}
                </div>
                {(section.passage || showScript) && (
                  <div className="fc-scroll-thin max-h-72 overflow-y-auto whitespace-pre-line text-[13.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {section.passage ?? section.script}
                  </div>
                )}
              </div>
            )}

            <div className="fc-card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="chip">
                  Question {questionIndex + 1} of {section.questions.length}
                </span>
                <button
                  className={cn("btn btn-ghost btn-sm", flags[question.id] && "text-[var(--color-brand-500)]")}
                  onClick={() =>
                    setFlags((previous) => ({ ...previous, [question.id]: !previous[question.id] }))
                  }
                >
                  <Flag size={14} /> {flags[question.id] ? "Flagged" : "Flag for review"}
                </button>
              </div>

              <p className="text-[15px] font-semibold leading-relaxed">{question.prompt}</p>

              {question.kind === "single" && (
                <div className="mt-4 space-y-2">
                  {question.options?.map((option) => {
                    const chosen = (attempt.answers[question.id]?.selected ?? []).includes(option.id);
                    return (
                      <button
                        key={option.id}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[13.5px] transition",
                          chosen
                            ? "border-[var(--color-brand-400)] bg-[var(--color-brand-50)] font-semibold text-[var(--color-brand-700)] dark:bg-[var(--color-brand-950)] dark:text-[var(--color-brand-300)]"
                            : "border-[var(--fc-line)] hover:border-[var(--color-brand-300)]",
                        )}
                        onClick={() => toggleOption(question, option.id)}
                      >
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold",
                            chosen ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)] text-white" : "border-[var(--fc-line)]",
                          )}
                        >
                          {chosen ? <Check size={12} /> : option.id.toUpperCase()}
                        </span>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {question.kind === "multi" && (
                <div className="mt-4 space-y-2">
                  {question.options?.map((option) => {
                    const chosen = (attempt.answers[question.id]?.selected ?? []).includes(option.id);
                    return (
                      <button
                        key={option.id}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[13.5px] transition",
                          chosen
                            ? "border-[var(--color-accent-400)] bg-[var(--color-accent-50)] font-semibold text-[var(--color-accent-700)] dark:bg-[var(--color-accent-950)] dark:text-[var(--color-accent-300)]"
                            : "border-[var(--fc-line)] hover:border-[var(--color-accent-300)]",
                        )}
                        onClick={() => toggleOption(question, option.id)}
                      >
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded border text-[10px] font-bold",
                            chosen ? "border-[var(--color-accent-500)] bg-[var(--color-accent-500)] text-white" : "border-[var(--fc-line)]",
                          )}
                        >
                          {chosen ? <Check size={12} /> : ""}
                        </span>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {question.kind === "text" && (
                <input
                  className="mt-4 w-full rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-3 py-2 text-[14px] outline-none focus:border-[var(--color-brand-400)]"
                  placeholder="Type the answer"
                  value={attempt.answers[question.id]?.text ?? ""}
                  onChange={(event) => setAnswer(question.id, { text: event.target.value })}
                />
              )}

              {question.kind === "task" && (
                <div className="mt-4 space-y-2">
                  {question.instructions && (
                    <p className="rounded-lg border border-dashed border-[var(--fc-line)] px-3 py-2 text-[12px] text-[var(--fc-fg-muted)]">
                      {question.instructions}
                    </p>
                  )}
                  <textarea
                    className="min-h-40 w-full rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] px-3 py-2 text-[14px] leading-relaxed outline-none focus:border-[var(--color-brand-400)]"
                    placeholder="Write your answer here…"
                    value={attempt.answers[question.id]?.text ?? ""}
                    onChange={(event) => setAnswer(question.id, { text: event.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--fc-fg-muted)]">
                    <span className="chip">
                      {wordCount(attempt.answers[question.id]?.text ?? "")} words
                      {question.wordLimit
                        ? ` / ${question.wordLimit[0]}–${question.wordLimit[1]}`
                        : ""}
                    </span>
                    {(attempt.answers[question.id]?.text ?? "").length > 0 && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          toast.info(
                            "Writing check",
                            writingFeedback(
                              attempt.answers[question.id]?.text ?? "",
                              question.wordLimit ?? [0, 10_000],
                            ).join(" · "),
                          )
                        }
                      >
                        Check this text
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={questionIndex === 0}
                  onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                {questionIndex === section.questions.length - 1 ? (
                  sectionIndex === paper.sections.length - 1 ? (
                    <button className="btn btn-primary btn-sm" onClick={() => finish(paper, attempt)}>
                      <Send size={14} /> Submit paper
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => goToSection(sectionIndex + 1)}>
                      Next section <ChevronRight size={14} />
                    </button>
                  )
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      setQuestionIndex((index) => Math.min(section.questions.length - 1, index + 1))
                    }
                  >
                    Next <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>

            {(section.skill === "writing" || section.skill === "speaking") && (
              <div className="fc-card p-5">
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                  Self-assessment — {section.skill}
                </h3>
                <p className="mt-1 text-[12.5px] text-[var(--fc-fg-muted)]">
                  Objective sections are marked by the engine. Writing and speaking need a human
                  judgement, so score yourself honestly on the 1–9 scale; the final band blends this
                  with the marked sections.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={9}
                    step={0.5}
                    value={attempt.selfAssessed?.[section.skill] ?? 6}
                    onChange={(event) =>
                      persist({
                        ...attempt,
                        selfAssessed: {
                          ...attempt.selfAssessed,
                          [section.skill]: Number(event.target.value),
                        },
                      })
                    }
                    className="h-2 flex-1 accent-[var(--color-brand-500)]"
                  />
                  <Badge tone="brand">{formatBand(attempt.selfAssessed?.[section.skill] ?? 6)}</Badge>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div className="fc-card p-4">
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                Question palette
              </h3>
              <div className="grid grid-cols-6 gap-1.5">
                {section.questions.map((item, index) => {
                  const answer = attempt.answers[item.id];
                  const answered = answer
                    ? item.kind === "text" || item.kind === "task"
                      ? Boolean(answer.text?.trim())
                      : (answer.selected?.length ?? 0) > 0
                    : false;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setQuestionIndex(index)}
                      className={cn(
                        "grid h-8 place-items-center rounded-md border text-[11px] font-bold transition",
                        index === questionIndex
                          ? "border-[var(--color-brand-500)] bg-[var(--color-brand-500)] text-white"
                          : answered
                            ? "border-[var(--color-accent-400)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)] dark:bg-[var(--color-accent-950)] dark:text-[var(--color-accent-300)]"
                            : "border-[var(--fc-line)] text-[var(--fc-fg-muted)]",
                        flags[item.id] && index !== questionIndex && "ring-1 ring-[var(--color-brand-400)]",
                      )}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 space-y-1.5 text-[11.5px] text-[var(--fc-fg-muted)]">
                <div className="flex items-center justify-between">
                  <span>Answered</span>
                  <span className="font-semibold">
                    {answeredCount(section, attempt)}/{section.questions.length}
                  </span>
                </div>
                <Progress value={(answeredCount(section, attempt) / section.questions.length) * 100} />
                <div className="flex items-center justify-between pt-1">
                  <span>Flagged</span>
                  <span className="font-semibold">
                    {Object.entries(flags).filter(
                      ([id, value]) => value && section.questions.some((q) => q.id === id),
                    ).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="fc-card p-4">
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                Paper
              </h3>
              <ul className="space-y-1.5 text-[12.5px]">
                {paper.sections.map((sec, index) => (
                  <li key={sec.id} className="flex items-center justify-between gap-2">
                    <span className={cn(index === sectionIndex && "font-semibold")}>{sec.title}</span>
                    <span className="text-[var(--fc-fg-muted)]">
                      {answeredCount(sec, attempt)}/{sec.questions.length}
                    </span>
                  </li>
                ))}
              </ul>
              <button className="btn btn-ghost btn-sm mt-3 w-full" onClick={() => setStage("papers")}>
                Leave without submitting
              </button>
            </div>
          </aside>
        </div>
      )}

      {stage === "result" && paper && attempt?.result && (
        <ResultView
          paper={paper}
          attempt={attempt}
          onRetake={() => start(paper)}
          onBack={() => setStage("papers")}
          onDelete={() => {
            removeAttempt(attempt.id);
            setAttempt(null);
            setPaper(null);
            setStage("papers");
            toast.success("Attempt deleted", "It is gone from the history.");
          }}
        />
      )}

      {stage === "history" && (
        <div className="fc-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">All attempts</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setStage("papers")}>
              Back to papers
            </button>
          </div>
          {attempts.length === 0 ? (
            <EmptyState
              title="Nothing attempted yet"
              description="Start a paper — a draft saves automatically and appears here."
              icon={<ListChecks size={16} />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--fc-line)] text-[11px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    <th className="py-2 pr-3 font-bold">Paper</th>
                    <th className="py-2 pr-3 font-bold">Started</th>
                    <th className="py-2 pr-3 font-bold">Status</th>
                    <th className="py-2 pr-3 font-bold">Band</th>
                    <th className="py-2 pr-3 font-bold">CEFR</th>
                    <th className="py-2 pr-3 font-bold">Time</th>
                    <th className="py-2 font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((item) => {
                    const entry = getPaper(item.paperId);
                    return (
                      <tr key={item.id} className="border-b border-[var(--fc-line)]/60">
                        <td className="py-2 pr-3 font-semibold">{entry?.title ?? item.paperId}</td>
                        <td className="py-2 pr-3 text-[var(--fc-fg-muted)]">{formatDate(item.startedAt)}</td>
                        <td className="py-2 pr-3">
                          <Badge tone={item.status === "submitted" ? "accent" : "brand"}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 font-bold">
                          {item.result ? formatBand(item.result.finalBand) : "—"}
                        </td>
                        <td className="py-2 pr-3">{item.result?.cefr ?? "—"}</td>
                        <td className="py-2 pr-3 text-[var(--fc-fg-muted)]">
                          {Math.round(item.timeSpentSec / 60)}m
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-1">
                            {item.status === "submitted" && entry && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  setPaper(entry);
                                  setAttempt(item);
                                  setStage("result");
                                }}
                              >
                                Review
                              </button>
                            )}
                            {item.status === "in-progress" && entry && (
                              <button className="btn btn-secondary btn-sm" onClick={() => start(entry, item)}>
                                Resume
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-sm text-[var(--color-signal-600)]"
                              onClick={() => removeAttempt(item.id)}
                              aria-label="Delete attempt"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Result view                                                         */
/* ------------------------------------------------------------------ */

function ResultView({
  paper,
  attempt,
  onRetake,
  onBack,
  onDelete,
}: {
  paper: ExamPaper;
  attempt: ExamAttempt;
  onRetake: () => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const result = attempt.result;
  if (!result) return null;

  return (
    <div className="space-y-4">
      <div className="fc-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-500)]">
              {paper.level}
            </p>
            <h2 className="font-display text-2xl font-bold">{paper.title}</h2>
            <p className="mt-1 text-[13px] text-[var(--fc-fg-muted)]">
              Submitted {attempt.submittedAt ? formatDate(attempt.submittedAt) : "just now"} ·{" "}
              {Math.round(attempt.timeSpentSec / 60)} minutes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="font-display text-4xl font-black text-[var(--color-brand-500)]">
                {paper.scale === "toefl" ? result.toeflTotal : formatBand(result.finalBand)}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                {paper.scale === "toefl" ? "TOEFL total /120" : "Overall band"}
              </div>
            </div>
            <Badge tone="accent">{result.cefr}</Badge>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary btn-sm" onClick={onRetake}>
            <RotateCcw size={14} /> Retake
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            Back to papers
          </button>
          <button className="btn btn-ghost btn-sm text-[var(--color-signal-600)]" onClick={onDelete}>
            <Trash2 size={14} /> Delete attempt
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {result.sections.map((section) => {
          const Icon = SKILL_ICON[section.skill];
          return (
            <div key={section.sectionId} className="fc-card p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  <Icon size={14} /> {section.title}
                </span>
                <span className="font-display text-xl font-bold">
                  {paper.scale === "toefl" ? section.band : formatBand(section.band)}
                </span>
              </div>
              {section.max > 0 ? (
                <>
                  <p className="mt-1 text-[11.5px] text-[var(--fc-fg-muted)]">
                    {section.raw}/{section.max} marks · scaled {section.scaled}/40
                  </p>
                  <Progress value={(section.raw / section.max) * 100} className="mt-2" />
                </>
              ) : (
                <p className="mt-1 text-[11.5px] text-[var(--fc-fg-muted)]">
                  Self-assessed
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="fc-card p-5">
        <h3 className="mb-3 font-display text-lg font-bold">Question review</h3>
        <div className="space-y-5">
          {paper.sections.map((section) => {
            const sectionResult = result.sections.find((item) => item.sectionId === section.id);
            if (!sectionResult) return null;
            return (
              <div key={section.id}>
                <h4 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                  {section.title}
                </h4>
                <ol className="space-y-2">
                  {section.questions.map((question, index) => {
                    const mark = sectionResult.questions.find((item) => item.questionId === question.id);
                    const answer = attempt.answers[question.id];
                    const correct = mark?.correct;
                    return (
                      <li
                        key={question.id}
                        className={cn(
                          "rounded-lg border px-3 py-2.5",
                          correct === true
                            ? "border-[var(--color-accent-300)] bg-[var(--color-accent-50)]/60 dark:bg-[var(--color-accent-950)]/40"
                            : correct === false
                              ? "border-[var(--color-signal-300)] bg-[var(--color-signal-50)]/60 dark:bg-[var(--color-signal-950)]/40"
                              : "border-[var(--fc-line)]",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold">
                            {correct === true ? (
                              <Check size={12} />
                            ) : correct === false ? (
                              "×"
                            ) : (
                              index + 1
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium">{question.prompt}</p>
                            <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
                              Your answer:{" "}
                              <strong>
                                {question.kind === "task" || question.kind === "text"
                                  ? (answer?.text?.slice(0, 120) || "—")
                                  : (answer?.selected ?? [])
                                      .map(
                                        (id) =>
                                          question.options?.find((option) => option.id === id)?.label ?? id,
                                      )
                                      .join(", ") || "—"}
                              </strong>
                              {isObjective(question) && question.answer && (
                                <>
                                  {" · "}Accepted:{" "}
                                  {question.answer
                                    .map(
                                      (value) =>
                                        question.options?.find((option) => option.id === value)?.label ??
                                        value,
                                    )
                                    .join(" / ")}
                                </>
                              )}
                            </p>
                            {question.explanation && (
                              <p className="mt-1 text-[12px] text-[var(--fc-fg-muted)]">
                                {question.explanation}
                              </p>
                            )}
                          </div>
                          {mark && mark.max > 0 && (
                            <span className="shrink-0 text-[11px] font-bold text-[var(--fc-fg-subtle)]">
                              {mark.earned}/{mark.max}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
