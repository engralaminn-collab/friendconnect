/**
 * Call-centre intelligence engine.
 *
 * Real-time and post-call analysis, entirely offline and deterministic:
 * live transcription split by channel, live assist, coaching nudges,
 * conversation metrics, sentiment, PII redaction, a three-part summary, a QA
 * scorecard, phase-based bot flows with human hand-over, and consent-gated
 * outbound recipes.
 */

import { mulberry32, hashSeed } from "./swarm-seed";

/* ------------------------------------------------------------------ */
/* types                                                                */
/* ------------------------------------------------------------------ */

export type Speaker = "agent" | "customer" | "bot";

export interface PiiHit {
  type: "email" | "phone" | "card" | "iban" | "postcode" | "name" | "date";
  value: string;
}

export interface Utterance {
  id: string;
  /** Seconds from the start of the call. */
  t: number;
  speaker: Speaker;
  /** Which audio channel the words came from. */
  channel: "mic" | "system";
  text: string;
  /** −1 negative to +1 positive. */
  sentiment: number;
  pii: PiiHit[];
  redacted: string;
  entities: string[];
  topics: string[];
  flags: string[];
}

export interface CallMetrics {
  totalSec: number;
  agentShare: number;
  wpm: number;
  questionsAsked: number;
  longestMonologueSec: number;
  interruptions: number;
  silences: number;
  empathyPhrases: number;
  pace: "slow" | "steady" | "fast";
}

export interface SummaryPoint {
  topic: string;
  speaker: string;
  point: string;
}

export interface ActionItem {
  owner: string;
  action: string;
  due: string;
}

export interface CallSummary {
  overview: string;
  keyPoints: SummaryPoint[];
  actionItems: ActionItem[];
  sentiment: { label: string; score: number };
  riskFlags: string[];
}

export interface QaScorecard {
  greeting: number;
  discovery: number;
  empathy: number;
  ownership: number;
  resolution: number;
  compliance: number;
  total: number;
  grade: string;
  notes: string[];
}

/* ------------------------------------------------------------------ */
/* PII detection and redaction                                          */
/* ------------------------------------------------------------------ */

const PII_PATTERNS: { type: PiiHit["type"]; re: RegExp }[] = [
  { type: "email", re: /[\w.+-]+@[\w-]+\.[\w.]+/g },
  { type: "phone", re: /(?:\+?\d[\d\s().-]{7,}\d)/g },
  { type: "card", re: /\b(?:\d[ -]?){13,19}\b/g },
  { type: "iban", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { type: "postcode", re: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/g },
  { type: "date", re: /\b(?:\d{1,2}[/.]\d{1,2}[/.]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g },
];

const NAME_HINT = /\b(?:my name is|i am|i'm|call me|mr|mrs|ms|dr)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;

export function detectPii(text: string): PiiHit[] {
  const hits: PiiHit[] = [];
  for (const { type, re } of PII_PATTERNS) {
    const matches = text.match(re);
    if (matches) {
      for (const m of matches) {
        if (type === "phone" && m.replace(/\D/g, "").length < 9) continue;
        if (type === "card" && m.replace(/\D/g, "").length < 13) continue;
        hits.push({ type, value: m.trim() });
      }
    }
  }
  const names = text.match(NAME_HINT);
  if (names) {
    for (const n of names) {
      const value = n.replace(/^(my name is|i am|i'm|call me|mr|mrs|ms|dr)\s+/i, "").trim();
      if (value) hits.push({ type: "name", value });
    }
  }
  return hits;
}

/** Replaces every detected value with a typed placeholder. */
export function redact(text: string, hits: PiiHit[] = detectPii(text)): string {
  let out = text;
  for (const h of hits) {
    if (!h.value) continue;
    out = out.split(h.value).join(`[${h.type.toUpperCase()}]`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* sentiment                                                            */
/* ------------------------------------------------------------------ */

const POSITIVE = [
  "thank","great","perfect","appreciate","helpful","love","excellent","glad",
  "happy","works","yes","sure","agree","good","fine","resolved","sorted",
];
const NEGATIVE = [
  "angry","frustrat","unacceptable","terrible","awful","worst","useless",
  "broken","still waiting","not working","cancel","complaint","disappoint",
  "ridiculous","never","rude","refund","problem","issue","error","fail",
];

export function scoreSentiment(text: string): number {
  const t = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE) if (t.includes(w)) score += 0.22;
  for (const w of NEGATIVE) if (t.includes(w)) score -= 0.26;
  if (/\bbut\b|\bhowever\b|\bthough\b/.test(t)) score -= 0.08;
  if (/[?]{2,}/.test(t)) score -= 0.1;
  return Math.max(-1, Math.min(1, Number(score.toFixed(3))));
}

export function sentimentLabel(score: number) {
  if (score > 0.25) return "positive";
  if (score < -0.25) return "negative";
  return "neutral";
}

/* ------------------------------------------------------------------ */
/* topics & entities                                                    */
/* ------------------------------------------------------------------ */

export const TOPIC_KEYWORDS: Record<string, string[]> = {
  billing: ["invoice","bill","charge","payment","refund","price","cost","subscription"],
  outage: ["down","outage","broken","not working","error","crash","offline"],
  onboarding: ["setup","onboard","new account","workspace","invite","member"],
  contract: ["contract","agreement","renew","term","renewal","signature"],
  migration: ["migrate","migration","import","export","move","switch"],
  support: ["support","ticket","agent","help","question","advice"],
  security: ["password","2fa","mfa","security","sso","permission","breach"],
  upgrade: ["upgrade","plan","tier","seats","trial"],
};

export function detectTopics(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  for (const [topic, keys] of Object.entries(TOPIC_KEYWORDS)) {
    if (keys.some((k) => t.includes(k))) out.push(topic);
  }
  return out;
}

export function detectEntities(text: string): string[] {
  const caps = text.match(/\b[A-Z][A-Za-z0-9]{2,}(?:\s+[A-Z][A-Za-z0-9]{2,})*\b/g) ?? [];
  const stop = new Set([
    "I","A","The","We","It","This","That","Yes","No","OK","Okay","Hello","Hi",
    "Monday","Tuesday","Wednesday","Thursday","Friday",
  ]);
  return [...new Set(caps.filter((c) => !stop.has(c) && c.length > 3))].slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* metrics                                                              */
/* ------------------------------------------------------------------ */

const EMPATHY = [
  "i understand","that sounds","sorry to hear","i'm sorry","i can imagine",
  "thank you for","that makes sense","i appreciate","of course","no problem",
];
const QUESTION_WORDS = ["?", "how", "what", "when", "why", "where", "which", "could", "would", "can"];

export function computeMetrics(utterances: Utterance[]): CallMetrics {
  const totalSec = utterances.length
    ? utterances[utterances.length - 1].t
    : 0;
  const agentWords = utterances
    .filter((u) => u.speaker === "agent" || u.speaker === "bot")
    .reduce((a, u) => a + countWords(u.text), 0);
  const allWords = utterances.reduce((a, u) => a + countWords(u.text), 0);
  const agentShare = allWords ? agentWords / allWords : 0.5;

  const minutes = Math.max(0.5, totalSec / 60);
  const wpm = Math.round(allWords / minutes);

  const questionsAsked = utterances.filter(
    (u) =>
      (u.speaker === "agent" || u.speaker === "bot") &&
      (u.text.includes("?") ||
        QUESTION_WORDS.slice(0, 6).some((w) =>
          u.text.toLowerCase().startsWith(w),
        )),
  ).length;

  let longestMonologue = 0;
  let run = 0;
  let prevSpeaker: Speaker | null = null;
  let prevT = 0;
  for (const u of utterances) {
    if (u.speaker === prevSpeaker) {
      run += u.t - prevT;
    } else {
      run = 0;
    }
    longestMonologue = Math.max(longestMonologue, run);
    prevSpeaker = u.speaker;
    prevT = u.t;
  }

  const interruptions = utterances.filter((u) => u.flags.includes("interruption")).length;
  const silences = utterances.filter((u) => u.flags.includes("silence")).length;
  const empathyPhrases = utterances.filter((u) =>
    EMPATHY.some((p) => u.text.toLowerCase().includes(p)),
  ).length;

  return {
    totalSec,
    agentShare: Number(agentShare.toFixed(2)),
    wpm,
    questionsAsked,
    longestMonologueSec: Math.round(longestMonologue),
    interruptions,
    silences,
    empathyPhrases,
    pace: wpm < 95 ? "slow" : wpm > 150 ? "fast" : "steady",
  };
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ------------------------------------------------------------------ */
/* live assist + coaching nudges                                        */
/* ------------------------------------------------------------------ */

export interface Assist {
  id: string;
  kind: "say-this" | "ask-this" | "lookup" | "action";
  text: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export function liveAssist(
  utterances: Utterance[],
  scenario: { product: string; policy: string },
): Assist[] {
  const last = utterances[utterances.length - 1];
  if (!last) return [];
  const out: Assist[] = [];
  const t = last.text.toLowerCase();
  const metrics = computeMetrics(utterances);

  if (metrics.agentShare > 0.72) {
    out.push({
      id: "a_share",
      kind: "say-this",
      text: "Let me pause there — what would you like me to do next?",
      reason: `You have spoken ${Math.round(metrics.agentShare * 100)}% of the call. Open it up.`,
      priority: "high",
    });
  }
  if (t.includes("cancel")) {
    out.push({
      id: "a_cancel",
      kind: "ask-this",
      text: "Before I process the cancellation, can I ask what would have made it work?",
      reason: "Cancellation intent detected — capture the reason while it is still recoverable.",
      priority: "high",
    });
  }
  if (t.includes("refund") || t.includes("charged")) {
    out.push({
      id: "a_refund",
      kind: "lookup",
      text: `Check the last three charges against the ${scenario.policy} window.`,
      reason: "Billing dispute — the policy window decides the outcome.",
      priority: "high",
    });
  }
  if (t.includes("outage") || t.includes("down") || t.includes("not working")) {
    out.push({
      id: "a_outage",
      kind: "action",
      text: "Open the status page and link the incident to the ticket.",
      reason: "Service issue reported — record the incident reference.",
      priority: "medium",
    });
  }
  if (last.sentiment < -0.3) {
    out.push({
      id: "a_emo",
      kind: "say-this",
      text: "I understand — that is genuinely frustrating, and I will get it sorted today.",
      reason: `Caller sentiment is ${last.sentiment.toFixed(2)}. Acknowledge before you solve.`,
      priority: "high",
    });
  }
  if (metrics.questionsAsked === 0 && utterances.length > 4) {
    out.push({
      id: "a_q",
      kind: "ask-this",
      text: "What are you mainly trying to achieve here?",
      reason: "No discovery questions yet.",
      priority: "medium",
    });
  }
  if (metrics.longestMonologueSec > 45) {
    out.push({
      id: "a_mono",
      kind: "say-this",
      text: "Let me summarise that and check I have it right.",
      reason: `${metrics.longestMonologueSec}s unbroken monologue.`,
      priority: "low",
    });
  }
  return out;
}

export interface Nudge {
  id: string;
  text: string;
  tone: "info" | "warn" | "good";
  at: number;
}

export function coachingNudges(utterances: Utterance[]): Nudge[] {
  const out: Nudge[] = [];
  const metrics = computeMetrics(utterances);
  if (metrics.agentShare > 0.75)
    out.push({
      id: "n_share",
      text: "Talk ratio is unbalanced — let the caller speak.",
      tone: "warn",
      at: metrics.totalSec,
    });
  if (metrics.pace === "fast")
    out.push({
      id: "n_pace",
      text: `${metrics.wpm} wpm is fast. Slow down for comprehension.`,
      tone: "warn",
      at: metrics.totalSec,
    });
  if (metrics.empathyPhrases >= 3)
    out.push({
      id: "n_emo",
      text: "Strong empathy signals — the caller is settling.",
      tone: "good",
      at: metrics.totalSec,
    });
  if (metrics.questionsAsked >= 4)
    out.push({
      id: "n_disc",
      text: "Good discovery coverage.",
      tone: "good",
      at: metrics.totalSec,
    });
  return out;
}

/* ------------------------------------------------------------------ */
/* summary                                                              */
/* ------------------------------------------------------------------ */

export function summariseCall(
  utterances: Utterance[],
  scenario: { agent: string; topic: string },
): CallSummary {
  const metrics = computeMetrics(utterances);
  const score =
    utterances.reduce((a, u) => a + u.sentiment, 0) / Math.max(1, utterances.length);
  const label = sentimentLabel(score);

  const topicCounts = new Map<string, number>();
  for (const u of utterances)
    for (const t of u.topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  const topTopics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]);

  const keyPoints: SummaryPoint[] = utterances
    .filter((u) => u.topics.length > 0 && u.text.length > 24)
    .slice(-6)
    .map((u) => ({
      topic: u.topics[0],
      speaker: u.speaker === "agent" || u.speaker === "bot" ? scenario.agent : "Caller",
      point: u.redacted,
    }));

  const actionItems: ActionItem[] = [];
  for (const u of utterances) {
    const t = u.text.toLowerCase();
    if (/\b(i'?ll|i will|we will|i'?m going to|we'?ll)\b/.test(t) && u.speaker !== "customer") {
      actionItems.push({
        owner: u.speaker === "bot" ? "Bot (auto)" : scenario.agent,
        action: u.redacted,
        due: "2 business days",
      });
    }
    if (/\b(please )?(send|email|share)\b/.test(t) && u.speaker === "agent") {
      actionItems.push({
        owner: scenario.agent,
        action: `Send the follow-up referenced on the call`,
        due: "today",
      });
    }
    if (/\brefund\b|\bcredit\b/.test(t) && u.speaker === "customer") {
      actionItems.push({
        owner: "Billing",
        action: "Review the refund request against the policy window",
        due: "3 business days",
      });
    }
  }

  const riskFlags: string[] = [];
  if (score < -0.2) riskFlags.push("Negative sentiment at the end of the call");
  if (metrics.agentShare > 0.7) riskFlags.push("Agent dominated the conversation");
  if (metrics.longestMonologueSec > 45) riskFlags.push("Long monologue — the caller may have disengaged");
  if (!actionItems.length) riskFlags.push("No follow-up captured — nothing will happen without a note");

  const overview = `A ${Math.round(metrics.totalSec / 60)}-minute ${scenario.topic} call between ${scenario.agent} and the caller. The conversation covered ${
    topTopics.slice(0, 3).map((t) => t[0]).join(", ") || "general questions"
  }. ${actionItems.length} follow-up action${actionItems.length === 1 ? "" : "s"} were captured, and the call closed with ${label} sentiment.`;

  return {
    overview,
    keyPoints,
    actionItems: actionItems.slice(0, 6),
    sentiment: { label, score: Number(score.toFixed(2)) },
    riskFlags,
  };
}

/* ------------------------------------------------------------------ */
/* QA scorecard                                                         */
/* ------------------------------------------------------------------ */

export function scoreCall(utterances: Utterance[]): QaScorecard {
  const metrics = computeMetrics(utterances);
  const first = utterances[0]?.text.toLowerCase() ?? "";
  const greeting = /hello|hi |good morning|good afternoon|welcome|thanks for calling/.test(first) ? 1 : 0.3;

  const discovery = Math.min(1, metrics.questionsAsked / 4);
  const empathy = Math.min(1, metrics.empathyPhrases / 3);
  const ownership = utterances.some((u) => /i'?ll|let me|i can|we will|send you/i.test(u.text)) ? 1 : 0.4;
  const resolution = utterances.some((u) =>
    /resolved|that's done|all set|fixed|issued|processed|completed/i.test(u.text),
  )
    ? 1
    : 0.45;

  const piiLeak = utterances.some(
    (u) => u.speaker === "agent" && u.pii.some((p) => p.type === "card"),
  );
  const compliance = piiLeak ? 0.2 : 1;

  const parts = { greeting, discovery, empathy, ownership, resolution, compliance };
  const total = Number(
    (
      (parts.greeting * 0.15 +
        parts.discovery * 0.25 +
        parts.empathy * 0.2 +
        parts.ownership * 0.15 +
        parts.resolution * 0.15 +
        parts.compliance * 0.1) *
      100
    ).toFixed(1),
  );

  const notes: string[] = [];
  if (parts.greeting < 1) notes.push("Open with a proper greeting — it sets the tone.");
  if (parts.discovery < 0.6) notes.push("Fewer than three discovery questions.");
  if (parts.empathy < 0.6) notes.push("Acknowledge the caller's problem before solving it.");
  if (parts.ownership < 1) notes.push("No clear ownership statement.");
  if (parts.resolution < 1) notes.push("Close the loop explicitly.");
  if (piiLeak) notes.push("Card data was read aloud — a compliance failure.");

  const grade = total >= 90 ? "A" : total >= 80 ? "B" : total >= 70 ? "C" : total >= 60 ? "D" : "F";

  return { ...parts, total, grade, notes };
}

/* ------------------------------------------------------------------ */
/* deterministic transcript generator                                   */
/* ------------------------------------------------------------------ */

const SCENARIO_LINES: Record<string, { speaker: Speaker; text: string }[]> = {
  billing: [
    { speaker: "agent", text: "Hello, thanks for calling Northwind support. Who am I speaking with?" },
    { speaker: "customer", text: "Hi, this is Amara Osei. I was charged twice for the September invoice and I need it looked at today." },
    { speaker: "agent", text: "I understand — being charged twice is genuinely frustrating. Let me pull up the account now." },
    { speaker: "agent", text: "I can see two charges on 14 September. Can you confirm the last four digits of the card you used?" },
    { speaker: "customer", text: "It ends 4417. I moved my billing date last month, so it may have run twice." },
    { speaker: "agent", text: "That would explain it. I can see the invoice and the retry on the same day. I will issue the duplicate back to your card today." },
    { speaker: "customer", text: "Thank you, that is all I needed. How long does the refund take?" },
    { speaker: "agent", text: "Three to five working days, and you will get a confirmation email at amara.osei@example.com within the hour." },
    { speaker: "customer", text: "Brilliant, thanks for sorting it." },
    { speaker: "agent", text: "My pleasure. You will have a reference FC-48210 in the email. Anything else I can help with?" },
  ],
  outage: [
    { speaker: "agent", text: "Hello, you have reached Northwind support. What can I do for you?" },
    { speaker: "customer", text: "The dashboard has been showing errors for two hours. We cannot send a single campaign." },
    { speaker: "agent", text: "I am sorry to hear that — a two-hour outage is a serious problem for you. Give me two minutes to check the incident log." },
    { speaker: "customer", text: "We have a client presentation at four, so this is quite urgent." },
    { speaker: "agent", text: "Understood. I can see incident INC-2291, raised at 08:40, affecting the campaign send queue in the EU region. A fix is deploying now." },
    { speaker: "customer", text: "Will the queued campaigns send automatically once it is fixed?" },
    { speaker: "agent", text: "Yes. Queued campaigns retry automatically and nothing is lost. I will stay on the line until the first one goes out." },
    { speaker: "customer", text: "That is reassuring, thank you." },
    { speaker: "agent", text: "You are welcome. I will email the incident summary to amara.osei@example.com as well." },
  ],
  onboarding: [
    { speaker: "agent", text: "Hello, you have reached Northwind. How can I help?" },
    { speaker: "customer", text: "We signed up this morning and I cannot find where to invite my team." },
    { speaker: "agent", text: "That is a common first question, and it is a two-minute fix. Open Settings, then Members, then Invite." },
    { speaker: "customer", text: "Settings, Members, Invite. Got it. Is there a role I should pick for them?" },
    { speaker: "agent", text: "Editor is the default and it lets them create and send campaigns. Admin adds billing. You can change it later." },
    { speaker: "customer", text: "Perfect. And the trial is 14 days?" },
    { speaker: "agent", text: "Fourteen days, and it does not need a card up front. You can invite the whole team now and sort billing later." },
    { speaker: "customer", text: "Great, that is everything. Thanks!" },
  ],
};

export interface GeneratedCall {
  utterances: Utterance[];
  metrics: CallMetrics;
  summary: CallSummary;
  qa: QaScorecard;
}

export function generateCall(
  scenarioKey: keyof typeof SCENARIO_LINES | string,
  seed = "seed",
): GeneratedCall {
  const lines = SCENARIO_LINES[scenarioKey] ?? SCENARIO_LINES.billing;
  const rand = mulberry32(hashSeed(scenarioKey + seed));
  const utterances: Utterance[] = [];
  let t = 0;

  lines.forEach((line, i) => {
    const words = countWords(line.text);
    const duration = Math.max(3, Math.round((words / 150) * 60 + rand() * 2));
    t += duration;
    const pii = detectPii(line.text);
    const flags: string[] = [];
    if (i > 0 && line.speaker !== lines[i - 1].speaker) {
      if (rand() > 0.78) flags.push("interruption");
    }
    if (rand() > 0.88) flags.push("silence");
    utterances.push({
      id: `u_${String(i + 1).padStart(3, "0")}`,
      t,
      speaker: line.speaker,
      channel: line.speaker === "agent" ? "mic" : "system",
      text: line.text,
      sentiment: scoreSentiment(line.text),
      pii,
      redacted: redact(line.text, pii),
      entities: detectEntities(line.text),
      topics: detectTopics(line.text),
      flags,
    });
  });

  const metrics = computeMetrics(utterances);
  const summary = summariseCall(utterances, {
    agent: "Northwind support",
    topic: scenarioKey,
  });
  const qa = scoreCall(utterances);

  return { utterances, metrics, summary, qa };
}

/* ------------------------------------------------------------------ */
/* bot flow phases                                                      */
/* ------------------------------------------------------------------ */

export interface FlowPhase {
  id: string;
  name: string;
  goal: string;
  instructions: string;
  tools: string[];
  /** Transition rules keyed by tool result. */
  transitions: { when: string; goto: string }[];
  /** A line the bot must say verbatim. */
  scripted?: string;
}

export interface FlowTool {
  id: string;
  name: string;
  description: string;
  parameters: { name: string; type: string; required: boolean }[];
  /** Tools may refuse — a refusal is a conversation, not an error. */
  canRefuse: boolean;
  refusalExample: string;
}

export const FLOW_TOOLS: FlowTool[] = [
  {
    id: "lookup_account",
    name: "lookup_account",
    description: "Fetch the caller's account, plan, seats and recent activity.",
    parameters: [
      { name: "email", type: "string", required: true },
      { name: "include_invoices", type: "boolean", required: false },
    ],
    canRefuse: false,
    refusalExample: "",
  },
  {
    id: "check_status",
    name: "check_status",
    description: "Look up the live incident list for the caller's region.",
    parameters: [{ name: "region", type: "string", required: true }],
    canRefuse: false,
    refusalExample: "",
  },
  {
    id: "queue_handover",
    name: "queue_handover",
    description: "Transfer the caller to a human queue with a summary attached.",
    parameters: [
      { name: "queue", type: "string", required: true },
      { name: "summary", type: "string", required: true },
    ],
    canRefuse: true,
    refusalExample: "The support queue is closed until 08:00 — I can take your details and call you back, or you can email us.",
  },
  {
    id: "schedule_callback",
    name: "schedule_callback",
    description: "Book a callback in a named window and confirm it to the caller.",
    parameters: [
      { name: "window", type: "string", required: true },
      { name: "phone", type: "string", required: true },
    ],
    canRefuse: true,
    refusalExample: "That window has just been taken. I can offer 14:30 or 16:00 instead.",
  },
  {
    id: "issue_credit",
    name: "issue_credit",
    description: "Apply a goodwill credit to the account, within the policy limit.",
    parameters: [
      { name: "email", type: "string", required: true },
      { name: "amount", type: "number", required: true },
    ],
    canRefuse: true,
    refusalExample: "That is above what I can approve without a supervisor. I can put it in front of one instead.",
  },
];

export const FLOW_PHASES: FlowPhase[] = [
  {
    id: "greeting",
    name: "Greeting",
    goal: "Confirm who is calling and what they need.",
    instructions:
      "Greet by name if the account is recognised. Ask for the email address only if the caller has not been identified. Keep it to two sentences.",
    tools: ["lookup_account"],
    transitions: [{ when: "account identified", goto: "discovery" }],
    scripted: "Hello, you have reached Northwind support. How can I help?",
  },
  {
    id: "discovery",
    name: "Discovery",
    goal: "Understand the problem well enough to act.",
    instructions:
      "Ask at most three questions. Repeat the problem back in your own words before proposing anything. Never guess a policy.",
    tools: ["lookup_account", "check_status"],
    transitions: [
      { when: "root cause known", goto: "resolution" },
      { when: "needs a human", goto: "handover" },
    ],
  },
  {
    id: "resolution",
    name: "Resolution",
    goal: "Fix it, or set a concrete expectation for when it will be fixed.",
    instructions:
      "Use a tool to act, then state plainly what you did and what happens next. Give a reference number.",
    tools: ["issue_credit", "schedule_callback"],
    transitions: [
      { when: "resolved", goto: "closing" },
      { when: "tool refused", goto: "handover" },
    ],
  },
  {
    id: "handover",
    name: "Handover",
    goal: "Get the caller to a person without losing context.",
    instructions:
      "Summarise the problem in two sentences, say who is taking over, and never say the call is being dropped. The transcript travels with the call.",
    tools: ["queue_handover"],
    transitions: [{ when: "queued", goto: "closing" }],
    scripted: "I am going to bring in a colleague who can take this further — I will pass on everything we have covered.",
  },
  {
    id: "closing",
    name: "Closing",
    goal: "Leave the caller certain about what happens next.",
    instructions:
      "Restate the next step, give a reference, and ask if there is anything else. Do not add new information at this point.",
    tools: [],
    transitions: [],
    scripted: "Is there anything else I can help you with today?",
  },
];

/* ------------------------------------------------------------------ */
/* outbound recipes (consent-gated)                                     */
/* ------------------------------------------------------------------ */

export interface OutboundRecipe {
  id: string;
  name: string;
  purpose: string;
  /** The artefact that proves the caller consented. */
  consentArtifact: string;
  /** Fields the bot is allowed to use. */
  permittedFields: string[];
  /** Fields that must be stripped even if requested. */
  strippedFields: string[];
  gatekeeper: string;
  maxAttempts: number;
  window: string;
  disposition: string;
  notes: string[];
}

export const OUTBOUND_RECIPES: OutboundRecipe[] = [
  {
    id: "call_reminder",
    name: "Appointment reminder",
    purpose: "Remind a booked customer about an upcoming appointment.",
    consentArtifact: "Booking confirmation containing an explicit reminder opt-in.",
    permittedFields: ["first name", "appointment time", "location"],
    strippedFields: ["salary", "medical notes", "full date of birth"],
    gatekeeper: "The person named on the booking, or a named representative.",
    maxAttempts: 3,
    window: "09:00–17:00 local, on the business day before",
    disposition: "reminded · callback-requested · wrong-number · unreachable",
    notes: [
      "If nobody answers, leave a voicemail only if the booking opted in to voicemail.",
      "A voicemail is not a reach — count it as unreachable.",
    ],
  },
  {
    id: "form_callback",
    name: "Form submission callback",
    purpose: "Call back a lead who submitted a public enquiry form.",
    consentArtifact: "The submitted form, including the consent checkbox state.",
    permittedFields: ["first name", "company", "the question they asked"],
    strippedFields: ["anything not in the form", "salary band", "internal notes"],
    gatekeeper: "A third party may answer — you may only confirm the callback, never the details.",
    maxAttempts: 2,
    window: "Next working day, within four hours of submission",
    disposition: "reached · callback-booked · permission-to-call-refused · unreachable",
    notes: [
      "If the form did not carry a consent flag, the recipe cannot run.",
      "Never re-ask for consent on a cold call and treat the answer as permission.",
    ],
  },
  {
    id: "qualification",
    name: "Lead qualification",
    purpose: "Qualify an inbound lead against the ideal customer profile.",
    consentArtifact: "Inbound enquiry with a marketing consent flag.",
    permittedFields: ["company size", "use case", "timeline"],
    strippedFields: ["legal entity names of staff", "compensation data"],
    gatekeeper: "The lead themselves.",
    maxAttempts: 2,
    window: "Within one working day of the enquiry",
    disposition: "qualified · not-a-fit · not-now · permission-refused · unreachable",
    notes: [
      "The unreached count is the product. A queue that looks tidy because it ignores dialling failures is a broken queue.",
      "Fail closed: anything ambiguous goes to a human, never to a guess.",
    ],
  },
];

/** Checks a recipe against its consent rules. */
export function checkConsent(
  recipe: OutboundRecipe,
  request: { consentArtifact: string; requestedFields: string[] },
): {
  allowed: boolean;
  permitted: string[];
  stripped: string[];
  reason: string;
} {
  const stripped = request.requestedFields.filter(
    (f) =>
      recipe.strippedFields.some(
        (s) => f.toLowerCase().includes(s.toLowerCase().split(" ")[0]),
      ),
  );
  const permitted = request.requestedFields.filter((f) => !stripped.includes(f));
  const hasArtifact = request.consentArtifact.trim().length > 8;
  return {
    allowed: hasArtifact,
    permitted,
    stripped,
    reason: hasArtifact
      ? `Consent artefact on file: ${request.consentArtifact}`
      : "No consent artefact on file — the recipe cannot run.",
  };
}

/* ------------------------------------------------------------------ */
/* workflow plugins                                                      */
/* ------------------------------------------------------------------ */

export interface WorkflowPlugin {
  id: string;
  platform: string;
  kind: "node" | "tool" | "action";
  triggers: string[];
  color: string;
  description: string;
}

export const WORKFLOW_PLUGINS: WorkflowPlugin[] = [
  { id: "wp_n8n", platform: "n8n", kind: "node", triggers: ["call.ended", "call.transferred"], color: "#ea4b71", description: "Push the CDR, transcript and action items into any n8n workflow." },
  { id: "wp_zapier", platform: "Zapier", kind: "action", triggers: ["call.ended"], color: "#ff4f00", description: "Fire a Zap when a call closes, with the summary as the payload." },
  { id: "wp_dify", platform: "Dify", kind: "tool", triggers: ["call.assisted"], color: "#1e80ff", description: "Expose the live transcript to a Dify agent during the call." },
  { id: "wp_hubspot", platform: "HubSpot", kind: "action", triggers: ["call.ended"], color: "#ff7a59", description: "Log the call, the sentiment and the action items against the contact." },
  { id: "wp_lark", platform: "Lark", kind: "action", triggers: ["call.missed", "call.ended"], color: "#00d6b9", description: "Send a summary card to the team channel, or alert on a missed high-value call." },
  { id: "wp_salesforce", platform: "Salesforce", kind: "action", triggers: ["call.ended"], color: "#00a1e0", description: "Create or update the activity and log the recording reference." },
];

/* ------------------------------------------------------------------ */
/* MCP tools available during a call                                     */
/* ------------------------------------------------------------------ */

export interface McpTool {
  name: string;
  server: string;
  description: string;
  trigger: string;
  schema: { name: string; type: string; required: boolean }[];
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: "search_docs",
    server: "cometchat-docs",
    description: "Search the product documentation for the exact behaviour the caller is describing.",
    trigger: "The caller asks 'is it possible to…' or names a feature you are unsure about.",
    schema: [{ name: "query", type: "string", required: true }],
  },
  {
    name: "lookup_account",
    server: "crm",
    description: "Pull plan, seats, invoices and recent activity for the caller.",
    trigger: "Any mention of a plan, invoice, seat count or contract.",
    schema: [
      { name: "email", type: "string", required: true },
      { name: "include_invoices", type: "boolean", required: false },
    ],
  },
  {
    name: "check_status",
    server: "status",
    description: "Return the current incident list and the caller's region.",
    trigger: "Any report of errors, downtime or slowness.",
    schema: [{ name: "region", type: "string", required: true }],
  },
  {
    name: "create_ticket",
    server: "support",
    description: "Open a ticket and return the reference number.",
    trigger: "A bug is confirmed and the caller wants it tracked.",
    schema: [
      { name: "summary", type: "string", required: true },
      { name: "severity", type: "string", required: true },
    ],
  },
];
