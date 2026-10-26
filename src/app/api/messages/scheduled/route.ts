import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET my scheduled messages
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const scheduled = await db.message.findMany({
      where: { senderId: me.id, scheduledFor: { gt: new Date() } },
      orderBy: { scheduledFor: 'asc' },
      include: {
        receiver: { select: { id: true, name: true, username: true } },
        group: { select: { id: true, name: true } },
      },
    })
    return json({
      scheduled: scheduled.map((m) => ({
        id: m.id,
        content: m.content,
        type: m.type,
        scheduledFor: m.scheduledFor!.toISOString(),
        receiverId: m.receiverId,
        receiverName: m.receiver?.name ?? null,
        groupId: m.groupId,
        groupName: m.group?.name ?? null,
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// POST create a scheduled message (does NOT send now — stored with scheduledFor in the future)
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const content = String(body.content || '').trim().slice(0, 5000)
    const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null
    const receiverId = body.receiverId ? String(body.receiverId) : null
    const groupId = body.groupId ? String(body.groupId) : null
    if (!content) return errorJson('content required', 400)
    if (!scheduledFor || scheduledFor.getTime() <= Date.now()) return errorJson('scheduledFor must be a future date', 400)
    if (!receiverId && !groupId) return errorJson('receiverId or groupId required', 400)

    const msg = await db.message.create({
      data: {
        senderId: me.id,
        receiverId: receiverId,
        groupId: groupId,
        content,
        type: 'text',
        status: 'SENT',
        scheduledFor,
      },
    })
    return json({ message: { id: msg.id, scheduledFor: msg.scheduledFor!.toISOString() } })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// DELETE cancel a scheduled message
export async function DELETE(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return errorJson('id required', 400)
    const msg = await db.message.findUnique({ where: { id } })
    if (!msg || msg.senderId !== me.id) return errorJson('Not found', 404)
    if (!msg.scheduledFor) return errorJson('Not a scheduled message', 400)
    await db.message.delete({ where: { id } })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
