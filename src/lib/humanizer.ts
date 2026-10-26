/**
 * The Humanizer — six editing passes that strip the tell-tale rhythm of
 * generated prose. Deterministic, explainable and reversible enough to be
 * useful in a real editorial workflow.
 */

export interface Pass {
  id: string;
  name: string;
  description: string;
  count: number;
}

export interface HumanizeResult {
  text: string;
  passes: Pass[];
  scoreBefore: number;
  scoreAfter: number;
}

const CLICHES: [RegExp, string][] = [
  [/\bIn today's (?:fast-paced|rapidly evolving|digital) world\b/gi, "Right now"],
  [/\bIt(?:'s| is) important to note that\b/gi, ""],
  [/\bIt(?:'s| is) worth noting that\b/gi, ""],
  [/\bIn conclusion\b/gi, "So"],
  [/\bAt the end of the day\b/gi, "Ultimately"],
  [/\bWhen it comes to\b/gi, "For"],
  [/\bA testament to\b/gi, "Evidence of"],
  [/\bNavigating the (?:complexities|landscape) of\b/gi, "Working through"],
  [/\bLeverage[sd]?\b/gi, "use"],
  [/\butilise[sd]?\b/gi, "use"],
  [/\butilize[sd]?\b/gi, "use"],
  [/\bSeamlessly\b/gi, "smoothly"],
  [/\bRobust\b/gi, "solid"],
  [/\bRevolutionary\b/gi, "significant"],
  [/\bgame-?changer\b/gi, "big change"],
  [/\bIn an increasingly\b/gi, "In a"],
  [/\bever-?(?:evolving|changing)\b/gi, "changing"],
  [/\bparadigm shift\b/gi, "major change"],
  [/\bsynergy\b/gi, "coordination"],
  [/\bleverage points\b/gi, "levers"],
  [/\bmultifaceted\b/gi, "many-sided"],
  [/\bholistic\b/gi, "complete"],
  [/\bactionable insights?\b/gi, "steps you can take"],
  [/\bdeep dive into\b/gi, "a close look at"],
  [/\bcrucial\b/gi, "important"],
  [/\bfoster\b/gi, "build"],
  [/\bunlock the (?:power|potential)\b/gi, "get more from"],
];

const HEDGES: [RegExp, string][] = [
  [/\bIt could be argued that\b/gi, ""],
  [/\bIt is possible that\b/gi, ""],
  [/\bOne might argue\b/gi, ""],
  [/\bBroadly speaking\b/gi, ""],
  [/\bGenerally speaking\b/gi, ""],
  [/\bIt should be noted that\b/gi, ""],
  [/\bGenerally,\s*/g, ""],
  [/\bEssentially,\s*/g, ""],
  [/\bBasically,\s*/g, ""],
  [/\bVery\s+/g, ""],
  [/\bReally\s+/g, ""],
  [/\bQuite\s+/g, ""],
  [/\bExtremely\s+/g, ""],
  [/\bHighly\s+/g, ""],
  [/\bFairly\s+/g, ""],
  [/\bSomewhat\s+/g, ""],
  [/\barguably\s+/g, ""],
  [/\bI think that\b/gi, ""],
  [/\bWe believe that\b/gi, ""],
  [/\bThis could\b/gi, "This can"],
  [/\bmight be able to\b/gi, "can"],
];

const NOT_JUST = [
  /\bIt(?:'s| is) not just ([^.,;]+?)([,;.])\s*(it(?:'s| is)|but it(?:'s| is) also)\s+([^.,;]+)/gi,
  /\bnot merely ([^.,;]+?) but (also )?([^.,;]+)/gi,
];

const FILLER_OPENERS = [
  "Moreover, ",
  "Furthermore, ",
  "Additionally, ",
  "In addition, ",
  "That said, ",
  "With that in mind, ",
  "Nevertheless, ",
  "Consequently, ",
  "Subsequently, ",
  "Ultimately, ",
];

function sentences(text: string) {
  return text.match(/[^.!?\n]+[.!?]*/g) ?? [];
}

function sentenceLength(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function applyCliches(text: string) {
  let out = text;
  let count = 0;
  for (const [re, rep] of CLICHES) {
    out = out.replace(re, (...args) => {
      count += 1;
      return rep;
    });
  }
  return { text: out, count };
}

function applyHedges(text: string) {
  let out = text;
  let count = 0;
  for (const [re, rep] of HEDGES) {
    out = out.replace(re, (...args) => {
      count += 1;
      return rep;
    });
  }
  return { text: out, count };
}

function applyNotJust(text: string) {
  let out = text;
  let count = 0;
  for (const re of NOT_JUST) {
    out = out.replace(re, (match, a, p1, p2) => {
      count += 1;
      if (p1 !== undefined && p2 !== undefined) {
        // "not just X, it is also Y" -> "X, and Y"
        return `${a}, and ${p2}`;
      }
      return `${a} — ${p2}`;
    });
  }
  return { text: out, count };
}

function applyRhythm(text: string) {
  // Lengthen a run of similar-length sentences by splitting some in two.
  const blocks = text.split(/(\n{2,})/);
  let count = 0;
  const out = blocks.map((block) => {
    if (!block.trim() || /^\n+$/.test(block)) return block;
    const list = sentences(block);
    if (list.length < 3) return block;

    const lengths = list.map(sentenceLength);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const similar = lengths.filter((l) => Math.abs(l - avg) < 3).length / lengths.length;

    if (similar < 0.6) return block;

    const rebuilt: string[] = [];
    list.forEach((s, i) => {
      const words = s.trim().split(/\s+/);
      if (words.length > 26 && i % 2 === 0) {
        const mid = Math.floor(words.length / 2);
        const head = words.slice(0, mid).join(" ");
        const tail = words.slice(mid).join(" ");
        rebuilt.push(`${head}. ${tail}`);
        count += 1;
      } else {
        rebuilt.push(s);
      }
    });
    return rebuilt.join(" ");
  });
  return { text: out.join(""), count };
}

function applySummaryStrip(text: string) {
  // Remove trailing summary paragraphs that restate the piece.
  const blocks = text.split(/(\n{2,})/);
  const meaningful = blocks.filter((b) => b.trim() && !/^\n+$/.test(b));
  if (meaningful.length < 2) return { text, count: 0 };

  const last = meaningful[meaningful.length - 1].trim();
  const summarySignals =
    /\b(?:in summary|to sum up|overall|the key takeaway|ultimately|in conclusion|to conclude|the bottom line)\b/i;
  const repeatsFirst =
    meaningful[0]
      .split(/\s+/)
      .filter((w) => w.length > 6)
      .some((w) => last.toLowerCase().includes(w.toLowerCase()));

  if (summarySignals.test(last) || repeatsFirst) {
    const kept: string[] = [];
    blocks.forEach((b, i) => {
      if (i === blocks.length - 1) return;
      kept.push(b);
    });
    return { text: kept.join("").trimEnd(), count: 1 };
  }
  return { text, count: 0 };
}

function applyFillers(text: string) {
  let count = 0;
  let out = text;
  for (const f of FILLER_OPENERS) {
    const re = new RegExp(`^${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m");
    if (re.test(out)) {
      count += 1;
      out = out.replace(re, "");
    }
  }
  return { text: out, count };
}

export function humanizeScore(text: string) {
  const total = text.trim().split(/\s+/).filter(Boolean).length;
  if (!total) return 0;

  let penalty = 0;
  for (const [re] of CLICHES) {
    penalty += (text.match(new RegExp(re.source, "gi")) ?? []).length * 4;
  }
  for (const [re] of HEDGES) {
    penalty += (text.match(new RegExp(re.source, "gi")) ?? []).length * 2;
  }
  penalty += (text.match(NOT_JUST[0]) ?? []).length * 5;

  const sents = sentences(text);
  if (sents.length > 3) {
    const lengths = sents.map(sentenceLength);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const similar = lengths.filter((l) => Math.abs(l - avg) < 3).length / lengths.length;
    penalty += Math.round(similar * 14);
  }

  const density = total / Math.max(1, sents.length);
  if (density > 24) penalty += 6;

  return Math.max(0, Math.min(100, 100 - penalty));
}

export function humanize(input: string): HumanizeResult {
  const scoreBefore = humanizeScore(input);

  const c = applyCliches(input);
  const h = applyHedges(c.text);
  const n = applyNotJust(h.text);
  const f = applyFillers(n.text);
  const r = applyRhythm(f.text);
  const s = applySummaryStrip(r.text);

  const passes: Pass[] = [
    {
      id: "cliche",
      name: "Remove clichés",
      description: "Strip stock phrases and empty superlatives.",
      count: c.count,
    },
    {
      id: "hedge",
      name: "Cut hedging",
      description: "Replace soft qualifiers with plain statements.",
      count: h.count,
    },
    {
      id: "notjust",
      name: "Break “not just X”",
      description: "Rewrite the construction that dominates generated prose.",
      count: n.count,
    },
    {
      id: "filler",
      name: "Drop filler openers",
      description: "Remove moreover, furthermore, additionally and friends.",
      count: f.count,
    },
    {
      id: "rhythm",
      name: "Vary sentence length",
      description: "Split runs of similarly sized sentences.",
      count: r.count,
    },
    {
      id: "summary",
      name: "Strip summary paragraph",
      description: "End on a concrete detail rather than a restatement.",
      count: s.count,
    },
  ];

  const finalText = s.text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();

  return {
    text: finalText,
    passes,
    scoreBefore,
    scoreAfter: humanizeScore(finalText),
  };
}

/** Rough SEO scoring for a piece of content. */
export function seoScore(input: {
  title: string;
  body: string;
  excerpt?: string;
  keywords: string[];
  slug?: string;
}) {
  const { title, body, excerpt = "", keywords, slug = "" } = input;
  const checks: { label: string; pass: boolean; detail: string; weight: number }[] = [];

  const titleLen = title.length;
  checks.push({
    label: "Title length (50–60 chars)",
    pass: titleLen >= 45 && titleLen <= 65,
    detail: `${titleLen} characters`,
    weight: 12,
  });

  const kw = keywords[0]?.toLowerCase() ?? "";
  checks.push({
    label: "Primary keyword in title",
    pass: !!kw && title.toLowerCase().includes(kw),
    detail: kw
      ? title.toLowerCase().includes(kw)
        ? "Present"
        : `“${kw}” is missing`
      : "No primary keyword set",
    weight: 14,
  });

  checks.push({
    label: "Primary keyword in first paragraph",
    pass: !!kw && body.slice(0, 320).toLowerCase().includes(kw),
    detail: kw ? (body.slice(0, 320).toLowerCase().includes(kw) ? "Present" : "Missing from the opening") : "No keyword set",
    weight: 12,
  });

  const words = body.trim().split(/\s+/).filter(Boolean).length;
  checks.push({
    label: "Content length (600+ words)",
    pass: words >= 600,
    detail: `${words} words`,
    weight: 16,
  });

  const headings = (body.match(/^##\s+.+$/gm) ?? []).length;
  checks.push({
    label: "Subheadings (H2) for scannability",
    pass: headings >= 3,
    detail: `${headings} H2 headings`,
    weight: 10,
  });

  checks.push({
    label: "Meta description (110–160 chars)",
    pass: excerpt.length >= 110 && excerpt.length <= 165,
    detail: excerpt ? `${excerpt.length} characters` : "No description set",
    weight: 10,
  });

  const links = (body.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
  checks.push({
    label: "Internal links",
    pass: links >= 3,
    detail: `${links} markdown links found`,
    weight: 8,
  });

  const slugOk = slug.length > 8 && !slug.includes(" ") && slug.length <= 72;
  checks.push({
    label: "Clean slug",
    pass: slugOk,
    detail: slug ? `/${slug}` : "No slug set",
    weight: 6,
  });

  const density = kw ? (body.toLowerCase().split(kw).length - 1) / Math.max(1, words / 100) : 0;
  checks.push({
    label: "Keyword density (0.5–2.5%)",
    pass: density >= 0.5 && density <= 2.5,
    detail: `${density.toFixed(1)}%`,
    weight: 12,
  });

  const score = Math.round(
    checks.reduce((a, c) => a + (c.pass ? c.weight : 0), 0),
  );

  return { score, checks, words };
}

/** Repurpose a long-form article into channel-native formats. */
export function repurpose(article: { title: string; excerpt: string; body: string; keywords: string[] }) {
  const paras = article.body.split(/\n{2,}/).filter((p) => p.trim());
  const headingOf = paras.find((p) => p.startsWith("## "))?.slice(3) ?? "the key idea";
  const firstPara = paras.find((p) => !p.startsWith("## ")) ?? "";
  const points = paras
    .filter((p) => p.startsWith("- "))
    .map((p) => p.replace(/^-\s*/, ""))
    .slice(0, 5);

  const hashtags = article.keywords
    .slice(0, 4)
    .map((k) => `#${k.replace(/\s+/g, "")}`)
    .join(" ");

  return {
    carousel: [
      `1/ ${article.title}`,
      `2/ ${headingOf}`,
      ...points.map((p, i) => `${i + 3}/ ${p.split(/[.!?]/)[0].slice(0, 80)}`),
      `${points.length + 3}/ ${article.excerpt.slice(0, 90)}`,
    ],
    thread: paras
      .filter((p) => !p.startsWith("## "))
      .slice(0, 6)
      .map((p, i) => `${i + 1}/ ${p.replace(/\n/g, " ").slice(0, 260)}`),
    email: {
      subject: article.title,
      preheader: article.excerpt.slice(0, 110),
      body: firstPara.slice(0, 700),
      cta: "Read the full piece",
    },
    short: `${article.excerpt}\n\n${hashtags}`,
    linkedin: `${article.excerpt}\n\n${points.map((p) => `• ${p.split(/[.!?]/)[0]}`).join("\n")}\n\n${hashtags}`,
    video: {
      hook: article.excerpt.slice(0, 110),
      scenes: points.slice(0, 4).map((p, i) => ({
        index: i + 1,
        title: p.split(/[.!?]/)[0].slice(0, 46),
        narration: p.slice(0, 180),
        duration: 14,
        shot: "Presenter + supporting visual",
        transition: "cut",
        color: ["#3b64f6", "#14b8a6", "#f59e0b", "#8b5cf6"][i % 4],
      })),
    },
  };
}
