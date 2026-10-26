import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { deleteMessage, editMessage, editMessageSchema } from "@/server/services/messages.service";

export const runtime = "nodejs";

export const PATCH = route(async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { messageId } = await ctx.params;
  const { body } = await parseJson(req, editMessageSchema);
  const message = await editMessage(user.id, messageId, body);
  return jsonOk({ message });
});

export const DELETE = route(
  async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { messageId } = await ctx.params;
    await deleteMessage(user.id, messageId);
    return jsonOk({ deleted: true, messageId });
  },
);
