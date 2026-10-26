import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import {
  getConversation,
  memberSettingsSchema,
  updateMemberSettings,
} from "@/server/services/conversations.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(
  async (_req: NextRequest, ctx: { params: Promise<{ conversationId: string }> }) => {
    const user = await requireUser();
    const { conversationId } = await ctx.params;
    return jsonOk({ conversation: await getConversation(user.id, conversationId) });
  },
);

export const PATCH = route(
  async (req: NextRequest, ctx: { params: Promise<{ conversationId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { conversationId } = await ctx.params;
    const patch = await parseJson(req, memberSettingsSchema);
    const conversation = await updateMemberSettings(user.id, conversationId, patch);
    return jsonOk({ conversation });
  },
);
