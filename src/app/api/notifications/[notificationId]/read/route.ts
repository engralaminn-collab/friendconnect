import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { markNotificationRead } from "@/server/services/notifications.service";

export const runtime = "nodejs";

export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ notificationId: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { notificationId } = await ctx.params;
    await markNotificationRead(user.id, notificationId);
    return jsonOk({ read: true });
  },
);
