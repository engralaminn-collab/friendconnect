import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { requireUser } from "@/server/auth/session";
import { iceConfig } from "@/server/services/calls.service";

export const runtime = "nodejs";

/** ICE servers for authenticated clients. Never returns storage credentials. */
export const GET = route(async (_req: NextRequest) => {
  await requireUser();
  return jsonOk(iceConfig());
});
