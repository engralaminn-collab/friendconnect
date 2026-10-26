import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { leaveCall } from "@/server/services/calls.service";

export const runtime = "nodejs";

export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ callId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { callId } = await ctx.params;
    return jsonOk({ call: await leaveCall(user.id, callId) });
  },
);
