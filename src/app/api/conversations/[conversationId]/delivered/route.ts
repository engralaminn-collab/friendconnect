import type { NextRequest } from "next/server";
import { z } from "zod";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { acknowledgeDelivery } from "@/server/services/messages.service";

export const runtime = "nodejs";

const schema = z.object({ upToMessageId: z.string().max(36).optional() }).optional();

export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ conversationId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { conversationId } = await ctx.params;
    const body = await req.json().catch(() => undefined);
    const parsed = schema.parse(body);
    const result = await acknowledgeDelivery(user.id, conversationId, parsed?.upToMessageId);
    return jsonOk(result);
  },
);
