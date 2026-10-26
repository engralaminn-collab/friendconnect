import type { NextRequest } from "next/server";
import { route, jsonOk, notFound } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { deleteSavedMessage, listSavedMessages } from "@/server/services/messages.service";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser();
  return jsonOk({ saved: await listSavedMessages(user.id) });
});

export const DELETE = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) throw notFound("Saved message id required");
  await deleteSavedMessage(user.id, id);
  return jsonOk({ deleted: true });
});
