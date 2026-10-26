import type { NextRequest } from "next/server";
import { z } from "zod";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { confirmPasswordReset } from "@/server/services/auth.service";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(200),
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const input = await parseJson(req, schema);
  await confirmPasswordReset(input.token, input.newPassword);
  return jsonOk({ reset: true });
});
