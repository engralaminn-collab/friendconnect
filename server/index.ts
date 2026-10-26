/**
 * Production-style single-process server: Next.js request handler and the
 * authenticated Socket.IO engine share one HTTP server and port.
 *
 * Usage:
 *   npm run dev:socket   (development, HMR)
 *   npm run build && npm run start:socket   (production)
 */
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { initRealtime } from "../src/server/realtime/engine";
import { env } from "../src/server/config/env";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = createServer((req, res) => {
    try {
      // The realtime path is owned by Socket.IO; everything else goes to Next.
      if (req.url?.startsWith(env.WEBSOCKET_PATH)) return;
      handle(req, res, parse(req.url ?? "/", true));
    } catch (err) {
      console.error("[server] request error", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  initRealtime(server);

  server.listen(port, hostname, () => {
    // eslint-disable-next-line no-console
    console.log(`FriendConnect ready on http://${hostname}:${port} (realtime: ${env.WEBSOCKET_PATH})`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
