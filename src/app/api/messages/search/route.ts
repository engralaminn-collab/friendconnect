import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET /api/messages/search?q=QUERY — global search across all my 1:1 + group conversations
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const q = req.nextUrl.searchParams.get('q') || ''
    if (!q.trim()) return json({ results: [] })

    // my 1:1 conversations: messages where I'm sender or receiver (group null)
    const directMessages = await db.message.findMany({
      where: {
        groupId: null,
        OR: [{ senderId: me.id }, { receiverId: me.id }],
        content: { contains: q },
        deletedFor: { not: 'everyone' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    })

    // my groups
    const myGroups = await db.groupMember.findMany({ where: { userId: me.id }, select: { groupId: true } })
    const groupIds = myGroups.map((g) => g.groupId)

    const groupMessages = groupIds.length > 0 ? await db.message.findMany({
      where: {
        groupId: { in: groupIds },
        content: { contains: q },
        deletedFor: { not: 'everyone' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: { include: { profile: true } },
        group: true,
      },
    }) : []

    // build results with conversation context
    const results: any[] = []
    for (const m of directMessages) {
      const peer = m.senderId === me.id ? m.receiver : m.sender
      if (!peer) continue
      // skip if deleted for me
      const deletedForList = m.deletedFor ? m.deletedFor.split(',').filter(Boolean) : []
      if (deletedForList.includes(me.id)) continue
      results.push({
        messageId: m.id,
        content: m.content,
        type: m.type,
        createdAt: m.createdAt.toISOString(),
        senderId: m.senderId,
        senderName: m.sender.name,
        conversationType: 'direct',
        peerId: peer.id,
        peerName: peer.name,
        peerUsername: peer.username,
        peerPhoto: peer.profile?.photoUrl ?? null,
      })
    }
    for (const m of groupMessages) {
      const deletedForList = m.deletedFor ? m.deletedFor.split(',').filter(Boolean) : []
      if (deletedForList.includes(me.id)) continue
      results.push({
        messageId: m.id,
        content: m.content,
        type: m.type,
        createdAt: m.createdAt.toISOString(),
        senderId: m.senderId,
        senderName: m.sender.name,
        conversationType: 'group',
        groupId: m.groupId,
        groupName: m.group?.name || 'Group',
      })
    }

    // sort by recency + limit
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return json({ results: results.slice(0, 50) })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
