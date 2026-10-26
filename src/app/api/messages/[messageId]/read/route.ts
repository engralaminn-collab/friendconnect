import type { NextRequest } from "next/server";
import { route, jsonOk, notFound } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { messages } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { markConversationRead } from "@/server/services/conversations.service";
import { REALTIME_EVENTS, publishToConversation } from "@/server/realtime/publisher";

export const runtime = "nodejs";

/** Mark the whole conversation of this message read through this message. */
export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { messageId } = await ctx.params;
    const rows = await getDb()
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);
    if (!rows.length) throw notFound("Message not found");
    const conversationId = rows[0].conversationId;
    const messageIds = await markConversationRead(user.id, conversationId);
    publishToConversation(conversationId, REALTIME_EVENTS.messageReceipt, {
      conversationId,
      userId: user.id,
      state: "read",
      messageIds,
    });
    return jsonOk({ read: true, conversationId });
  },
);
