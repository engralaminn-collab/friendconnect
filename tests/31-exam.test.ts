import { describe, expect, it } from "vitest";
import { EXAM_PAPERS, getPaper } from "@/lib/data/exams";
import {
  cefrForBand,
  emptyAttempt,
  gradeAttempt,
  ieltsBand,
  markQuestion,
  objectiveCount,
  paperMinutes,
  wordCount,
  writingFeedback,
  type ExamAttempt,
} from "@/lib/exam";
import { getTool } from "@/lib/agent/registry";
import { validateArgs } from "@/lib/agent/schema";
import { makeWorkspace } from "./helpers/agent-workspace";

const ielts = getPaper("ielts-academic-1")!;

/** Build an attempt with every objective answer correct. */
function perfect(paper = ielts): ExamAttempt {
  const answers: ExamAttempt["answers"] = {};
  for (const section of paper.sections) {
    for (const question of section.questions) {
      if (question.kind === "text") answers[question.id] = { text: question.answer?.[0] ?? "" };
      else if (question.kind === "single" || question.kind === "multi")
        answers[question.id] = { selected: question.answer ?? [] };
    }
  }
  return { ...emptyAttempt(paper.id, "attempt-perfect"), answers };
}

describe("exam engine", () => {
  it("ships papers that are internally consistent", () => {
    expect(EXAM_PAPERS.length).toBeGreaterThanOrEqual(3);
    for (const paper of EXAM_PAPERS) {
      expect(paper.sections.length).toBeGreaterThan(0);
      expect(paperMinutes(paper)).toBeGreaterThan(0);
      const ids = new Set<string>();
      for (const section of paper.sections) {
        expect(section.questions.length).toBeGreaterThan(0);
        for (const question of section.questions) {
          expect(ids.has(question.id), `${paper.id} duplicate ${question.id}`).toBe(false);
          ids.add(question.id);
          if (question.kind === "single" || question.kind === "multi") {
            expect(question.options?.length ?? 0).toBeGreaterThan(1);
            expect(question.answer?.length ?? 0).toBeGreaterThan(0);
            // Every key must exist in the options.
            for (const key of question.answer ?? []) {
              expect(
                question.options?.some((option) => option.id === key),
                `${question.id} answer ${key}`,
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it("marks a perfect objective paper at the top band", () => {
    const result = gradeAttempt(ielts, { ...perfect(), selfAssessed: { writing: 9, speaking: 9 } });
    expect(result.objectiveRaw).toBe(objectiveCount(ielts));
    expect(result.objectiveBand).toBe(9);
    expect(result.finalBand).toBe(9);
    expect(result.cefr).toBe("C2");
    expect(result.sections.every((section) => section.raw === section.max)).toBe(true);
  });

  it("marks an empty paper at zero without throwing", () => {
    const result = gradeAttempt(ielts, emptyAttempt(ielts.id, "blank"));
    expect(result.objectiveRaw).toBe(0);
    expect(result.finalBand).toBe(0);
    expect(result.productiveBand).toBeUndefined();
  });

  it("blends marked sections with the productive self-assessment", () => {
    const attempt = { ...perfect(), selfAssessed: { writing: 5, speaking: 6 } };
    const result = gradeAttempt(ielts, attempt);
    expect(result.objectiveBand).toBe(9);
    expect(result.productiveBand).toBe(5.5);
    expect(result.finalBand).toBe(7.5);
  });

  it("converts raw scores with the published IELTS tables", () => {
    expect(ieltsBand("listening", 39)).toBe(9);
    expect(ieltsBand("listening", 30)).toBe(7);
    expect(ieltsBand("reading", 27)).toBe(6.5);
    expect(ieltsBand("reading", 15)).toBe(5);
    expect(ieltsBand("reading", 0)).toBe(0);
    expect(cefrForBand(9)).toBe("C2");
    expect(cefrForBand(7)).toBe("C1");
    expect(cefrForBand(6)).toBe("B2");
    expect(cefrForBand(4.5)).toBe("B1");
    expect(cefrForBand(2)).toBe("A1");
  });

  it("requires an exact option set for multi-select", () => {
    const multi = ielts.sections[0].questions.find((question) => question.kind === "multi")!;
    const full = { selected: multi.answer ?? [] };
    const partial = { selected: [(multi.answer ?? [])[0]] };
    expect(markQuestion(multi, full).correct).toBe(true);
    expect(markQuestion(multi, partial).correct).toBe(false);
    expect(markQuestion(multi, undefined).correct).toBe(false);
  });

  it("accepts any listed text answer and ignores case", () => {
    const text = ielts.sections[0].questions.find((question) => question.kind === "text")!;
    expect(markQuestion(text, { text: (text.answer ?? [""])[0].toUpperCase() }).correct).toBe(true);
    expect(markQuestion(text, { text: "definitely wrong" }).correct).toBe(false);
  });

  it("scales TOEFL papers to the 0–120 total", () => {
    const toefl = getPaper("toefl-practice-1")!;
    const result = gradeAttempt(toefl, { ...perfect(toefl), selfAssessed: { writing: 8, speaking: 7 } });
    expect(result.toeflTotal).toBeGreaterThan(100);
    expect(result.toeflTotal).toBeLessThanOrEqual(120);
    expect(result.cefr).toBe("C2");
  });

  it("gives writing feedback that reflects the text", () => {
    expect(wordCount("one two three")).toBe(3);
    const short = writingFeedback("I think this is short.", [150, 220]);
    expect(short[0]).toContain("Under length");
    const long = writingFeedback(Array.from({ length: 250 }, () => "word").join(" "), [150, 220]);
    expect(long[0]).toContain("Over length");
  });
});

describe("exam tools, as Bill Agent calls them", () => {
  async function run(name: string, args: Record<string, unknown>, ws = makeWorkspace()) {
    const tool = getTool(name);
    if (!tool) throw new Error(`missing ${name}`);
    const validation = validateArgs(tool.schema, args);
    if (!validation.ok) throw new Error(validation.errors.join("; "));
    const result = await tool.run({ workspace: ws, now: () => new Date() }, validation.args);
    return { result, ws };
  }

  it("lists papers and starts an attempt", async () => {
    const listed = await run("list_exam_papers", {});
    expect(listed.result.ok).toBe(true);

    const started = await run("start_exam_attempt", { paperId: ielts.id });
    expect(started.result.ok).toBe(true);
    expect(started.ws.examAttempts).toHaveLength(1);
    expect(started.ws.examAttempts[0].status).toBe("in-progress");
  });

  it("grades answers and stores a band-scored result", async () => {
    const answers: Record<string, unknown> = {};
    for (const section of ielts.sections) {
      for (const question of section.questions) {
        if (question.kind === "text") answers[question.id] = { text: question.answer?.[0] };
        else if (question.kind === "single" || question.kind === "multi")
          answers[question.id] = { selected: question.answer };
      }
    }
    const graded = await run("grade_exam_attempt", {
      paperId: ielts.id,
      answers,
      selfAssessed: { writing: 7, speaking: 7 },
    });
    expect(graded.result.ok).toBe(true);
    expect(graded.result.summary).toContain("Overall band 8");
    expect(graded.ws.examAttempts[0].result?.finalBand).toBe(8);

    const history = await run("list_exam_attempts", {}, graded.ws);
    expect(history.result.ok).toBe(true);

    const id = graded.ws.examAttempts[0].id;
    const deleted = await run("delete_exam_attempt", { attemptId: id }, graded.ws);
    expect(deleted.result.ok).toBe(true);
    expect(graded.ws.examAttempts).toHaveLength(0);
  });

  it("rejects an unknown paper and an unknown attempt", async () => {
    const badPaper = await run("start_exam_attempt", { paperId: "does-not-exist" });
    expect(badPaper.result.ok).toBe(false);
    const badAttempt = await run("delete_exam_attempt", { attemptId: "nope" });
    expect(badAttempt.result.ok).toBe(false);
  });
});
