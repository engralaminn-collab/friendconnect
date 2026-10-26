import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { requireUser } from "@/server/auth/session";
import { getCall } from "@/server/services/calls.service";

export const runtime = "nodejs";

export const GET = route(
  async (_req: NextRequest, ctx: { params: Promise<{ callId: string }> }) => {
    const user = await requireUser();
    const { callId } = await ctx.params;
    return jsonOk({ call: await getCall(user.id, callId) });
  },
);
