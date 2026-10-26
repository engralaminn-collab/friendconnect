import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { pinMessage, unpinMessage } from "@/server/services/messages.service";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { messageId } = await ctx.params;
  await pinMessage(user.id, messageId);
  return jsonOk({ pinned: true });
});

export const DELETE = route(
  async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { messageId } = await ctx.params;
    await unpinMessage(user.id, messageId);
    return jsonOk({ pinned: false });
  },
);
