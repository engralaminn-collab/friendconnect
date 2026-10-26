import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { deleteContact } from "@/server/services/contacts.service";

export const runtime = "nodejs";

export const DELETE = route(async (req: NextRequest, ctx: { params: Promise<{ contactId: string }> }) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { contactId } = await ctx.params;
  await deleteContact(user.id, contactId);
  return jsonOk({ deleted: true });
});
