import { db } from '@/lib/db'

export interface PublicUser {
  id: string
  username: string
  name: string
  photoUrl: string | null
  bio: string | null
  location: string | null
  online: boolean
  lastSeen: string | null
}

export async function serializeUser(userId: string, viewerId?: string): Promise<PublicUser | null> {
  const u = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  })
  if (!u) return null
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    photoUrl: u.profile?.photoUrl ?? null,
    bio: u.profile?.bio ?? null,
    location: u.profile?.location ?? null,
    online: false, // presence handled via ws; default false
    lastSeen: u.profile?.lastSeen ? u.profile.lastSeen.toISOString() : null,
  }
}

export async function ensureProfile(userId: string) {
  const existing = await db.profile.findUnique({ where: { userId } })
  if (existing) return existing
  return db.profile.create({ data: { userId } })
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function errorJson(message: string, status = 400) {
  return json({ error: message }, status)
}
