import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { reactionSchema, react, unreact } from "@/server/services/messages.service";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { messageId } = await ctx.params;
  const { emoji } = await parseJson(req, reactionSchema);
  const reactions = await react(user.id, messageId, emoji);
  return jsonOk({ reactions });
});

export const DELETE = route(
  async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { messageId } = await ctx.params;
    const { emoji } = await parseJson(req, reactionSchema);
    const reactions = await unreact(user.id, messageId, emoji);
    return jsonOk({ reactions });
  },
);
