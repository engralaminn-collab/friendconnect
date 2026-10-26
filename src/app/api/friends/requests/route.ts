import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const incoming = await db.friendship.findMany({
      where: { receiverId: me.id, status: 'PENDING' },
      include: { requester: { include: { profile: true } } },
    })
    const outgoing = await db.friendship.findMany({
      where: { requesterId: me.id, status: 'PENDING' },
      include: { receiver: { include: { profile: true } } },
    })
    return json({
      incoming: incoming.map((f) => ({
        id: f.requester.id,
        username: f.requester.username,
        name: f.requester.name,
        photoUrl: f.requester.profile?.photoUrl ?? null,
        createdAt: f.createdAt.toISOString(),
      })),
      outgoing: outgoing.map((f) => ({
        id: f.receiver.id,
        username: f.receiver.username,
        name: f.receiver.name,
        photoUrl: f.receiver.profile?.photoUrl ?? null,
        createdAt: f.createdAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
