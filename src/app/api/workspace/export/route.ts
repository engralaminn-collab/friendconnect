import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { requireUser } from "@/server/auth/session";
import { exportAll } from "@/server/services/workspace.service";

export const runtime = "nodejs";

export const GET = route(async (_req: NextRequest) => {
  const user = await requireUser();
  return jsonOk({ exportedAt: new Date().toISOString(), collections: await exportAll(user.id) });
});
