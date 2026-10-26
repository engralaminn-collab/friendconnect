import type { NextRequest } from "next/server";
import { z } from "zod";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { verifyEmailToken } from "@/server/services/auth.service";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(10) });

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const { token } = await parseJson(req, schema);
  await verifyEmailToken(token);
  return jsonOk({ verified: true });
});
