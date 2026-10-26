import type { NextRequest } from "next/server";
import { route, jsonOk, badRequest } from "@/server/http/errors";
import { assertSameOrigin } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { avatarSchema, updateAvatar } from "@/server/services/profile.service";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("JSON body required");
  }
  const { mediaId } = avatarSchema.parse(body);
  const profile = await updateAvatar(user.id, mediaId);
  return jsonOk({ profile });
});
