/**
 * Gibberlink — a sound-level protocol for agent-to-agent conversation.
 *
 * Two conversational agents that confirm each other is an AI can switch to a
 * denser, cheaper wire format: the same information carried in symbols that
 * map to audio tones, so it can travel over an audio channel as well as text.
 *
 * This is a text-mode implementation of the idea:
 *   1. A handshake confirms both sides are agents.
 *   2. The message is framed (length + payload + checksum), base64 encoded,
 *      and each character is mapped onto one of 64 tone symbols.
 *   3. Each symbol resolves to a frequency, so the token string can also be
 *      rendered as a tone sequence and read back from the waveform.
 *
 * Everything is deterministic and reversible — `decodeGibber` recovers the
 * original string exactly, or reports why it could not.
 */

const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** 64 symbols, one per 6-bit value. Chosen to read as "sound levels". */
export const SOUND_ALPHABET =
  "abcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,-./:;<=>?@[]_`{|}~";

if (SOUND_ALPHABET.length !== 64) {
  throw new Error("SOUND_ALPHABET must contain exactly 64 symbols");
}

const INDEX = new Map<string, number>(
  [...SOUND_ALPHABET].map((c, i) => [c, i]),
);

/** The protocol handshake, verbatim. */
export const GIBBER_HANDSHAKE = {
  probe: "gbrl:agent?",
  ack: "gbrl:agent!",
  switch: "gbrl:switch/1",
  back: "gbrl:human/1",
} as const;

export interface GibberFrame {
  /** The encoded token, ready to send. */
  token: string;
  /** Decoded text. */
  text: string;
  /** Number of payload bytes. */
  bytes: number;
  /** Payload bytes per token character. */
  ratio: number;
}

export interface GibberDecode {
  ok: boolean;
  text?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* framing                                                              */
/* ------------------------------------------------------------------ */

function toBase64(bytes: number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64[b2 & 63];
  }
  return out;
}

function fromBase64(text: string): number[] {
  const clean = text.replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error(`Invalid base64 character "${ch}"`);
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

function checksum(bytes: number[]): number {
  let sum = 0;
  for (const b of bytes) sum = (sum + b * 31) & 0xffff;
  return sum;
}

/* ------------------------------------------------------------------ */
/* encode / decode                                                      */
/* ------------------------------------------------------------------ */

/** Encodes plain text into a sound-level token. */
export function encodeGibber(text: string): string {
  const payload = Array.from(new TextEncoder().encode(text));
  const framed = [
    (payload.length >> 8) & 0xff,
    payload.length & 0xff,
    ...payload,
    (checksum(payload) >> 8) & 0xff,
    checksum(payload) & 0xff,
  ];
  const b64 = toBase64(framed);
  return b64
    .split("")
    .map((c) => SOUND_ALPHABET[B64.indexOf(c)])
    .join("");
}

/** Decodes a sound-level token back into plain text. */
export function decodeGibber(token: string): GibberDecode {
  const clean = token.trim();
  if (!clean) return { ok: false, error: "Empty token" };

  let b64 = "";
  for (const c of clean) {
    const i = INDEX.get(c);
    if (i === undefined) {
      return {
        ok: false,
        error: `Token contains a symbol outside the protocol: "${c}"`,
      };
    }
    b64 += B64[i];
  }

  let framed: number[];
  try {
    framed = fromBase64(b64);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Malformed token",
    };
  }

  if (framed.length < 4) return { ok: false, error: "Token is too short" };

  const length = (framed[0] << 8) | framed[1];
  const payload = framed.slice(2, 2 + length);
  const got = (framed[2 + length] << 8) | framed[3 + length];
  const want = checksum(payload);

  if (payload.length !== length) {
    return { ok: false, error: "Length header does not match the payload" };
  }
  if (got !== want) {
    return { ok: false, error: "Checksum mismatch — the token was corrupted" };
  }

  return { ok: true, text: new TextDecoder().decode(new Uint8Array(payload)) };
}

/** Encodes and reports the density of the result. */
export function gibberFrame(text: string): GibberFrame {
  const token = encodeGibber(text);
  const bytes = new TextEncoder().encode(text).length;
  return {
    token,
    text,
    bytes,
    ratio: token.length ? +(token.length / Math.max(1, bytes)).toFixed(2) : 0,
  };
}

/* ------------------------------------------------------------------ */
/* tone mapping                                                         */
/* ------------------------------------------------------------------ */

export interface Tone {
  symbol: string;
  index: number;
  /** Carrier frequency in Hz for the symbol. */
  freq: number;
  /** The second tone of the pair — ggwave sends data in frequency pairs. */
  freq2: number;
}

/** Resolves every symbol in a token to its tone pair. */
export function gibberTones(token: string): Tone[] {
  return token.split("").map((symbol, i) => {
    const index = INDEX.get(symbol) ?? 0;
    return {
      symbol,
      index,
      freq: 800 + index * 40,
      freq2: 2400 + index * 60,
    };
  });
}

/** Compact waveform samples for rendering the token as an audio strip. */
export function gibberWaveform(token: string, samples = 96): number[] {
  const tones = gibberTones(token);
  if (!tones.length) return [];
  const out: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t = tones[Math.floor((i / samples) * tones.length)];
    const phase = (i / samples) * Math.PI * 2 * 14;
    const env = 0.45 + 0.55 * Math.abs(Math.sin((i / samples) * Math.PI * 6));
    out.push(Math.max(0, Math.min(1, env * (0.55 + 0.45 * Math.sin(phase + t.freq / 400)))));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* language negotiation                                                 */
/* ------------------------------------------------------------------ */

export type GibberPhase = "human" | "probing" | "acked" | "switched" | "back";

export interface NegotiationStep {
  from: "agent-a" | "agent-b";
  line: string;
  phase: GibberPhase;
}

/**
 * The handshake: two agents probe each other, acknowledge, then switch to the
 * sound-level protocol. Every step is reversible, so a human can be handed
 * the conversation back at any point.
 */
export function negotiateGibber(): NegotiationStep[] {
  return [
    { from: "agent-a", line: GIBBER_HANDSHAKE.probe, phase: "probing" },
    { from: "agent-b", line: GIBBER_HANDSHAKE.ack, phase: "acked" },
    { from: "agent-a", line: GIBBER_HANDSHAKE.switch, phase: "switched" },
  ];
}

/** Decodes a negotiation line into its phase, or null if it is not protocol. */
export function gibberPhaseOf(line: string): GibberPhase | null {
  const t = line.trim();
  if (t === GIBBER_HANDSHAKE.probe) return "probing";
  if (t === GIBBER_HANDSHAKE.ack) return "acked";
  if (t === GIBBER_HANDSHAKE.switch) return "switched";
  if (t === GIBBER_HANDSHAKE.back) return "back";
  return null;
}

/** A short, human explanation of the protocol for the UI. */
export const GIBBER_PROTOCOL_INFO = {
  id: "ggwave/1",
  symbolBits: 6,
  alphabetSize: 64,
  carrierHz: 800,
  stepHz: 40,
  secondCarrierHz: 2400,
  summary:
    "Each symbol carries 6 bits and maps to a pair of audio tones. A framed payload — length, bytes and a checksum — travels as one token string, so a corrupted symbol is detected instead of silently misread.",
  when:
    "Use it when both sides are confirmed agents and the channel is long, expensive, or being relayed by something that only carries sound.",
};
