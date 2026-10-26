import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const before = req.nextUrl.searchParams.get('before')
    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: me.id } },
    })
    if (!membership) return errorJson('Not a member', 403)
    const messages = await db.message.findMany({
      where: { groupId: id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { sender: { include: { profile: true } } },
    })
    return json({
      messages: messages.reverse().map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender.name,
        senderPhoto: m.sender.profile?.photoUrl ?? null,
        content: m.content,
        type: m.type,
        fileUrl: m.fileUrl,
        fileName: m.fileName,
        fileSize: m.fileSize,
        mimeType: m.mimeType,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
