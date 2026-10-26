import type { NextRequest } from "next/server";
import { z } from "zod";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, clientIp, parseJson } from "@/server/http/guard";
import { consume, rateBuckets } from "@/server/auth/ratelimit";
import { requestPasswordReset } from "@/server/services/auth.service";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email() });

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await consume("auth", clientIp(req) ?? "unknown", rateBuckets.auth());
  const { email } = await parseJson(req, schema);
  const result = await requestPasswordReset(email);
  // Same response whether or not the account exists (no enumeration).
  return jsonOk({ requested: true, devToken: result.devToken });
});
