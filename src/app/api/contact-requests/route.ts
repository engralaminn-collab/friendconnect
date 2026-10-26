import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import {
  contactRequestSchema,
  createContactRequest,
  listPendingRequests,
} from "@/server/services/contacts.service";
import { REALTIME_EVENTS, publishToUsers } from "@/server/realtime/publisher";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser();
  return jsonOk({ requests: await listPendingRequests(user.id) });
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const input = await parseJson(req, contactRequestSchema);
  const request = await createContactRequest(user.id, input.toUserId, input.message);
  publishToUsers([input.toUserId], REALTIME_EVENTS.notification, {
    kind: "contact_request",
    title: "New contact request",
    body: `${user.displayName} wants to connect`,
    data: { requestId: request.id },
  });
  return jsonOk({ request }, { status: 201 });
});
