import type { NextRequest } from "next/server";
import { route } from "@/server/http/errors";
import { requireUser } from "@/server/auth/session";
import { getAuthorizedMedia } from "@/server/services/media.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorized media download.
 * - S3 driver: redirect (307) to a short-lived presigned URL.
 * - Local driver: stream the private bytes with safe headers; the files live
 *   outside the web root and are never served statically.
 */
export const GET = route(
  async (_req: NextRequest, ctx: { params: Promise<{ mediaId: string }> }) => {
    const user = await requireUser();
    const { mediaId } = await ctx.params;
    const { row, bytes, presignedUrl } = await getAuthorizedMedia(user.id, mediaId);
    if (presignedUrl) {
      return new Response(null, { status: 307, headers: { Location: presignedUrl } });
    }
    if (!bytes) return new Response("Unavailable", { status: 502 });
    const isInline = row.kind === "image" || row.kind === "video" || row.kind === "audio" || row.kind === "voice";
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": row.mime,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(row.filename)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);
