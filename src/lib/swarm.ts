/**
 * Offline multi-agent swarm simulation.
 *
 * Mirrors the shape of a local swarm engine: build a graph from a document,
 * generate personas, run a simulation where agents post, reply and shift
 * opinion, then report on what happened.
 *
 * The engine here is fully deterministic — a seeded PRNG drives every choice,
 * so the same document always produces the same run. No model is called; the
 * opinion dynamics are modelled directly.
 */

export interface Persona {
  id: string;
  name: string;
  handle: string;
  archetype: string;
  /** −1 (sceptical) to +1 (enthusiastic) starting stance. */
  bias: number;
  /** How quickly they react, 0–1. */
  reactionSpeed: number;
  /** How much others listen, 0–1. */
  influence: number;
  /** Persona memory — topics they have already reacted to. */
  memory: string[];
  avatarHue: number;
  followers: number;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: "person" | "company" | "event" | "policy" | "product";
  weight: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "mentions" | "funds" | "reacts" | "affects";
  weight: number;
}

export interface SwarmPost {
  id: string;
  round: number;
  authorId: string;
  author: string;
  handle: string;
  text: string;
  topic: string;
  sentiment: number;
  likes: number;
  replies: number;
  influence: number;
}

export interface SwarmRound {
  round: number;
  posts: number;
  positive: number;
  neutral: number;
  negative: number;
  meanSentiment: number;
  spread: number;
  topTopic: string;
}

export interface SwarmResult {
  posts: SwarmPost[];
  rounds: SwarmRound[];
  personaShift: { id: string; name: string; from: number; to: number }[];
  topicShare: { topic: string; count: number }[];
  influence: { id: string; name: string; score: number; followers: number }[];
  convergence: number;
  verdict: string;
}

/* ------------------------------------------------------------------ */
/* deterministic randomness                                              */
/* ------------------------------------------------------------------ */

import { mulberry32, hashSeed } from "./swarm-seed";

/* ------------------------------------------------------------------ */
/* persona generation                                                   */
/* ------------------------------------------------------------------ */

const ARCHETYPES = [
  { name: "early adopter", bias: 0.55, speed: 0.9, influence: 0.5 },
  { name: "sceptic", bias: -0.5, speed: 0.7, influence: 0.4 },
  { name: "influencer", bias: 0.2, speed: 0.95, influence: 0.95 },
  { name: "careful analyst", bias: -0.1, speed: 0.35, influence: 0.6 },
  { name: "day-to-day user", bias: 0.25, speed: 0.55, influence: 0.25 },
  { name: "industry watcher", bias: 0.05, speed: 0.45, influence: 0.7 },
  { name: "activist", bias: -0.7, speed: 0.85, influence: 0.55 },
  { name: "evangelist", bias: 0.8, speed: 0.9, influence: 0.75 },
];

const FIRST = [
  "Nadia","Omar","Priya","Tom","Lena","Kenji","Rosa","Igor","Aisha","Marco",
  "Yuki","Fatima","Diego","Hana","Viktor","Amara","Jonas","Mei","Ravi","Sofia",
  "Bilal","Elin","Kofi","Nina","Tariq","Clara","Dmitri","Zara","Paolo","Sana",
];

const LAST = [
  "Haddad","Bello","Nakamura","Okafor","Petrov","Silva","Khan","Novak","Dubois","Rossi",
  "Ibrahim","Yilmaz","Fernandez","Kaur","Mensah","Larsen","Costa","Rahman","Vargas","Nilsen",
];

const TOPICS = [
  "pricing",
  "privacy",
  "reliability",
  "onboarding",
  "support quality",
  "integration depth",
  "release cadence",
  "community trust",
  "mobile experience",
  "migration cost",
];

const OPENERS = [
  "Honest take on",
  "Two weeks in and",
  "Genuinely surprised by",
  "Still thinking about",
  "Nobody mentioned this about",
  "The part nobody talks about:",
  "After the last update,",
  "Sharing my notes on",
];

const CLAIMS = [
  "the value is real but the onboarding is rough around the edges.",
  "it holds up better than the launch material suggested.",
  "the docs are good, the defaults are not.",
  "this is exactly what we asked for last year.",
  "the pricing still makes no sense at our size.",
  "the migration took a weekend we did not have.",
  "the support answer was correct and actually useful.",
  "the mobile build lags the desktop one badly.",
  "the privacy posture is stronger than the competitors.",
  "the release cadence is reckless and we feel it.",
];

export function generatePersonas(
  count: number,
  seed: string,
  graphNodes: GraphNode[] = [],
): Persona[] {
  const rand = mulberry32(hashSeed(seed));
  const entities = graphNodes.filter((n) => n.kind === "person" || n.kind === "company");
  const personas: Persona[] = [];
  for (let i = 0; i < count; i++) {
    const arch = ARCHETYPES[Math.floor(rand() * ARCHETYPES.length)];
    const first = FIRST[Math.floor(rand() * FIRST.length)];
    const last = LAST[Math.floor(rand() * LAST.length)];
    const bias = Math.max(-1, Math.min(1, arch.bias + (rand() - 0.5) * 0.5));
    const memory: string[] = [];
    const base = entities.length
      ? entities[Math.floor(rand() * entities.length)].label
      : "the announcement";
    memory.push(`Read about ${base}`);
    if (rand() > 0.5) {
      memory.push(
        `Tried ${TOPICS[Math.floor(rand() * TOPICS.length)]} and had an opinion`,
      );
    }
    personas.push({
      id: `p_${String(i + 1).padStart(3, "0")}`,
      name: `${first} ${last}`,
      handle: `@${first.toLowerCase()}${last.toLowerCase()}`,
      archetype: arch.name,
      bias,
      reactionSpeed: Math.max(0.05, Math.min(1, arch.speed + (rand() - 0.5) * 0.2)),
      influence: Math.max(0.05, Math.min(1, arch.influence + (rand() - 0.5) * 0.2)),
      memory,
      avatarHue: Math.floor(rand() * 360),
      followers: Math.floor(rand() * 48000) + 400,
    });
  }
  return personas;
}

/* ------------------------------------------------------------------ */
/* simulation                                                           */
/* ------------------------------------------------------------------ */

export function runSwarm(options: {
  personas: Persona[];
  rounds: number;
  seed: string;
  postsPerRound?: number;
}): SwarmResult {
  const rand = mulberry32(hashSeed(options.seed + ":" + options.rounds));
  const perRound = options.postsPerRound ?? Math.max(6, Math.round(options.personas.length * 0.22));
  const state = new Map(options.personas.map((p) => [p.id, p.bias]));
  const posts: SwarmPost[] = [];
  const rounds: SwarmRound[] = [];
  const topicCounts = new Map<string, number>();

  for (let r = 1; r <= options.rounds; r++) {
    const roundPosts: SwarmPost[] = [];

    for (let i = 0; i < perRound; i++) {
      const persona = options.personas[Math.floor(rand() * options.personas.length)];
      const stance = state.get(persona.id) ?? persona.bias;

      // Exposure: recent posts weighted by the author's influence.
      const recent = posts.slice(-12);
      let exposure = 0;
      let weight = 0;
      for (const p of recent) {
        const w = 0.3 + p.influence;
        exposure += p.sentiment * w;
        weight += w;
      }
      const social = weight ? exposure / weight : 0;
      const pull = (social - stance) * persona.reactionSpeed * 0.55;
      const noise = (rand() - 0.5) * 0.22;
      const next = Math.max(-1, Math.min(1, stance + pull + noise));
      state.set(persona.id, next);

      const topic = TOPICS[Math.floor(rand() * TOPICS.length)];
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);

      const opener = OPENERS[Math.floor(rand() * OPENERS.length)];
      const claim = CLAIMS[Math.floor(rand() * CLAIMS.length)];
      const text = `${opener} ${topic} — ${claim}`;

      const post: SwarmPost = {
        id: `post_${r}_${i}`,
        round: r,
        authorId: persona.id,
        author: persona.name,
        handle: persona.handle,
        text,
        topic,
        sentiment: Number(next.toFixed(3)),
        likes: Math.floor(rand() * 40 * persona.influence + rand() * 12),
        replies: Math.floor(rand() * 14 * persona.influence + rand() * 4),
        influence: Number(persona.influence.toFixed(2)),
      };
      roundPosts.push(post);
      posts.push(post);
    }

    const sents = roundPosts.map((p) => p.sentiment);
    const positive = sents.filter((s) => s > 0.2).length;
    const negative = sents.filter((s) => s < -0.2).length;
    const neutral = roundPosts.length - positive - negative;
    const mean = sents.reduce((a, b) => a + b, 0) / Math.max(1, sents.length);
    const spread =
      sents.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, sents.length);

    const topicTally = new Map<string, number>();
    for (const p of roundPosts) {
      topicTally.set(p.topic, (topicTally.get(p.topic) ?? 0) + 1);
    }
    const topTopic = [...topicTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    rounds.push({
      round: r,
      posts: roundPosts.length,
      positive,
      neutral,
      negative,
      meanSentiment: Number(mean.toFixed(3)),
      spread: Number(spread.toFixed(3)),
      topTopic,
    });
  }

  const personaShift = options.personas.map((p) => ({
    id: p.id,
    name: p.name,
    from: Number(p.bias.toFixed(3)),
    to: Number((state.get(p.id) ?? p.bias).toFixed(3)),
  }));

  const all = [...state.values()];
  const meanFinal = all.reduce((a, b) => a + b, 0) / Math.max(1, all.length);
  const variance =
    all.reduce((a, b) => a + (b - meanFinal) ** 2, 0) / Math.max(1, all.length);
  const convergence = Math.max(0, Math.min(1, 1 - Math.sqrt(variance) * 1.4));

  const topicShare = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);

  const influence = options.personas
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: Number((p.influence * 100).toFixed(1)),
      followers: p.followers,
    }))
    .sort((a, b) => b.score - a.score);

  const verdict =
    meanFinal > 0.25
      ? "Public reaction skews positive; the dominant risk is under-communicating the trade-offs."
      : meanFinal < -0.25
        ? "Public reaction skews negative; the objection is about trust, not features."
        : "The conversation is polarised. Expect a long tail of undecided voices.";

  return {
    posts: posts.slice(-80),
    rounds,
    personaShift: personaShift.sort(
      (a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from),
    ),
    topicShare,
    influence,
    convergence: Number(convergence.toFixed(2)),
    verdict,
  };
}

/* ------------------------------------------------------------------ */
/* graph extraction (entity heuristic)                                  */
/* ------------------------------------------------------------------ */

const ORG_SUFFIX = /(Inc|Ltd|LLP|PLC|Corp|Corporation|Group|Labs|Studios|Partners)\b/i;

export function extractGraph(text: string): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const addNode = (label: string, kind: GraphNode["kind"]) => {
    const key = label.toLowerCase();
    const existing = nodes.get(key);
    if (existing) {
      existing.weight += 1;
      return existing;
    }
    const node: GraphNode = { id: `n_${nodes.size + 1}`, label, kind, weight: 1 };
    nodes.set(key, node);
    return node;
  };

  for (const sentence of sentences) {
    const caps = sentence.match(/\b[A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*){0,3}\b/g) ?? [];
    const filtered = caps.filter(
      (c) =>
        !/^(The|This|That|These|Those|It|We|They|He|She|A|An|In|On|At|But|And|If|When|While|After|Before|For|From|With|Our|Their|Its|There|Then|So)$/.test(c) &&
        c.length > 2 &&
        !/^\d+$/.test(c),
    );
    for (const c of filtered.slice(0, 6)) {
      const kind: GraphNode["kind"] = ORG_SUFFIX.test(c)
        ? "company"
        : /^(Policy|Act|Rule|Bill|Regulation|Directive)$/i.test(c)
        ? "policy"
        : "person";
      addNode(c, kind);
    }
    if (filtered.length >= 2) {
      const a = addNode(filtered[0], "person");
      const b = addNode(filtered[1], "company");
      if (a.id !== b.id) {
        edges.push({
          from: a.id,
          to: b.id,
          kind: "mentions",
          weight: 1,
        });
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}
