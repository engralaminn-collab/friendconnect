import type { NextRequest } from "next/server";
import { route, jsonOk, unauthorized } from "@/server/http/errors";
import { rawPool } from "@/server/db/client";
import { env } from "@/server/config/env";
import { getStorage } from "@/server/storage/drivers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness: always returns ok when the process is serving. */
export const GET = route(async (req: NextRequest) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await rawPool().query("SELECT 1");
    checks.mysql = "ok";
  } catch {
    checks.mysql = "error";
    healthy = false;
  }

  checks.storage = getStorage().name;
  checks.realtime = env.WEBSOCKET_PATH;

  // Deep details are token-protected to avoid leaking infra information.
  const deep = req.nextUrl.searchParams.get("deep") === "true";
  if (deep) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!env.HEALTH_CHECK_TOKEN || token !== env.HEALTH_CHECK_TOKEN) {
      throw unauthorized("Invalid health token");
    }
  }

  return jsonOk(
    {
      status: healthy ? "ok" : "degraded",
      env: env.APP_ENV,
      time: new Date().toISOString(),
      checks: deep ? checks : { mysql: checks.mysql, storage: checks.storage },
    },
    { status: healthy ? 200 : 503 },
  );
});
