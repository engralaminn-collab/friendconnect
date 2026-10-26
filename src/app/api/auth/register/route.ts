import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, clientIp, parseJson, userAgent } from "@/server/http/guard";
import { consume, rateBuckets } from "@/server/auth/ratelimit";
import { register, registerSchema } from "@/server/services/auth.service";
import { setSessionCookie } from "@/server/auth/cookies";
import { env } from "@/server/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const ip = clientIp(req) ?? "unknown";
  await consume("auth", ip, rateBuckets.auth());
  const input = await parseJson(req, registerSchema);
  const { session, verifyToken, userId } = await register(input, {
    ip,
    userAgent: userAgent(req),
  });
  const ttl = env.SESSION_TTL_DAYS * 86_400;
  const res = jsonOk({
    userId,
    emailVerificationRequested: true,
    // Only exposed when no SMTP provider is configured (development/testing).
    devVerifyToken: env.SMTP_URL ? undefined : verifyToken ?? undefined,
  });
  setSessionCookie(res, session.rawToken, ttl);
  return res;
});
