import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { pollVoteSchema, votePoll } from "@/server/services/messages.service";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { messageId } = await ctx.params;
  const { optionId } = await parseJson(req, pollVoteSchema);
  const poll = await votePoll(user.id, messageId, optionId);
  return jsonOk({ poll });
});
