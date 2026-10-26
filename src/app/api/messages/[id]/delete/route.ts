import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST /api/messages/[id]/delete  { scope: 'me' | 'everyone' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const body = await req.json()
    const scope = body.scope === 'everyone' ? 'everyone' : 'me'
    const msg = await db.message.findUnique({ where: { id } })
    if (!msg) return errorJson('Message not found', 404)

    if (scope === 'everyone') {
      // only sender can delete for everyone
      if (msg.senderId !== me.id) return errorJson('Only sender can delete for everyone', 403)
      await db.message.update({
        where: { id },
        data: { deletedFor: 'everyone', content: '', fileUrl: null, fileName: null, fileSize: null, mimeType: null },
      })
    } else {
      // delete for me: append my id to deletedFor (comma-separated)
      const existing = msg.deletedFor ? msg.deletedFor.split(',').filter(Boolean) : []
      if (!existing.includes(me.id)) existing.push(me.id)
      await db.message.update({ where: { id }, data: { deletedFor: existing.join(',') } })
    }
    return json({ ok: true, scope })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
