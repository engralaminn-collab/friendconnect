import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST /api/messages/[id]/pin  { pinned: true|false } — pin/unpin a message within a 1:1 chat (per-user)
export async function POST(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { messageId: id } = await params
    const body = await req.json()
    const pinned = !!body.pinned
    const msg = await db.message.findUnique({ where: { id } })
    if (!msg) return errorJson('Message not found', 404)
    // must be a participant of the conversation
    const isParticipant = msg.senderId === me.id || msg.receiverId === me.id
    if (!isParticipant) return errorJson('Forbidden', 403)

    if (pinned) {
      // unpin any previously pinned message by me in the same 1:1 conversation, then pin this one
      if (msg.receiverId) {
        const peerId = msg.senderId === me.id ? msg.receiverId : msg.senderId
        await db.message.updateMany({
          where: { pinnedBy: me.id, OR: [{ senderId: me.id, receiverId: peerId }, { senderId: peerId, receiverId: me.id }] },
          data: { pinnedBy: null },
        })
      }
      await db.message.update({ where: { id }, data: { pinnedBy: me.id } })
    } else {
      // only unpin if I pinned it
      if (msg.pinnedBy === me.id) {
        await db.message.update({ where: { id }, data: { pinnedBy: null } })
      }
    }
    return json({ ok: true, pinned })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
