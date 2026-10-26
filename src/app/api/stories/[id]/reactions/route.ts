import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET reactions for a story
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const reactions = await db.storyReaction.findMany({
      where: { storyId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: { include: { profile: true } } },
    })
    return json({
      reactions: reactions.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userPhoto: r.user.profile?.photoUrl ?? null,
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// POST react to a story (upsert — one reaction per user per story)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const story = await db.story.findUnique({ where: { id } })
    if (!story) return errorJson('Story not found', 404)
    // must be a friend to react
    if (story.userId !== me.id) {
      const fr = await db.friendship.findFirst({
        where: { status: 'ACCEPTED', OR: [{ requesterId: me.id, receiverId: story.userId }, { requesterId: story.userId, receiverId: me.id }] },
      })
      if (!fr) return errorJson('Forbidden', 403)
    }
    const body = await req.json()
    const emoji = String(body.emoji || '').slice(0, 8)
    if (!emoji) return errorJson('emoji required', 400)
    // upsert: delete existing reaction by me, add new one (one reaction per user)
    await db.storyReaction.deleteMany({ where: { storyId: id, userId: me.id } })
    const reaction = await db.storyReaction.create({
      data: { storyId: id, userId: me.id, emoji },
    })
    return json({ ok: true, reaction: { id: reaction.id, emoji } })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
