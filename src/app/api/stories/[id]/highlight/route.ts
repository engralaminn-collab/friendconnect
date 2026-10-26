import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST /api/stories/[id]/highlight { highlight: true|false } — toggle highlight (saves story from expiry)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const body = await req.json()
    const highlight = !!body.highlight
    const story = await db.story.findUnique({ where: { id } })
    if (!story) return errorJson('Story not found', 404)
    // only the story owner can highlight their own story
    if (story.userId !== me.id) return errorJson('Only owner can highlight', 403)
    const updated = await db.story.update({
      where: { id },
      data: { isHighlight: highlight },
    })
    return json({ ok: true, isHighlight: updated.isHighlight })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
