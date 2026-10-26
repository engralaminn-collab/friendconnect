import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { importLegacyWorkspace, importPayloadSchema } from "@/server/services/migrate.service";
import { recordAudit } from "@/server/auth/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Imports an exported `friendconnect-workspace-v1` localStorage payload.
 * Idempotent: repeated imports report `skipped` unless `force: true` is sent.
 */
export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const payload = await parseJson(req, importPayloadSchema);
  const result = await importLegacyWorkspace(user.id, payload);
  await recordAudit({
    actorId: user.id,
    action: "workspace.import",
    resourceType: "user",
    resourceId: user.id,
  });
  return jsonOk(result);
});
