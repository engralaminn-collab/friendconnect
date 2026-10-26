import { and, eq, ne, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { contacts, contactRequests, users } from "../db/schema";
import { newId } from "../auth/tokens";
import { conflict, forbidden, notFound } from "../http/errors";

export const createContactSchema = z
  .object({
    contactUserId: z.string().max(36).optional(),
    displayName: z.string().min(1).max(120).optional(),
    email: z.string().email().max(254).optional(),
    phone: z.string().max(32).optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
    note: z.string().max(2000).optional(),
  })
  .refine((v) => v.contactUserId || v.displayName || v.email, {
    message: "Provide a platform user, or a name/email for an external contact.",
  });
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const contactRequestSchema = z.object({
  toUserId: z.string().min(1).max(36),
  message: z.string().max(500).optional(),
});

export async function listContacts(ownerId: string) {
  const db = getDb();
  const rows = await db
    .select({
      contact: contacts,
      user: {
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        handle: users.handle,
        status: users.status,
      },
    })
    .from(contacts)
    .leftJoin(users, eq(users.id, contacts.contactUserId))
    .where(eq(contacts.ownerId, ownerId))
    .orderBy(contacts.createdAt);
  return rows;
}

export async function createContact(ownerId: string, input: CreateContactInput) {
  const db = getDb();
  let contactUserId: string | null = null;
  let displayName = input.displayName?.trim() ?? "";

  if (input.contactUserId) {
    if (input.contactUserId === ownerId) throw conflict("You cannot add yourself as a contact.");
    const target = await db
      .select({ id: users.id, displayName: users.displayName, status: users.status })
      .from(users)
      .where(eq(users.id, input.contactUserId))
      .limit(1);
    if (!target.length || target[0].status !== "active") throw notFound("User not found");
    contactUserId = target[0].id;
    displayName = displayName || target[0].displayName;
    const duplicate = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.ownerId, ownerId), eq(contacts.contactUserId, contactUserId)))
      .limit(1);
    if (duplicate.length) throw conflict("Contact already exists.");
  } else if (input.email) {
    const email = input.email.toLowerCase();
    const duplicate = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.ownerId, ownerId), eq(contacts.email, email)))
      .limit(1);
    if (duplicate.length) throw conflict("A contact with that email already exists.");
    displayName = displayName || email;
  }
  if (!displayName) throw conflict("A display name is required for external contacts.");

  const id = newId("ct");
  await db.insert(contacts).values({
    id,
    ownerId,
    contactUserId,
    displayName,
    email: input.email?.toLowerCase() ?? null,
    phone: input.phone ?? null,
    tags: input.tags ?? [],
    note: input.note ?? null,
  });
  return db.select().from(contacts).where(eq(contacts.id, id)).limit(1).then((r) => r[0]);
}

export async function deleteContact(ownerId: string, contactId: string) {
  const db = getDb();
  const owned = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.ownerId, ownerId)))
    .limit(1);
  if (!owned.length) throw notFound("Contact not found");
  await db.delete(contacts).where(eq(contacts.id, contactId));
}

export async function createContactRequest(fromUserId: string, toUserId: string, message?: string) {
  if (fromUserId === toUserId) throw conflict("Cannot send a contact request to yourself.");
  const db = getDb();
  const target = await db.select({ id: users.id }).from(users).where(eq(users.id, toUserId)).limit(1);
  if (!target.length) throw notFound("User not found");
  const open = await db
    .select({ id: contactRequests.id })
    .from(contactRequests)
    .where(
      and(
        eq(contactRequests.fromUserId, fromUserId),
        eq(contactRequests.toUserId, toUserId),
        eq(contactRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (open.length) throw conflict("A pending request already exists.");
  const row = {
    id: newId("cr"),
    fromUserId,
    toUserId,
    message: message ?? null,
    status: "pending" as const,
  };
  await db.insert(contactRequests).values(row);
  return row;
}

export async function respondContactRequest(
  userId: string,
  requestId: string,
  decision: "accepted" | "declined",
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(contactRequests)
    .where(and(eq(contactRequests.id, requestId), eq(contactRequests.toUserId, userId)))
    .limit(1);
  const req = rows[0];
  if (!req) throw notFound("Contact request not found");
  if (req.status !== "pending") throw conflict("Request already handled.");
  await db
    .update(contactRequests)
    .set({ status: decision, respondedAt: new Date(), updatedAt: new Date() })
    .where(eq(contactRequests.id, requestId));
  if (decision === "accepted") {
    await db.transaction(async (tx) => {
      for (const [ownerId, contactUserId] of [
        [userId, req.fromUserId],
        [req.fromUserId, userId],
      ] as const) {
        const exists = await tx
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(
              eq(contacts.ownerId, ownerId),
              eq(contacts.contactUserId, contactUserId),
            ),
          )
          .limit(1);
        if (!exists.length) {
          const u = await tx
            .select({ displayName: users.displayName })
            .from(users)
            .where(eq(users.id, contactUserId))
            .limit(1);
          await tx.insert(contacts).values({
            id: newId("ct"),
            ownerId,
            contactUserId,
            displayName: u[0]?.displayName ?? "User",
            tags: [],
          });
        }
      }
    });
  }
}

export async function listPendingRequests(userId: string) {
  return getDb()
    .select({
      request: contactRequests,
      from: {
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        handle: users.handle,
      },
    })
    .from(contactRequests)
    .innerJoin(users, eq(users.id, contactRequests.fromUserId))
    .where(
      and(
        eq(contactRequests.toUserId, userId),
        eq(contactRequests.status, "pending"),
        ne(users.status, "deleted"),
      ),
    );
}

export { or, forbidden };
