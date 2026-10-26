import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { reportMessage, reportSchema } from "@/server/services/messages.service";
import { recordAudit } from "@/server/auth/audit";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ messageId: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { messageId } = await ctx.params;
  const input = await parseJson(req, reportSchema);
  const reportId = await reportMessage(user.id, messageId, input.reason, input.detail);
  await recordAudit({
    actorId: user.id,
    action: "message.report",
    resourceType: "message",
    resourceId: messageId,
  });
  return jsonOk({ reportId, status: "received" }, { status: 201 });
});
