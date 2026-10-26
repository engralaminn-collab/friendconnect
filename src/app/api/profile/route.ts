import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { updateProfile, updateProfileSchema } from "@/server/services/profile.service";
import { publicUser } from "@/server/services/auth.service";
import { recordAudit } from "@/server/auth/audit";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser();
  return jsonOk({ profile: await publicUser(user.id) });
});

export const PATCH = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const patch = await parseJson(req, updateProfileSchema);
  const updated = await updateProfile(user.id, patch);
  await recordAudit({ actorId: user.id, action: "profile.update", resourceType: "user", resourceId: user.id });
  return jsonOk({ profile: updated });
});
