import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const q = req.nextUrl.searchParams.get('q') || ''
    const where = q
      ? {
          OR: [
            { username: { contains: q.toLowerCase() } },
            { name: { contains: q } },
            { email: { contains: q.toLowerCase() } },
          ],
          NOT: { id: me.id },
        }
      : { NOT: { id: me.id } }
    const users = await db.user.findMany({
      where,
      take: 30,
      include: { profile: true },
    })
    // friendship status with me
    const friendships = await db.friendship.findMany({
      where: { OR: [{ requesterId: me.id }, { receiverId: me.id }] },
    })
    const fsMap = new Map<string, string>()
    for (const f of friendships) {
      const other = f.requesterId === me.id ? f.receiverId : f.requesterId
      fsMap.set(other, f.status + (f.blockerId ? (f.blockerId === me.id ? ':me' : ':them') : ''))
    }
    return json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        photoUrl: u.profile?.photoUrl ?? null,
        bio: u.profile?.bio ?? null,
        location: u.profile?.location ?? null,
        relation: fsMap.get(u.id) || 'NONE',
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
