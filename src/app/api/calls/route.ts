import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const calls = await db.call.findMany({
      where: { OR: [{ callerId: me.id }, { receiverId: me.id }] },
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: { caller: { include: { profile: true } }, receiver: { include: { profile: true } } },
    })
    return json({
      calls: calls.map((c) => ({
        id: c.id,
        type: c.type,
        status: c.status,
        direction: c.callerId === me.id ? 'outgoing' : 'incoming',
        peerId: c.callerId === me.id ? c.receiverId : c.callerId,
        peerName: (c.callerId === me.id ? c.receiver?.name : c.caller?.name) || 'User',
        peerPhoto: c.callerId === me.id ? c.receiver?.profile?.photoUrl ?? null : c.caller?.profile?.photoUrl ?? null,
        startedAt: c.startedAt.toISOString(),
        endedAt: c.endedAt?.toISOString() ?? null,
        duration: c.duration ?? null,
      })),
    })
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
    if (action === 'start') {
      const receiverId = String(body.receiverId || '')
      const type = body.type === 'video' ? 'video' : 'audio'
      if (!receiverId) return errorJson('receiverId required', 400)
      const call = await db.call.create({
        data: { callerId: me.id, receiverId, type, status: 'ringing' },
      })
      await db.notification.create({
        data: {
          userId: receiverId,
          type: 'call',
          title: `Incoming ${type} call`,
          body: `${me.name} is calling you`,
          data: JSON.stringify({ callId: call.id, from: me.id, name: me.name, type }),
        },
      })
      return json({ call: { id: call.id } })
    }
    if (action === 'end') {
      const callId = String(body.callId || '')
      const status = String(body.status || 'ended')
      const duration = body.duration ? Number(body.duration) : null
      const call = await db.call.findUnique({ where: { id: callId } })
      if (!call) return errorJson('Call not found', 404)
      await db.call.update({
        where: { id: callId },
        data: { status, endedAt: new Date(), duration: duration ?? undefined },
      })
      return json({ ok: true })
    }
    return errorJson('Unknown action', 400)
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
