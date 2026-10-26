import type { NextRequest } from "next/server";
import { z } from "zod";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson, parseQuery } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import {
  listMessages,
  sendMessage,
  sendMessageSchema,
} from "@/server/services/messages.service";
import { consume, rateBuckets } from "@/server/auth/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

export const GET = route(
  async (req: NextRequest, ctx: { params: Promise<{ conversationId: string }> }) => {
    const user = await requireUser();
    const { conversationId } = await ctx.params;
    const { limit, cursor } = parseQuery(req, pageSchema);
    const page = await listMessages(user.id, conversationId, { limit, cursor });
    return jsonOk(page);
  },
);

export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ conversationId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { conversationId } = await ctx.params;
    await consume("api", user.id, rateBuckets.api());
    const input = await parseJson(req, sendMessageSchema);
    const message = await sendMessage(user.id, conversationId, input);
    return jsonOk({ message }, { status: 201 });
  },
);
