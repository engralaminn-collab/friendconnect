import type { NextRequest } from "next/server";
import { z } from "zod";
import { route, jsonOk } from "@/server/http/errors";
import { parseQuery } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { listNotifications, markAllNotificationsRead } from "@/server/services/notifications.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser();
  const { unreadOnly, limit } = parseQuery(req, querySchema);
  const notifications = await listNotifications(user.id, Boolean(unreadOnly), limit);
  return jsonOk({ notifications });
});

export const POST = route(async () => {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  return jsonOk({ allRead: true });
});
