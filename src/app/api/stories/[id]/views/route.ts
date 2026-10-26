import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET /api/stories/[id]/views — list who viewed a story (owner only)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const story = await db.story.findUnique({ where: { id } })
    if (!story) return errorJson('Story not found', 404)
    if (story.userId !== me.id) return errorJson('Only owner can view viewers', 403)
    const views = await db.storyView.findMany({
      where: { storyId: id },
      orderBy: { viewedAt: 'desc' },
      include: { user: { include: { profile: true } } },
    })
    return json({
      views: views.map((v) => ({
        id: v.id,
        userId: v.user.id,
        userName: v.user.name,
        username: v.user.username,
        userPhoto: v.user.profile?.photoUrl ?? null,
        viewedAt: v.viewedAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
