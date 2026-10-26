#!/usr/bin/env node
/**
 * Copy the static/public assets into the Next.js `standalone` output so the
 * server can be started with `node .next/standalone/server.js`.
 * No-op (with a clear message) when standalone output was not produced.
 */
import { cp, mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(standalone))) {
  console.log("[standalone] .next/standalone not found — skipping asset copy.");
  process.exit(0);
}

const copies = [
  [join(root, ".next", "static"), join(standalone, ".next", "static")],
  [join(root, "public"), join(standalone, "public")],
];

for (const [from, to] of copies) {
  if (!(await exists(from))) {
    console.log(`[standalone] skip ${from} (missing)`);
    continue;
  }
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to, { recursive: true });
  console.log(`[standalone] copied ${from} -> ${to}`);
}
