import type { NextRequest } from "next/server";
import { route, jsonOk } from "@/server/http/errors";
import { assertSameOrigin, parseJson } from "@/server/http/guard";
import { requireUser } from "@/server/auth/session";
import {
  createContact,
  createContactSchema,
  listContacts,
} from "@/server/services/contacts.service";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser();
  const contacts = await listContacts(user.id);
  return jsonOk({ contacts });
});

export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const input = await parseJson(req, createContactSchema);
  const contact = await createContact(user.id, input);
  return jsonOk({ contact }, { status: 201 });
});
