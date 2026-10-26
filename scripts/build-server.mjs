/**
 * Bundle the custom Next + Socket.IO server to plain Node ESM.
 * We bundle application code but externalize node_modules so Next's internal
 * module identity (AsyncLocalStorage) is never transformed by a loader.
 */
import { build } from "esbuild";

await build({
  entryPoints: ["server/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  outfile: "dist/server/index.cjs",
  packages: "external",
  sourcemap: true,
  logLevel: "info",
  banner: {
    // Next requires its environment baseline (AsyncLocalStorage globals) to
    // be evaluated before any next/dist module is required.
    js: "try { require('next/dist/server/node-environment-baseline'); } catch (e) { const { AsyncLocalStorage } = require('async_hooks'); if (!globalThis.AsyncLocalStorage) globalThis.AsyncLocalStorage = AsyncLocalStorage; }",
  },
});
