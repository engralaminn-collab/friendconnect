import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const blocked = await db.friendship.findMany({
      where: { blockerId: me.id, status: 'BLOCKED' },
      include: { receiver: { include: { profile: true } } },
    })
    return json({
      blocked: blocked.map((f) => ({
        id: f.receiver.id,
        username: f.receiver.username,
        name: f.receiver.name,
        photoUrl: f.receiver.profile?.photoUrl ?? null,
        blockedAt: f.updatedAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
