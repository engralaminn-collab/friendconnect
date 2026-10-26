import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { parseQuery } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { searchUsers, validateUserSearch } from "@/server/services/profile.service";
import { z } from "zod";

export const runtime = "nodejs";

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser();
  const { q } = parseQuery(req, z.object({ q: z.string().min(2).max(120) }));
  validateUserSearch(q);
  const results = await searchUsers(user.id, q);
  return jsonOk({ results });
});
