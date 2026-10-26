import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import {
  createConversation,
  createConversationSchema,
  listConversations,
} from "@/server/services/conversations.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const conversations = await listConversations(user.id);
  return jsonOk({ conversations });
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const input = await parseJson(req, createConversationSchema);
  const conversation = await createConversation(user.id, input);
  return jsonOk({ conversation }, { status: 201 });
});
