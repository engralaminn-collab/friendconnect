import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST /api/messages/[id]/edit  { content } — sender only, within 15 min of creation
export async function POST(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { messageId: id } = await params
    const body = await req.json()
    const content = String(body.content || '').trim().slice(0, 5000)
    if (!content) return errorJson('Content cannot be empty', 400)

    const msg = await db.message.findUnique({ where: { id } })
    if (!msg) return errorJson('Message not found', 404)
    if (msg.senderId !== me.id) return errorJson('Only sender can edit', 403)
    if (msg.deletedFor === 'everyone') return errorJson('Cannot edit deleted message', 400)
    // 15-minute edit window
    const ageMin = (Date.now() - msg.createdAt.getTime()) / 60000
    if (ageMin > 15) return errorJson('Edit window expired (15 min)', 400)

    const updated = await db.message.update({
      where: { id },
      data: { content, edited: true, editedAt: new Date() },
    })
    return json({
      message: {
        id: updated.id,
        content: updated.content,
        edited: updated.edited,
        editedAt: updated.editedAt?.toISOString() ?? null,
      },
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
