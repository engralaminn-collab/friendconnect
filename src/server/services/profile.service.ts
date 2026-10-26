import { and, eq, ne, or } from "drizzle-orm";
import { isSearchLookupAllowed, MAX_SEARCH_RESULTS } from "../privacy/visibility";
import { z } from "zod";
import { getDb } from "../db/client";
import { users, profiles, media } from "../db/schema";
import { conflict, notFound } from "../http/errors";
import { publicUser } from "./auth.service";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  handle: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.-]+$/)
    .optional(),
  bio: z.string().max(2000).optional(),
  phone: z.string().max(32).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(64).optional(),
  headline: z.string().max(200).optional(),
  website: z.string().url().max(500).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const avatarSchema = z.object({ mediaId: z.string().min(1).max(36) });

export async function updateProfile(userId: string, patch: UpdateProfileInput) {
  const db = getDb();
  if (patch.handle) {
    const taken = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.handle, patch.handle))
      .limit(1);
    if (taken.length && taken[0].id !== userId) throw conflict("That handle is already taken.");
  }
  const userFields: Partial<typeof users.$inferInsert> = {};
  if (patch.displayName !== undefined) userFields.displayName = patch.displayName;
  if (patch.handle !== undefined) userFields.handle = patch.handle;
  if (Object.keys(userFields).length) {
    userFields.updatedAt = new Date();
    await db.update(users).set(userFields).where(eq(users.id, userId));
  }

  const profileFields: Partial<typeof profiles.$inferInsert> = {};
  for (const key of ["bio", "phone", "city", "country", "locale", "timezone", "headline", "website"] as const) {
    if (patch[key] !== undefined) (profileFields as Record<string, unknown>)[key] = patch[key];
  }
  if (Object.keys(profileFields).length) {
    profileFields.updatedAt = new Date();
    await db
      .insert(profiles)
      .values({ userId, ...profileFields })
      .onDuplicateKeyUpdate({ set: profileFields });
  }
  return publicUser(userId);
}

export async function updateAvatar(userId: string, mediaId: string) {
  const db = getDb();
  const owned = await db
    .select({ id: media.id, kind: media.kind })
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);
  if (!owned.length || owned[0].kind !== "image") throw notFound("Image media not found");
  if ((owned[0] as { id: string }).id && owned[0].kind) {
    const row = await db.select({ ownerId: media.ownerId }).from(media).where(eq(media.id, mediaId)).limit(1);
    if (row[0].ownerId !== userId) {
      throw conflict("You can only use media you uploaded as your avatar.");
    }
  }
  await db
    .insert(profiles)
    .values({ userId, avatarMediaId: mediaId, updatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { avatarMediaId: mediaId, updatedAt: new Date() } });
  return publicUser(userId);
}

const userSearchSchema = z.object({
  q: z.string().min(2).max(120),
});

export function validateUserSearch(q: unknown) {
  return userSearchSchema.parse({ q });
}

/**
 * Deliberately limited search: an exact email address or an exact handle, and
 * nothing else. Prefix/name matching is not offered — FriendConnect members are
 * invisible until a connection request is accepted, so search must not be
 * usable to enumerate the community. See src/server/privacy/visibility.ts.
 */
export async function searchUsers(requesterId: string, q: string) {
  const term = q.trim().toLowerCase();
  if (!isSearchLookupAllowed(term)) return [];
  const db = getDb();
  // Filtering happens in SQL (not after a 50-row fetch) so matches are never
  // silently missed once the platform has more users than the preview limit.
  return db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      handle: users.handle,
    })
    .from(users)
    .where(
      and(
        eq(users.status, "active"),
        ne(users.id, requesterId),
        or(eq(users.email, term), eq(users.handle, term)),
      ),
    )
    .limit(MAX_SEARCH_RESULTS);
}
