import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST star a message
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const msg = await db.message.findUnique({ where: { id } })
    if (!msg) return errorJson('Message not found', 404)
    // must be participant
    const isParticipant = msg.senderId === me.id || msg.receiverId === me.id || (msg.groupId ? !!(await db.groupMember.findUnique({ where: { groupId_userId: { groupId: msg.groupId, userId: me.id } } })) : false)
    if (!isParticipant) return errorJson('Forbidden', 403)
    await db.messageStar.upsert({
      where: { messageId_userId: { messageId: id, userId: me.id } },
      update: {},
      create: { messageId: id, userId: me.id },
    })
    return json({ ok: true, starred: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// DELETE unstar a message
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    await db.messageStar.deleteMany({ where: { messageId: id, userId: me.id } })
    return json({ ok: true, starred: false })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
