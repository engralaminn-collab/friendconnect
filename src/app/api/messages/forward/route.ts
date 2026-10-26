import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST /api/messages/forward  { messageId, targets: [{ receiverId? | groupId? }] }
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const messageId = String(body.messageId || '')
    const targets: Array<{ receiverId?: string; groupId?: string }> = Array.isArray(body.targets) ? body.targets : []
    if (!messageId || targets.length === 0) return errorJson('messageId and targets required', 400)

    const orig = await db.message.findUnique({ where: { id: messageId } })
    if (!orig) return errorJson('Original message not found', 404)
    // sender or receiver of the original may forward
    const canAccess = orig.senderId === me.id || orig.receiverId === me.id || (orig.groupId ? !!(await db.groupMember.findUnique({ where: { groupId_userId: { groupId: orig.groupId, userId: me.id } } })) : false)
    if (!canAccess) return errorJson('Cannot forward this message', 403)

    const created: string[] = []
    for (const t of targets) {
      if (t.receiverId) {
        // ensure not blocked
        const blocked = await db.friendship.findFirst({
          where: { status: 'BLOCKED', OR: [{ requesterId: me.id, receiverId: t.receiverId }, { requesterId: t.receiverId, receiverId: me.id }] },
        })
        if (blocked) continue
        const m = await db.message.create({
          data: {
            senderId: me.id,
            receiverId: t.receiverId,
            content: orig.content,
            type: orig.type,
            fileUrl: orig.fileUrl,
            fileName: orig.fileName,
            fileSize: orig.fileSize,
            mimeType: orig.mimeType,
            status: 'SENT',
            forwardedFrom: orig.senderId,
          },
        })
        created.push(m.id)
      } else if (t.groupId) {
        const membership = await db.groupMember.findUnique({ where: { groupId_userId: { groupId: t.groupId, userId: me.id } } })
        if (!membership) continue
        const m = await db.message.create({
          data: {
            senderId: me.id,
            groupId: t.groupId,
            content: orig.content,
            type: orig.type,
            fileUrl: orig.fileUrl,
            fileName: orig.fileName,
            fileSize: orig.fileSize,
            mimeType: orig.mimeType,
            status: 'SENT',
            forwardedFrom: orig.senderId,
          },
        })
        created.push(m.id)
      }
    }
    return json({ ok: true, forwarded: created.length, ids: created })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
