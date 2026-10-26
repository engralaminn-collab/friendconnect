import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, clientIp, parseJson, userAgent } from "@/server/http/guard";
import { consume, rateBuckets } from "@/server/auth/ratelimit";
import { login, loginSchema } from "@/server/services/auth.service";
import { setSessionCookie } from "@/server/auth/cookies";
import { env } from "@/server/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ip = clientIp(req) ?? "unknown";
  await consume("auth", ip, rateBuckets.auth());
  const input = await parseJson(req, loginSchema);
  const { session, user } = await login(input, { ip, userAgent: userAgent(req) });
  const res = jsonOk({ user });
  setSessionCookie(res, session.rawToken, env.SESSION_TTL_DAYS * 86_400);
  return res;
});
