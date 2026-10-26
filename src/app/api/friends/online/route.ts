import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET my friends who are currently considered "online" (recent lastSeen)
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const friendships = await db.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: me.id }, { receiverId: me.id }] },
      include: {
        requester: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    })
    const now = Date.now()
    const onlineThreshold = 2 * 60 * 1000 // 2 min since lastSeen = online
    const online: Array<{
      id: string
      username: string
      name: string
      photoUrl: string | null
      lastSeen: string | null
    }> = []
    for (const f of friendships) {
      const other = f.requesterId === me.id ? f.receiver : f.requester
      const lastSeen = other.profile?.lastSeen ? other.profile.lastSeen.getTime() : 0
      const isOnline = now - lastSeen < onlineThreshold
      if (isOnline) {
        online.push({
          id: other.id,
          username: other.username,
          name: other.name,
          photoUrl: other.profile?.photoUrl ?? null,
          lastSeen: other.profile?.lastSeen?.toISOString() ?? null,
        })
      }
    }
    return json({ online })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
