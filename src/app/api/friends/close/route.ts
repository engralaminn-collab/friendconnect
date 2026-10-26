import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET my close friends
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const friendships = await db.friendship.findMany({
      where: { status: 'ACCEPTED', isCloseFriend: true, OR: [{ requesterId: me.id }, { receiverId: me.id }] },
      include: {
        requester: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    })
    const closeFriends = friendships.map((f) => {
      const other = f.requesterId === me.id ? f.receiver : f.requester
      return {
        id: other.id,
        username: other.username,
        name: other.name,
        photoUrl: other.profile?.photoUrl ?? null,
      }
    })
    return json({ closeFriends })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// POST toggle close-friend status or mute-stories status
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const targetId = String(body.targetId || '')
    const action = String(body.action || '') // 'closeFriend' | 'muteStories'
    const value = !!body.value
    if (!targetId) return errorJson('targetId required', 400)

    const friendship = await db.friendship.findFirst({
      where: { status: 'ACCEPTED', OR: [{ requesterId: me.id, receiverId: targetId }, { requesterId: targetId, receiverId: me.id }] },
    })
    if (!friendship) return errorJson('Not friends', 404)

    const updateData: any = {}
    if (action === 'closeFriend') updateData.isCloseFriend = value
    else if (action === 'muteStories') updateData.storiesMuted = value
    else return errorJson('Invalid action', 400)

    await db.friendship.update({ where: { id: friendship.id }, data: updateData })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
