/**
 * Socket.IO attachment point when running under `next dev` / `next start`.
 *
 * The engine is attached once to the underlying Node HTTP server and reused.
 * For multi-instance production use the custom server (`npm run start:socket`)
 * plus the Redis adapter; see docs/DEPLOYMENT.md.
 *
 * If the runtime does not expose the Node socket (some serverless platforms),
 * the endpoint returns an honest 503 instead of pretending realtime works.
 */
import type { NextRequest } from "next/server";
import type { Server as HttpServer } from "node:http";
import { initRealtime } from "@/server/realtime/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalForIo = globalThis as unknown as { __fcIo?: unknown; __fcIoServer?: HttpServer };

function resolveHttpServer(req: NextRequest): HttpServer | null {
  const candidates = [
    (req as unknown as { socket?: { server?: HttpServer } }).socket?.server,
    (req as unknown as { httpServer?: HttpServer }).httpServer,
    (
      req as unknown as {
        context?: { appContext?: { server?: HttpServer } };
      }
    ).context?.appContext?.server,
  ];
  return candidates.find((c): c is HttpServer => Boolean(c)) ?? null;
}

async function boot(req: NextRequest): Promise<Response | null> {
  const httpServer = resolveHttpServer(req);
  if (!httpServer) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: "realtime_unavailable",
          message:
            "Realtime is not available on this runtime. Run the Socket.IO custom server (npm run start:socket).",
        },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!globalForIo.__fcIo || globalForIo.__fcIoServer !== httpServer) {
    initRealtime(httpServer);
    globalForIo.__fcIo = true;
    globalForIo.__fcIoServer = httpServer;
  }
  // Socket.IO handles the upgrade/polling request itself on the same server;
  // reaching here means a non-socket HTTP hit on the path.
  return new Response(JSON.stringify({ ok: true, service: "realtime" }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: NextRequest) {
  return (await boot(req)) ?? new Response("ok");
}

export async function POST(req: NextRequest) {
  return (await boot(req)) ?? new Response("ok");
}
