import type { NextRequest } from "next/server";
import { z } from "zod";
import { route, jsonOk, badRequest } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import {
  bulkUpsert,
  bulkUpsertSchema,
  deleteRecord,
  listCollection,
  upsertRecord,
  upsertRecordSchema,
} from "@/server/services/workspace.service";

export const runtime = "nodejs";

const singleOrBulk = z.union([upsertRecordSchema, bulkUpsertSchema]);

export const GET = route(
  async (_req: NextRequest, ctx: { params: Promise<{ collection: string }> }) => {
    const user = await requireUser();
    const { collection } = await ctx.params;
    const records = await listCollection(user.id, collection);
    return jsonOk({ records });
  },
);

export const POST = route(
  async (req: NextRequest, ctx: { params: Promise<{ collection: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { collection } = await ctx.params;
    const body = await parseJson(req, singleOrBulk);
    if ("records" in body) {
      const result = await bulkUpsert(user.id, collection, body.records as {
        recordId: string;
        data: Record<string, unknown>;
      }[]);
      return jsonOk(result);
    }
    const result = await upsertRecord(user.id, collection, body.recordId, body.data);
    return jsonOk(result, { status: 201 });
  },
);

export const DELETE = route(
  async (req: NextRequest, ctx: { params: Promise<{ collection: string }> }) => {
    assertSameOrigin(req);
    const user = await requireUser();
    const { collection } = await ctx.params;
    const recordId = req.nextUrl.searchParams.get("recordId");
    if (!recordId) throw badRequest("recordId query parameter required");
    await deleteRecord(user.id, collection, recordId);
    return jsonOk({ deleted: true });
  },
);
