import type { NextRequest } from "next/server";
import { z } from "zod";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { respondContactRequest } from "@/server/services/contacts.service";

export const runtime = "nodejs";

const schema = z.object({ decision: z.enum(["accepted", "declined"]) });

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ requestId: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { requestId } = await ctx.params;
  const { decision } = await parseJson(req, schema);
  await respondContactRequest(user.id, requestId, decision);
  return jsonOk({ requestId, decision });
});
