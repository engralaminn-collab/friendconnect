import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { markConversationRead } from "@/server/services/conversations.service";
import { REALTIME_EVENTS, publishToConversation } from "@/server/realtime/publisher";

export const runtime = "nodejs";

export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ conversationId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { conversationId } = await ctx.params;
    const messageIds = await markConversationRead(user.id, conversationId);
    publishToConversation(conversationId, REALTIME_EVENTS.messageReceipt, {
      conversationId,
      userId: user.id,
      state: "read",
      messageIds,
    });
    return jsonOk({ read: true, messageIds });
  },
);
