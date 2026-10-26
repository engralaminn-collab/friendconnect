import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET replies for a story (story owner + repliers can see)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const story = await db.story.findUnique({ where: { id } })
    if (!story) return errorJson('Story not found', 404)
    // only story owner or friends can view replies
    if (story.userId !== me.id) {
      const fr = await db.friendship.findFirst({
        where: { status: 'ACCEPTED', OR: [{ requesterId: me.id, receiverId: story.userId }, { requesterId: story.userId, receiverId: me.id }] },
      })
      if (!fr) return errorJson('Forbidden', 403)
    }
    const replies = await db.storyReply.findMany({
      where: { storyId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: { include: { profile: true } } },
    })
    return json({
      replies: replies.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userPhoto: r.user.profile?.photoUrl ?? null,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// POST add a reply to a story
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const story = await db.story.findUnique({ where: { id } })
    if (!story) return errorJson('Story not found', 404)
    // must be a friend to reply
    if (story.userId !== me.id) {
      const fr = await db.friendship.findFirst({
        where: { status: 'ACCEPTED', OR: [{ requesterId: me.id, receiverId: story.userId }, { requesterId: story.userId, receiverId: me.id }] },
      })
      if (!fr) return errorJson('Forbidden', 403)
    }
    const body = await req.json()
    const content = String(body.content || '').trim().slice(0, 500)
    if (!content) return errorJson('Reply cannot be empty', 400)
    const reply = await db.storyReply.create({
      data: { storyId: id, userId: me.id, content },
      include: { user: { include: { profile: true } } },
    })
    // notify the story owner
    if (story.userId !== me.id) {
      await db.notification.create({
        data: {
          userId: story.userId,
          type: 'system',
          title: 'New story reply',
          body: `${me.name} replied to your story`,
          data: JSON.stringify({ storyId: id, replyId: reply.id, from: me.id, name: me.name }),
        },
      })
    }
    return json({
      reply: {
        id: reply.id,
        userId: reply.userId,
        userName: reply.user.name,
        userPhoto: reply.user.profile?.photoUrl ?? null,
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
      },
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
