import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { getCurrentUser } from "@/server/auth/session";
import { publicUser } from "@/server/services/auth.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: NextRequest) => {
  const current = await getCurrentUser();
  if (!current) return jsonOk({ user: null });
  const user = await publicUser(current.id);
  return jsonOk({ user });
});
