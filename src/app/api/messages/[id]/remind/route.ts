import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST /api/messages/[id]/remind { remindAt } — set a reminder for a message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const body = await req.json()
    const remindAt = body.remindAt ? new Date(body.remindAt) : null
    if (!remindAt || remindAt.getTime() <= Date.now()) return errorJson('remindAt must be a future date', 400)
    // validate participation
    const msg = await db.message.findUnique({ where: { id } })
    if (!msg) return errorJson('Message not found', 404)
    const isParticipant = msg.senderId === me.id || msg.receiverId === me.id || (msg.groupId ? !!(await db.groupMember.findUnique({ where: { groupId_userId: { groupId: msg.groupId, userId: me.id } } })) : false)
    if (!isParticipant) return errorJson('Forbidden', 403)
    // delete existing reminder for this message by me, then create new
    await db.messageReminder.deleteMany({ where: { userId: me.id, messageId: id } })
    const reminder = await db.messageReminder.create({
      data: { userId: me.id, messageId: id, remindAt },
    })
    return json({ reminder: { id: reminder.id, remindAt: reminder.remindAt.toISOString() } })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// DELETE cancel a reminder
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    await db.messageReminder.deleteMany({ where: { userId: me.id, messageId: id } })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
