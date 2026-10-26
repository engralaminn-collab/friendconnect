import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET my drafts (all, or filtered by ?peerId=&isGroup=)
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const peerId = req.nextUrl.searchParams.get('peerId')
    const isGroup = req.nextUrl.searchParams.get('isGroup') === 'true'
    if (peerId) {
      const draft = await db.messageDraft.findUnique({
        where: { userId_peerId_isGroup: { userId: me.id, peerId, isGroup } },
      })
      return json({ draft: draft ? { content: draft.content, updatedAt: draft.updatedAt.toISOString() } : null })
    }
    const drafts = await db.messageDraft.findMany({ where: { userId: me.id } })
    return json({
      drafts: drafts.map((d) => ({ peerId: d.peerId, isGroup: d.isGroup, content: d.content, updatedAt: d.updatedAt.toISOString() })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// POST upsert (auto-save) a draft
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const peerId = String(body.peerId || '')
    const isGroup = !!body.isGroup
    const content = String(body.content || '')
    if (!peerId) return errorJson('peerId required', 400)
    // if empty content, delete the draft
    if (!content.trim()) {
      await db.messageDraft.deleteMany({ where: { userId: me.id, peerId, isGroup } })
      return json({ ok: true, deleted: true })
    }
    await db.messageDraft.upsert({
      where: { userId_peerId_isGroup: { userId: me.id, peerId, isGroup } },
      update: { content },
      create: { userId: me.id, peerId, isGroup, content },
    })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// DELETE a draft
export async function DELETE(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const peerId = req.nextUrl.searchParams.get('peerId')
    const isGroup = req.nextUrl.searchParams.get('isGroup') === 'true'
    if (!peerId) return errorJson('peerId required', 400)
    await db.messageDraft.deleteMany({ where: { userId: me.id, peerId, isGroup } })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
