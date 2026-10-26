import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET /api/messages/export?userId=ID — export a 1:1 conversation as JSON (downloadable)
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const userId = req.nextUrl.searchParams.get('userId')
    const groupId = req.nextUrl.searchParams.get('groupId')
    const format = req.nextUrl.searchParams.get('format') || 'json' // json | txt

    let peerName = 'Conversation'
    let messages: any[] = []

    if (groupId) {
      const membership = await db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: me.id } } })
      if (!membership) return errorJson('Not a member', 403)
      const group = await db.group.findUnique({ where: { id: groupId } })
      peerName = group?.name || 'Group'
      messages = await db.message.findMany({
        where: { groupId },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { name: true } } },
      })
    } else if (userId) {
      const blocked = await db.friendship.findFirst({
        where: { status: 'BLOCKED', OR: [{ requesterId: me.id, receiverId: userId }, { requesterId: userId, receiverId: me.id }] },
      })
      if (blocked) return errorJson('Cannot export', 403)
      const peer = await db.user.findUnique({ where: { id: userId }, select: { name: true } })
      peerName = peer?.name || 'User'
      messages = await db.message.findMany({
        where: { groupId: null, OR: [{ senderId: me.id, receiverId: userId }, { senderId: userId, receiverId: me.id }] },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { name: true } } },
      })
    } else {
      return errorJson('userId or groupId required', 400)
    }

    // filter out scheduled + deleted-for-everyone
    const now = new Date()
    const exportable = messages.filter((m) => (!m.scheduledFor || m.scheduledFor <= now) && m.deletedFor !== 'everyone')

    if (format === 'txt') {
      const lines = exportable.map((m) => {
        const time = new Date(m.createdAt).toLocaleString()
        const sender = m.senderId === me.id ? 'Me' : (m.sender?.name || 'Unknown')
        const content = m.type === 'text' ? m.content : `[${m.type}: ${m.fileName || m.fileUrl || ''}]`
        return `[${time}] ${sender}: ${content}`
      })
      const txt = `FriendConnect Chat Export\n${peerName}\n${exportable.length} messages\n\n${lines.join('\n')}`
      return new Response(txt, {
        headers: {
          'content-type': 'text/plain',
          'content-disposition': `attachment; filename="${peerName.replace(/[^a-z0-9]/gi, '_')}_chat.txt"`,
        },
      })
    }

    return json({
      conversation: peerName,
      exportedAt: new Date().toISOString(),
      messageCount: exportable.length,
      messages: exportable.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderId === me.id ? 'Me' : (m.sender?.name || 'Unknown'),
        content: m.content,
        type: m.type,
        fileUrl: m.fileUrl,
        fileName: m.fileName,
        createdAt: m.createdAt.toISOString(),
        edited: m.edited,
        replyToId: m.replyToId,
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
