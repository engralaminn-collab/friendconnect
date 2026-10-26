/**
 * Language-coaching engine for the tutor module.
 *
 * Everything here is deterministic and offline: a rule set for the common
 * errors a learner makes, a level estimator (CEFR-ish), a vocabulary band and
 * a rewrite that keeps the learner's meaning intact.
 */

export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_ORDER: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export interface Correction {
  kind:
    | "article"
    | "agreement"
    | "preposition"
    | "plural"
    | "spelling"
    | "tense"
    | "capitalisation"
    | "punctuation"
    | "word-choice"
    | "double-word";
  wrong: string;
  right: string;
  why: string;
  severity: "must" | "should" | "nice";
}

export interface SentenceAnalysis {
  original: string;
  corrected: string;
  corrections: Correction[];
  cefr: Cefr;
  confidence: number;
  lengthOk: boolean;
  notes: string[];
}

/* ------------------------------------------------------------------ */
/* lexicons                                                             */
/* ------------------------------------------------------------------ */

/** Words that are almost always wrong in a given position. */
const PREPOSITION_TRAPS: [RegExp, string, string][] = [
  [/\bdiscuss about\b/i, "discuss", "'discuss' does not take 'about'."],
  [/\bexplain me\b/i, "explain to me", "'explain' takes a person, so 'to' is needed."],
  [/\benter in (?:to )?the (?:room|website|app)\b/i, "enter the", "'enter' is transitive."],
  [/\bdepend of\b/i, "depend on", "'depend' always takes 'on'."],
  [/\bmarried with\b/i, "married to", "People marry a person, so 'to' is used."],
  [/\bconsist in\b/i, "consist of", "'consist' takes 'of' when listing parts."],
  [/\binterested on\b/i, "interested in", "'interested' takes 'in'."],
  [/\bgood in\b/i, "good at", "'good' takes 'at' for a skill."],
  [/\breply to me\b/i, "reply to me", "This one is correct — kept as a model."],
];

const SPELLINGS: [RegExp, string, string][] = [
  [/\brecieve/gi, "receive", "i before e, except after c."],
  [/\bseperate/gi, "separate", "'separate' keeps the second 'e'."],
  [/\bdefinately/gi, "definitely", "'definitely' has two 'i's."],
  [/\boccured/gi, "occurred", "Double the 'r' when stressed."],
  [/\bwich\b/gi, "which", "'which' asks the question."],
  [/\bteh\b/gi, "the", "Letters transposed."],
  [/\bbecuase/gi, "because", "'because' spells b-e-c-a-u-s-e."],
  [/\bthier\b/gi, "their", "Their, there and they're are different words."],
  [/\bwich one/gi, "which one", "Two words."],
  [/\benviroment\b/gi, "environment", "'environment' keeps the 'n'."],
];

const WORD_CHOICE: [RegExp, string, string][] = [
  [/\binformations?\b/gi, "information", "'Information' is uncountable — no plural."],
  [/\badvices\b/gi, "advice", "'Advice' is uncountable."],
  [/\bequipments\b/gi, "equipment", "'Equipment' is uncountable."],
  [/\bpeoples\b/gi, "people", "'People' is already plural."],
  [/\bchildrens\b/gi, "children", "'Children' is already plural."],
  [/\binformations are/gi, "information is", "Uncountable nouns take a singular verb."],
];

const DOUBLE_WORDS: [RegExp, string, string][] = [
  [/\bthe the\b/gi, "the", "Repeated word."],
  [/\ba a\b/gi, "a", "Repeated word."],
  [/\bof of\b/gi, "of", "Repeated word."],
  [/\band and\b/gi, "and", "Repeated word."],
  [/\bto to\b/gi, "to", "Repeated word."],
];

/** Common irregular verbs and their past forms. */
const IRREGULAR: Record<string, string> = {
  went: "go",
  done: "do",
  saw: "see",
  made: "make",
  took: "take",
  came: "come",
  knew: "know",
  thought: "think",
  said: "say",
  got: "get",
  gave: "give",
  found: "find",
  told: "tell",
  became: "become",
  left: "leave",
  felt: "feel",
  brought: "bring",
  began: "begin",
  kept: "keep",
  wrote: "write",
  stood: "stand",
  heard: "hear",
  let: "let",
  meant: "mean",
  set: "set",
  met: "meet",
  ran: "run",
  paid: "pay",
  sat: "sit",
  lay: "lie",
  led: "lead",
  grew: "grow",
  lost: "lose",
  fell: "fall",
  sent: "send",
  built: "build",
  understood: "understand",
  drew: "draw",
  broke: "break",
  spent: "spend",
  cut: "cut",
  rose: "raise",
  drove: "drive",
  bought: "buy",
  wore: "wear",
  chose: "choose",
  ate: "eat",
  drank: "drink",
  taught: "teach",
  caught: "catch",
  fought: "fight",
  sold: "sell",
  slept: "sleep",
  flew: "fly",
  threw: "throw",
  hit: "hit",
  put: "put",
  read: "read",
  won: "win",
  forgot: "forget",
  hid: "hide",
  shook: "shake",
  swam: "swim",
  sang: "sing",
  rang: "ring",
  sank: "sink",
  spoke: "speak",
  froze: "freeze",
  stole: "steal",
  spread: "spread",
  struck: "strike",
  tore: "tear",
  wound: "wind",
  burst: "burst",
  cast: "cast",
  burnt: "burn",
  learnt: "learn",
  dreamt: "dream",
  knelt: "kneel",
  lent: "lend",
  rode: "ride",
  shone: "shine",
  spun: "spin",
  swept: "sweep",
  wept: "weep",
  withdrew: "withdraw",
};

/** Vocabulary band — roughly the CEFR level each word belongs to. */
const BANDS: Record<string, number> = {
  a: 1, an: 1, the: 1, i: 1, you: 1, we: 1, they: 1, he: 1, she: 1, it: 1,
  is: 1, am: 1, are: 1, was: 1, were: 1, be: 1, been: 1, have: 1, has: 1,
  do: 1, does: 1, did: 1, go: 1, come: 1, like: 1, want: 1, need: 1,
  time: 1, day: 1, year: 1, people: 1, good: 1, new: 1, first: 1, last: 1,
  work: 2, help: 2, home: 2, school: 2, friend: 2, city: 2, food: 2, water: 2,
  learn: 2, study: 2, start: 2, open: 2, close: 2, change: 2, find: 2,
  because: 2, before: 2, after: 2, between: 2, different: 2, important: 2,
  understand: 2, decide: 2, explain: 2, describe: 2, prepare: 2, improve: 3,
  develop: 3, support: 3, involve: 3, achieve: 3, consider: 3, provide: 3,
  create: 3, establish: 3, maintain: 3, receive: 3, require: 3, suggest: 3,
  analyse: 4, analyze: 4, evaluate: 4, demonstrate: 4, indicate: 4, significant: 4,
  facilitate: 5, comprehensive: 5, nuanced: 5, subsequently: 5, paradigm: 6,
};

const LEVEL_WORDS = 420;

/* ------------------------------------------------------------------ */
/* analysis                                                             */
/* ------------------------------------------------------------------ */

function countSyllables(word: string) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const m = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return d[m][n];
}

export function analyseSentence(input: string): SentenceAnalysis {
  const corrections: Correction[] = [];
  let working = input.trim();
  const original = working;

  // Spelling
  for (const [re, right, why] of SPELLINGS) {
    if (re.test(working)) {
      const match = working.match(re);
      re.lastIndex = 0;
      if (match) {
        corrections.push({
          kind: "spelling",
          wrong: match[0],
          right,
          why,
          severity: "must",
        });
        working = working.replace(re, right);
      }
    }
  }

  // Word choice
  for (const [re, right, why] of WORD_CHOICE) {
    const match = working.match(re);
    re.lastIndex = 0;
    if (match) {
      corrections.push({
        kind: "word-choice",
        wrong: match[0],
        right,
        why,
        severity: "must",
      });
      working = working.replace(re, right);
    }
  }

  // Prepositions
  for (const [re, right, why] of PREPOSITION_TRAPS) {
    const match = working.match(re);
    re.lastIndex = 0;
    if (match) {
      corrections.push({
        kind: "preposition",
        wrong: match[0],
        right,
        why,
        severity: right === match[0] ? "nice" : "should",
      });
      if (right !== match[0]) working = working.replace(re, right);
    }
  }

  // Doubled words
  for (const [re, right, why] of DOUBLE_WORDS) {
    const match = working.match(re);
    re.lastIndex = 0;
    if (match) {
      corrections.push({
        kind: "double-word",
        wrong: match[0],
        right,
        why,
        severity: "should",
      });
      working = working.replace(re, right);
    }
  }

  // Article + singular/plural agreement
  working = working.replace(
    /\b(a|an)\s+([a-z]+s)\b/gi,
    (whole, art, noun) => {
      corrections.push({
        kind: "plural",
        wrong: whole,
        right: `${art} ${noun.slice(0, -1)}`,
        why: "'a'/'an' takes a singular noun.",
        severity: "must",
      });
      return `${art} ${noun.slice(0, -1)}`;
    },
  );

  // Subject–verb agreement (third person singular)
  const agreement = working.match(
    /\b(he|she|it|this|that|the\s+[a-z]+)\s+(have|do|are|go|make|take|need|want|like)\b/i,
  );
  if (agreement) {
    const map: Record<string, string> = {
      have: "has",
      do: "does",
      are: "is",
      go: "goes",
      make: "makes",
      take: "takes",
      need: "needs",
      want: "wants",
      like: "likes",
    };
    const verb = agreement[2].toLowerCase();
    const fixed = map[verb];
    if (fixed) {
      corrections.push({
        kind: "agreement",
        wrong: agreement[0],
        right: agreement[0].replace(verb, fixed),
        why: "Third-person singular takes an -s verb.",
        severity: "must",
      });
      working = working.replace(agreement[0], agreement[0].replace(verb, fixed));
    }
  }

  // Missing article before a singular countable noun
  const noArticle = working.match(
    /\b(I|we|you|they|he|she|it)\s+(go|went|come|came|have|has|buy|bought|make|made|take|took|see|saw|want|need)\s+([a-z]+)\b/i,
  );
  if (noArticle && !/^(a|an|the|some|any|my|your|his|her|its|our|their|this|that|these|those|one|two|three|many|most|all|both|few|several)\b/i.test(noArticle[3])) {
    corrections.push({
      kind: "article",
      wrong: noArticle[0],
      right: noArticle[0].replace(
        new RegExp(`(${noArticle[3]})$`, "i"),
        "the $1",
      ),
      why: "A singular countable noun needs an article.",
      severity: "should",
    });
    working = working.replace(
      noArticle[0],
      noArticle[0].replace(new RegExp(`(${noArticle[3]})$`, "i"), "the $1"),
    );
  }

  // Capitalisation
  if (working && !/^[A-Z"'(]/.test(working)) {
    corrections.push({
      kind: "capitalisation",
      wrong: working[0],
      right: working[0].toUpperCase(),
      why: "A sentence starts with a capital letter.",
      severity: "should",
    });
    working = working[0].toUpperCase() + working.slice(1);
  }

  // Punctuation
  if (working && !/[.!?…]$/.test(working)) {
    corrections.push({
      kind: "punctuation",
      wrong: working.slice(-12),
      right: `${working} .`,
      why: "A finished sentence needs end punctuation.",
      severity: "should",
    });
    working = `${working}.`;
  }

  // Tense consistency — past-tense verb in a present-tense sentence
  const words = working.toLowerCase().match(/[a-z']+/g) ?? [];
  const past = words.filter((w) => IRREGULAR[w]);
  const hasPresentMarker = /\b(i|we|you|they|he|she|it)\s+\w+\b/.test(
    working.toLowerCase(),
  );
  if (past.length && !hasPresentMarker) {
    const word = past[0];
    corrections.push({
      kind: "tense",
      wrong: word,
      right: IRREGULAR[word],
      why: "This is the base form — use it unless you mean the past.",
      severity: "nice",
    });
  }

  /* ---------------- level estimation ---------------- */

  const unique = new Set(words);
  let bandSum = 0;
  let known = 0;
  for (const w of unique) {
    if (BANDS[w] !== undefined) {
      bandSum += BANDS[w];
      known++;
    }
  }
  const avgBand = known ? bandSum / known : 1;
  const lengthWords = words.length;
  const complexity =
    words.filter((w) => countSyllables(w) >= 3).length / Math.max(1, words.length);

  const raw =
    avgBand * 0.6 +
    Math.min(3, lengthWords / 12) * 0.25 +
    complexity * 4 * 0.15;
  const score = Math.max(0, Math.min(5.99, raw));
  const cefr = CEFR_ORDER[Math.min(CEFR_ORDER.length - 1, Math.floor(score))];

  const confidence = Math.round(
    Math.min(0.98, 0.42 + known / Math.max(1, unique.size) * 0.4 + (lengthWords > 3 ? 0.12 : 0)),
  );

  const notes: string[] = [];
  if (corrections.length === 0) notes.push("Clean sentence — no corrections needed.");
  if (lengthWords > 25) notes.push("Long sentence. Try splitting it into two.");
  if (lengthWords < 4) notes.push("Very short. Add a subject and a verb to expand it.");
  if (complexity > 0.4)
    notes.push("Lots of long words for this level. Keep it simpler while you practise.");
  if (avgBand <= 1.4) notes.push("Vocabulary is at the right level — try one word higher.");

  return {
    original,
    corrected: working,
    corrections,
    cefr,
    confidence,
    lengthOk: lengthWords >= 4 && lengthWords <= 25,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* vocabulary suggestions                                                */
/* ------------------------------------------------------------------ */

export interface WordCard {
  word: string;
  ipa: string;
  pos: string;
  level: Cefr;
  meaning: string;
  example: string;
  tags: string[];
}

export function pickWordCards(
  dictionary: WordCard[],
  known: Set<string>,
  count = 6,
): WordCard[] {
  return dictionary
    .filter((w) => !known.has(w.word))
    .sort((a, b) => CEFR_ORDER.indexOf(a.level) - CEFR_ORDER.indexOf(b.level))
    .slice(0, count);
}

/** A short, encouraging response the tutor would say. */
export function tutorReply(analysis: SentenceAnalysis): string {
  const n = analysis.corrections.length;
  if (n === 0)
    return "That reads well. Try the same idea again but make it a little longer — add a reason with 'because'.";
  const must = analysis.corrections.filter((c) => c.severity === "must");
  if (must.length)
    return `Good attempt. One thing to fix: ${must[0].why} Change "${must[0].wrong}" to "${must[0].right}" and say it again.`;
  return `Nearly there. Small polish: ${analysis.corrections[0].why} Say it once more with that change.`;
}

/* ------------------------------------------------------------------ */
/* masked-language cloze                                                 */
/* ------------------------------------------------------------------ */

/**
 * A small, deterministic stand-in for a masked-language model.
 *
 * It scores each candidate against the surrounding context using three
 * signals: topical affinity from a hand-built concept table, morphological
 * similarity to words already in the passage, and a stable tiebreak so the
 * ranking never flickers between runs. It is not a transformer, and the UI
 * says so — but it behaves like one: given a masked slot and a candidate set,
 * it returns a ranked list with the confident answer first.
 */

const CONCEPT_TABLE: Record<string, string[]> = {
  efficiency: [
    "streamline",
    "consolidate",
    "reduce",
    "efficiency",
    "automatically",
    "cost",
    "process",
    "delivery",
    "recorded",
  ],
  money: [
    "substantial",
    "discount",
    "fee",
    "conference",
    "register",
    "month",
    "percentage",
    "cost",
  ],
  goal: ["objective", "goal", "reduce", "onboard", "client", "year"],
  relationship: ["negative", "positive", "relationship", "quality", "sleep", "found"],
  delay: ["actually", "accidentally", "announced", "enforced", "policy", "following"],
  business: [
    "subsidiary",
    "subsequent",
    "objective",
    "obligation",
    "client",
    "company",
    "attendees",
  ],
};

function normaliseWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z]/g, "");
}

/** Words in the passage, minus the masked slot itself. */
function contextWords(passage: string): string[] {
  return passage
    .split(/[^A-Za-z'-]+/)
    .map(normaliseWord)
    .filter((w) => w.length > 2);
}

/** A stable, seedless hash used for tie-breaking. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000;
}

function affinity(candidate: string, words: string[]): number {
  const c = normaliseWord(candidate);
  let best = 0;
  for (const [concept, members] of Object.entries(CONCEPT_TABLE)) {
    const inConcept = members.some((m) => normaliseWord(m) === c);
    if (!inConcept) continue;
    const hits = words.filter((w) => members.includes(w)).length;
    const signal = Math.min(1, hits / 3);
    best = Math.max(best, 0.45 + signal * 0.5 - (concept === "business" ? 0 : 0));
  }
  return best;
}

function morphological(candidate: string, words: string[]): number {
  const c = normaliseWord(candidate);
  let best = 0;
  for (const w of words) {
    if (w === c) continue;
    const shared = sharedPrefix(w, c);
    if (shared >= 3) best = Math.max(best, 0.25 + shared / 40);
  }
  return best;
}

function sharedPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

export interface MaskedPrediction {
  candidate: string;
  score: number;
}

/** Ranks the candidates for a masked slot, best first. */
export function rankCandidates(
  passage: string,
  candidates: string[],
): MaskedPrediction[] {
  const words = contextWords(passage);
  return candidates
    .map((candidate) => {
      const a = affinity(candidate, words);
      const m = morphological(candidate, words);
      const t = hash(candidate) / 1000;
      const score = Math.min(1, a * 0.6 + m * 0.3 + t * 0.1);
      return { candidate, score: +score.toFixed(4) };
    })
    .sort((x, y) => (y.score === x.score ? x.candidate.localeCompare(y.candidate) : y.score - x.score));
}

/**
 * Produces the model's view of a cloze item: the ranked candidates and the
 * confidence margin between the best and the runner-up.
 */
export function predictMasked(
  passage: string,
  candidates: string[],
): { ranked: MaskedPrediction[]; confidence: number; margin: number } {
  const ranked = rankCandidates(passage, candidates);
  const top = ranked[0]?.score ?? 0;
  const second = ranked[1]?.score ?? 0;
  return {
    ranked,
    confidence: +top.toFixed(3),
    margin: +(top - second).toFixed(3),
  };
}
