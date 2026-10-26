import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const friendships = await db.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: me.id }, { receiverId: me.id }],
      },
      include: { requester: { include: { profile: true } }, receiver: { include: { profile: true } } },
    })
    const friends = friendships.map((f) => {
      const other = f.requesterId === me.id ? f.receiver : f.requester
      return {
        id: other.id,
        username: other.username,
        name: other.name,
        photoUrl: other.profile?.photoUrl ?? null,
        bio: other.profile?.bio ?? null,
        location: other.profile?.location ?? null,
        since: f.updatedAt.toISOString(),
        lastSeen: other.profile?.lastSeen?.toISOString() ?? null,
      }
    })
    return json({ friends })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const action = String(body.action || '')
    const targetId = String(body.targetId || '')
    if (!targetId || targetId === me.id) return errorJson('Invalid target', 400)

    const target = await db.user.findUnique({ where: { id: targetId } })
    if (!target) return errorJson('User not found', 404)

    // order ids so requester<receiver not enforced (we track direction)
    const existing = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: me.id, receiverId: targetId },
          { requesterId: targetId, receiverId: me.id },
        ],
      },
    })

    if (action === 'request') {
      if (existing) {
        if (existing.status === 'ACCEPTED') return errorJson('Already friends', 400)
        if (existing.status === 'BLOCKED') return errorJson('Cannot send request', 400)
        if (existing.status === 'PENDING') return errorJson('Request already pending', 400)
        if (existing.status === 'DECLINED') {
          // re-create as pending from me
          await db.friendship.update({
            where: { id: existing.id },
            data: { requesterId: me.id, receiverId: targetId, status: 'PENDING', updatedAt: new Date() },
          })
        }
      } else {
        await db.friendship.create({
          data: { requesterId: me.id, receiverId: targetId, status: 'PENDING' },
        })
      }
      await db.notification.create({
        data: {
          userId: targetId,
          type: 'friend_request',
          title: 'New friend request',
          body: `${me.name} sent you a friend request`,
          data: JSON.stringify({ from: me.id, name: me.name }),
        },
      })
      return json({ ok: true })
    }

    if (!existing) return errorJson('No relationship found', 404)

    if (action === 'accept') {
      if (existing.receiverId !== me.id) return errorJson('Not your request to accept', 400)
      await db.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED', updatedAt: new Date() } })
      await db.notification.create({
        data: {
          userId: existing.requesterId,
          type: 'friend_request',
          title: 'Friend request accepted',
          body: `${me.name} accepted your friend request`,
          data: JSON.stringify({ from: me.id, name: me.name }),
        },
      })
      return json({ ok: true })
    }

    if (action === 'reject' || action === 'decline') {
      if (existing.status === 'PENDING' && existing.receiverId === me.id) {
        await db.friendship.update({ where: { id: existing.id }, data: { status: 'DECLINED', updatedAt: new Date() } })
      } else if (existing.status === 'PENDING' && existing.requesterId === me.id) {
        await db.friendship.delete({ where: { id: existing.id } })
      }
      return json({ ok: true })
    }

    if (action === 'remove') {
      if (existing.status === 'ACCEPTED') {
        await db.friendship.delete({ where: { id: existing.id } })
      }
      return json({ ok: true })
    }

    if (action === 'block') {
      await db.friendship.upsert({
        where: { requesterId_receiverId: { requesterId: me.id, receiverId: targetId } },
        update: { status: 'BLOCKED', blockerId: me.id, updatedAt: new Date() },
        create: { requesterId: me.id, receiverId: targetId, status: 'BLOCKED', blockerId: me.id },
      })
      // also remove reverse if any
      const rev = await db.friendship.findFirst({ where: { requesterId: targetId, receiverId: me.id } })
      if (rev && rev.status !== 'BLOCKED') await db.friendship.delete({ where: { id: rev.id } })
      return json({ ok: true })
    }

    if (action === 'unblock') {
      if (existing && existing.status === 'BLOCKED' && existing.blockerId === me.id) {
        await db.friendship.delete({ where: { id: existing.id } })
      }
      return json({ ok: true })
    }

    return errorJson('Unknown action', 400)
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
