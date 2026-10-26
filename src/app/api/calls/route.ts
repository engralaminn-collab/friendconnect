import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import { createCall, createCallSchema } from "@/server/services/calls.service";

export const runtime = "nodejs";

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const input = await parseJson(req, createCallSchema);
  const detail = await createCall(user.id, input);
  return jsonOk({ call: detail }, { status: 201 });
});
