import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST add a reaction (REST fallback; primary path is socket reaction:add)
export async function POST(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { messageId: id } = await params
    const body = await req.json()
    const emoji = String(body.emoji || '').slice(0, 8)
    if (!emoji) return errorJson('emoji required', 400)
    const msg = await db.message.findUnique({ where: { id } })
    if (!msg) return errorJson('Message not found', 404)
    await db.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId: id, userId: me.id, emoji } },
      update: {},
      create: { messageId: id, userId: me.id, emoji },
    })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// DELETE remove a reaction
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { messageId: id } = await params
    const emoji = req.nextUrl.searchParams.get('emoji') || ''
    if (!emoji) return errorJson('emoji required', 400)
    await db.messageReaction.deleteMany({ where: { messageId: id, userId: me.id, emoji } })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
