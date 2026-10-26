"use client";

import * as React from "react";
import { seededRandom } from "@/lib/utils";

/**
 * Deterministic generative artwork.
 *
 * Every image in the studio is drawn from its prompt hash, so the same prompt
 * always renders the same picture — no network, no CDN, no asset pipeline.
 * Layered blobs, a soft grain pass and one geometric overlay are enough to
 * read as "a generated image" at gallery size.
 */

const PALETTES: [string, string, string][] = [
  ["#3b64f6", "#14b8a6", "#0b1020"],
  ["#f59e0b", "#ef4444", "#1a0f1c"],
  ["#8b5cf6", "#3b64f6", "#0a0f24"],
  ["#14b8a6", "#22c55e", "#04140f"],
  ["#ec4899", "#8b5cf6", "#150a1c"],
  ["#0ea5e9", "#6366f1", "#060c1c"],
  ["#f43f5e", "#f59e0b", "#1c0d12"],
  ["#22c55e", "#0ea5e9", "#04121a"],
];

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

interface Scene {
  palette: [string, string, string];
  blobs: { x: number; y: number; r: number; c: string; o: number }[];
  rings: { cx: number; cy: number; r: number; w: number; o: number }[];
  dots: { cx: number; cy: number; r: number }[];
  lines: number[];
  mode: number;
  angle: number;
  seed: number;
}

function buildScene(seed: string): Scene {
  const h = hash(seed);
  const rnd = seededRandom(seed);
  const palette = PALETTES[h % PALETTES.length];

  const count = 5 + Math.floor(rnd() * 3);
  const blobs = Array.from({ length: count }, () => ({
    x: 8 + rnd() * 84,
    y: 8 + rnd() * 84,
    r: 16 + rnd() * 34,
    c: palette[Math.floor(rnd() * 2)],
    o: 0.45 + rnd() * 0.5,
  }));

  const ringCount = 2 + Math.floor(rnd() * 4);
  const rings = Array.from({ length: ringCount }, (_, i) => ({
    cx: 12 + rnd() * 76,
    cy: 12 + rnd() * 76,
    r: 8 + i * (6 + rnd() * 12),
    w: 0.6 + rnd() * 1.6,
    o: 0.12 + rnd() * 0.3,
  }));

  const mode = Math.floor(rnd() * 3);
  const dotCount = Math.floor(rnd() * 22);
  const dots = Array.from({ length: dotCount }, () => ({
    cx: rnd() * 100,
    cy: rnd() * 100,
    r: 1.2 + rnd() * 2.4,
  }));

  const lines = Array.from({ length: 9 }, (_, i) => -10 + i * 14);

  return {
    palette,
    blobs,
    rings,
    dots,
    lines,
    mode,
    angle: Math.floor(rnd() * 90) + 10,
    seed: h % 100,
  };
}

export function GeneratedArt({
  seed,
  className,
  rounded = true,
  label,
}: {
  seed: string;
  className?: string;
  rounded?: boolean;
  label?: string;
}) {
  const id = React.useId().replace(/:/g, "");
  const scene = React.useMemo(() => buildScene(seed), [seed]);
  const { palette } = scene;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={rounded ? `rounded-xl ${className ?? ""}` : className}
      role="img"
      aria-label={label ?? "Generated artwork"}
    >
      <defs>
        <radialGradient id={`bg-${id}`} cx="30%" cy="20%" r="90%">
          <stop offset="0%" stopColor={palette[2]} />
          <stop offset="100%" stopColor="#05070f" />
        </radialGradient>
        <filter id={`blur-${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`grain-${id}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            seed={scene.seed}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <linearGradient
          id={`sheen-${id}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
          gradientTransform={`rotate(${scene.angle})`}
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor={palette[1]} stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#bg-${id})`} />

      <g filter={`url(#blur-${id})`}>
        {scene.blobs.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.c} opacity={b.o} />
        ))}
      </g>

      {scene.mode === 0 &&
        scene.rings.map((r, i) => (
          <circle
            key={i}
            cx={r.cx}
            cy={r.cy}
            r={r.r}
            fill="none"
            stroke="#ffffff"
            strokeWidth={r.w}
            opacity={r.o}
          />
        ))}

      {scene.mode === 1 && (
        <g opacity="0.28">
          {scene.lines.map((x, i) => (
            <line
              key={i}
              x1={x}
              y1="110"
              x2={x + 30}
              y2="-10"
              stroke="#ffffff"
              strokeWidth="0.5"
            />
          ))}
        </g>
      )}

      {scene.mode === 2 && (
        <g opacity="0.22">
          {scene.dots.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#ffffff" />
          ))}
        </g>
      )}

      <rect width="100" height="100" fill={`url(#sheen-${id})`} />
      <rect
        width="100"
        height="100"
        filter={`url(#grain-${id})`}
        opacity="0.09"
        style={{ mixBlendMode: "overlay" }}
      />
    </svg>
  );
}
