import type { NextRequest } from "next/server";
import { route, jsonOk, badRequest } from "@/server/http/errors";
import { assertSameOrigin, clientIp, userAgent } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { consume, rateBuckets } from "@/server/auth/ratelimit";
import { storeUploadedMedia } from "@/server/services/media.service";
import { recordAudit } from "@/server/auth/audit";
import type { MediaKind } from "@/server/storage/magic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await consume("upload", user.id, rateBuckets.upload());

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("Expected multipart/form-data upload");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Missing 'file' field");
  const expectedKind = (form.get("kind") as string | null) as MediaKind | null;
  const durationSecRaw = form.get("durationSec");
  const durationSec = durationSecRaw ? Number(durationSecRaw) : undefined;

  const bytes = Buffer.from(await file.arrayBuffer());
  const mediaRow = await storeUploadedMedia(user.id, {
    filename: file.name || "upload",
    declaredMime: file.type || "application/octet-stream",
    bytes,
    expectedKind: expectedKind ?? undefined,
    durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
  });
  await recordAudit({
    actorId: user.id,
    action: "media.upload",
    resourceType: "media",
    resourceId: mediaRow.id,
    ip: clientIp(req),
    userAgent: userAgent(req),
    metadata: { size: mediaRow.sizeBytes.toString(), mime: mediaRow.mime, kind: mediaRow.kind },
  });

  return jsonOk(
    {
      media: {
        id: mediaRow.id,
        mime: mediaRow.mime,
        kind: mediaRow.kind,
        filename: mediaRow.filename,
        sizeBytes: mediaRow.sizeBytes.toString(),
        url: `/api/media/${mediaRow.id}`,
        durationSec: mediaRow.durationSec,
      },
    },
    { status: 201 },
  );
});
