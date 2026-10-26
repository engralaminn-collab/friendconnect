import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET my broadcast lists
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const lists = await db.broadcastList.findMany({
      where: { ownerId: me.id },
      orderBy: { updatedAt: 'desc' },
      include: { members: { include: { recipient: { select: { id: true, name: true, username: true } } } } },
    })
    return json({
      lists: lists.map((l) => ({
        id: l.id,
        name: l.name,
        memberCount: l.members.length,
        members: l.members.map((m) => ({ id: m.recipient.id, name: m.recipient.name, username: m.recipient.username })),
        createdAt: l.createdAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// POST create a broadcast list (or send a broadcast)
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const action = String(body.action || 'create')

    if (action === 'create') {
      const name = String(body.name || '').trim()
      const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : []
      if (!name) return errorJson('name required', 400)
      if (memberIds.length === 0) return errorJson('At least one member required', 400)
      const list = await db.broadcastList.create({ data: { ownerId: me.id, name } })
      for (const uid of memberIds) {
        await db.broadcastMember.upsert({
          where: { broadcastId_recipientId: { broadcastId: list.id, recipientId: uid } },
          update: {},
          create: { broadcastId: list.id, recipientId: uid },
        })
      }
      return json({ list: { id: list.id, name: list.name } })
    }

    if (action === 'send') {
      // send a broadcast message to all members (creates a 1:1 message per recipient)
      const listId = String(body.listId || '')
      const content = String(body.content || '').trim()
      if (!listId || !content) return errorJson('listId and content required', 400)
      const list = await db.broadcastList.findUnique({
        where: { id: listId },
        include: { members: true },
      })
      if (!list || list.ownerId !== me.id) return errorJson('List not found', 404)
      let sent = 0
      for (const m of list.members) {
        // skip blocked
        const blocked = await db.friendship.findFirst({
          where: { status: 'BLOCKED', OR: [{ requesterId: me.id, receiverId: m.recipientId }, { requesterId: m.recipientId, receiverId: me.id }] },
        })
        if (blocked) continue
        await db.message.create({
          data: { senderId: me.id, receiverId: m.recipientId, content, type: 'text', status: 'SENT' },
        })
        sent++
      }
      return json({ ok: true, sent })
    }

    return errorJson('Unknown action', 400)
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// DELETE a broadcast list
export async function DELETE(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return errorJson('id required', 400)
    const list = await db.broadcastList.findUnique({ where: { id } })
    if (!list || list.ownerId !== me.id) return errorJson('Not found', 404)
    await db.broadcastList.delete({ where: { id } })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
