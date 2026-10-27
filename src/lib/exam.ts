/* ============================================================
   Computer-based English test engine
   ------------------------------------------------------------
   The product claims the whole exam workflow can happen inside
   the workspace: sit a timed paper, have the objective sections
   marked, self-assess the productive ones against the public
   descriptors, and keep a band-scored history.

   Everything here is pure: no store, no DOM, no network. That is
   what makes it testable and what lets Bill Agent grade a paper
   it did not sit.
   ============================================================ */

export type ExamSkill = "listening" | "reading" | "writing" | "speaking";

export type ExamScale = "ielts" | "toefl" | "cefr";

export interface ExamOption {
  id: string;
  label: string;
}

export interface ExamQuestion {
  id: string;
  kind: "single" | "multi" | "text" | "task";
  prompt: string;
  /** Required for single/multi. */
  options?: ExamOption[];
  /** Correct option ids for single/multi, accepted strings for text. */
  answer?: string[];
  explanation?: string;
  /** Objective questions are worth one mark unless stated. */
  points?: number;
  /** Productive tasks only: guidance shown beside the self-assessment slider. */
  instructions?: string;
  wordLimit?: [number, number];
}

export interface ExamSection {
  id: string;
  skill: ExamSkill;
  title: string;
  minutes: number;
  instructions: string;
  passage?: string;
  /** Listening scripts are read aloud by the browser's speech engine. */
  script?: string;
  questions: ExamQuestion[];
}

export interface ExamPaper {
  id: string;
  title: string;
  level: string;
  scale: ExamScale;
  description: string;
  sections: ExamSection[];
}

export interface ExamAnswer {
  selected?: string[];
  text?: string;
}

export interface QuestionMark {
  questionId: string;
  /** null for productive tasks that need a human or self assessment. */
  correct: boolean | null;
  earned: number;
  max: number;
}

export interface SectionResult {
  sectionId: string;
  skill: ExamSkill;
  title: string;
  raw: number;
  max: number;
  scaled: number;
  band: number;
  questions: QuestionMark[];
}

export interface AttemptResult {
  sections: SectionResult[];
  objectiveRaw: number;
  objectiveMax: number;
  objectiveBand: number;
  productiveBand?: number;
  finalBand: number;
  cefr: string;
  toeflTotal?: number;
  finishedAt: string;
}

export interface ExamAttempt {
  id: string;
  paperId: string;
  startedAt: string;
  submittedAt?: string;
  status: "in-progress" | "submitted";
  answers: Record<string, ExamAnswer>;
  /** 1-9 in half steps, one per productive section. */
  selfAssessed?: Record<string, number>;
  timeSpentSec: number;
  result?: AttemptResult;
}

/* ------------------------------------------------------------------ */
/* Band conversion                                                     */
/* ------------------------------------------------------------------ */

/** Standard IELTS Listening raw-score bands, out of 40. */
const IELTS_LISTENING: Array<[number, number]> = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [32, 7.5],
  [30, 7],
  [26, 6.5],
  [23, 6],
  [18, 5.5],
  [16, 5],
  [13, 4.5],
  [10, 4],
  [6, 3.5],
  [4, 3],
  [3, 2.5],
  [2, 2],
  [1, 1],
];

/** Standard IELTS Academic Reading raw-score bands, out of 40. */
const IELTS_READING: Array<[number, number]> = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [33, 7.5],
  [30, 7],
  [27, 6.5],
  [23, 6],
  [19, 5.5],
  [15, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [3, 2],
  [2, 1.5],
  [1, 1],
];

export function ieltsBand(skill: ExamSkill, raw: number): number {
  const table = skill === "listening" ? IELTS_LISTENING : IELTS_READING;
  for (const [threshold, band] of table) {
    if (raw >= threshold) return band;
  }
  return 0;
}

export function cefrForBand(band: number): string {
  if (band >= 8.5) return "C2";
  if (band >= 7) return "C1";
  if (band >= 5.5) return "B2";
  if (band >= 4) return "B1";
  if (band >= 3) return "A2";
  return "A1";
}

export function roundBand(value: number): number {
  return Math.round(value * 2) / 2;
}

export function formatBand(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/* ------------------------------------------------------------------ */
/* Marking                                                             */
/* ------------------------------------------------------------------ */

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].map(normalise).sort();
  const right = [...b].map(normalise).sort();
  return left.every((value, index) => value === right[index]);
}

export function isObjective(question: ExamQuestion): boolean {
  return question.kind === "single" || question.kind === "multi" || question.kind === "text";
}

export function markQuestion(
  question: ExamQuestion,
  answer: ExamAnswer | undefined,
): QuestionMark {
  const max = question.points ?? 1;
  if (!isObjective(question)) {
    return { questionId: question.id, correct: null, earned: 0, max };
  }
  const expected = question.answer ?? [];
  if (!answer) return { questionId: question.id, correct: false, earned: 0, max };

  if (question.kind === "text") {
    const given = normalise(answer.text ?? "");
    const correct = expected.some((value) => normalise(value) === given) && given.length > 0;
    return { questionId: question.id, correct, earned: correct ? max : 0, max };
  }

  const selected = answer.selected ?? [];
  const correct = sameSet(selected, expected);
  return { questionId: question.id, correct, earned: correct ? max : 0, max };
}

export function gradeAttempt(paper: ExamPaper, attempt: ExamAttempt): AttemptResult {
  const sections: SectionResult[] = paper.sections.map((section) => {
    const marks = section.questions.map((question) =>
      markQuestion(question, attempt.answers[question.id]),
    );
    const objective = marks.filter((mark) => mark.correct !== null);
    const raw = objective.reduce((total, mark) => total + mark.earned, 0);
    const max = objective.reduce((total, mark) => total + mark.max, 0);
    const scaled = max === 0 ? 0 : Math.round((raw / max) * 40);
    const productive = section.skill === "writing" || section.skill === "speaking";
    const band =
      paper.scale === "ielts"
        ? productive
          ? (attempt.selfAssessed?.[section.skill] ?? 0)
          : ieltsBand(section.skill, scaled)
        : productive
          ? Math.round(((attempt.selfAssessed?.[section.skill] ?? 0) / 9) * 30)
          : max === 0
            ? 0
            : Math.round((raw / max) * 30);
    return {
      sectionId: section.id,
      skill: section.skill,
      title: section.title,
      raw,
      max,
      scaled,
      band,
      questions: marks,
    };
  });

  const objectiveSections = sections.filter(
    (section) => section.skill === "listening" || section.skill === "reading",
  );
  const productiveSections = sections.filter(
    (section) => section.skill === "writing" || section.skill === "speaking",
  );

  const objectiveRaw = objectiveSections.reduce((total, section) => total + section.raw, 0);
  const objectiveMax = objectiveSections.reduce((total, section) => total + section.max, 0);

  if (paper.scale === "ielts") {
    const bands = objectiveSections
      .filter((section) => section.max > 0)
      .map((section) => section.band);
    const objectiveBand = bands.length
      ? roundBand(bands.reduce((total, value) => total + value, 0) / bands.length)
      : 0;
    const selfScores = productiveSections
      .map((section) => attempt.selfAssessed?.[section.skill])
      .filter((value): value is number => typeof value === "number");
    const productiveBand = selfScores.length
      ? roundBand(selfScores.reduce((total, value) => total + value, 0) / selfScores.length)
      : undefined;
    const finalBand = roundBand(
      productiveBand === undefined ? objectiveBand : (objectiveBand + productiveBand) / 2,
    );
    return {
      sections,
      objectiveRaw,
      objectiveMax,
      objectiveBand,
      productiveBand,
      finalBand,
      cefr: cefrForBand(finalBand),
      finishedAt: new Date().toISOString(),
    };
  }

  const perSection = sections.map((section) => section.band);
  const total =
    perSection.length === 0
      ? 0
      : Math.round((perSection.reduce((sum, value) => sum + value, 0) / perSection.length) * 4);
  const toeflBand = Math.round((total / 120) * 9 * 2) / 2;
  return {
    sections,
    objectiveRaw,
    objectiveMax,
    objectiveBand: 0,
    finalBand: toeflBand,
    cefr: cefrForBand(toeflBand),
    toeflTotal: total,
    finishedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Timing and helpers                                                  */
/* ------------------------------------------------------------------ */

export function paperMinutes(paper: ExamPaper): number {
  return paper.sections.reduce((total, section) => total + section.minutes, 0);
}

export function objectiveCount(paper: ExamPaper): number {
  return paper.sections.reduce(
    (total, section) => total + section.questions.filter(isObjective).length,
    0,
  );
}

export function productiveCount(paper: ExamPaper): number {
  return paper.sections.reduce(
    (total, section) => total + section.questions.filter((q) => !isObjective(q)).length,
    0,
  );
}

export function answeredCount(section: ExamSection, attempt: ExamAttempt): number {
  return section.questions.filter((question) => {
    const answer = attempt.answers[question.id];
    if (!answer) return false;
    if (question.kind === "text" || question.kind === "task") return Boolean(answer.text?.trim());
    return (answer.selected?.length ?? 0) > 0;
  }).length;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** A practice attempt whose answers the operator fills in by hand. */
export function emptyAttempt(paperId: string, id: string): ExamAttempt {
  return {
    id,
    paperId,
    startedAt: new Date().toISOString(),
    status: "in-progress",
    answers: {},
    timeSpentSec: 0,
  };
}

/** Feedback for a productive task, derived from what was actually written. */
export function writingFeedback(text: string, words: [number, number]): string[] {
  const notes: string[] = [];
  const count = wordCount(text);
  if (count === 0) notes.push("Nothing written yet.");
  else if (count < words[0]) notes.push(`Under length: ${count} words, target ${words[0]}–${words[1]}.`);
  else if (count > words[1]) notes.push(`Over length: ${count} words, target ${words[0]}–${words[1]}.`);
  else notes.push(`Length is inside the ${words[0]}–${words[1]} word window (${count}).`);

  if (count > 0) {
    const sentences = text.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
    const average = sentences === 0 ? count : Math.round(count / sentences);
    notes.push(`Average sentence length: ${average} words.`);
    const linkers = (text.match(/\b(however|therefore|moreover|although|whereas|consequently|firstly|finally)\b/gi) ?? []).length;
    notes.push(linkers >= 3 ? `${linkers} discourse markers used.` : `Only ${linkers} discourse markers — connect the ideas explicitly.`);
    const paragraphs = text.split(/\n{2,}/).filter((block) => block.trim()).length;
    notes.push(paragraphs >= 2 ? `${paragraphs} paragraphs.` : "One block of text — split it into paragraphs.");
  }
  return notes;
}
