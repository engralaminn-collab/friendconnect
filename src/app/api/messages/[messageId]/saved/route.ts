import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { saveMessage, saveMessageSchema } from "@/server/services/messages.service";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { messageId } = await ctx.params;
  const input = await parseJson(req, saveMessageSchema);
  const savedId = await saveMessage(user.id, messageId, input.note, input.tag);
  return jsonOk({ savedId }, { status: 201 });
});
