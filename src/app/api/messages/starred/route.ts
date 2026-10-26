import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET all messages I've starred (across all conversations)
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const stars = await db.messageStar.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true, username: true, profile: { select: { photoUrl: true } } } },
          },
        },
      },
    })
    return json({
      starred: stars
        .filter((s) => s.message)
        .map((s) => {
          const m = s.message
          return {
            id: m.id,
            senderId: m.senderId,
            senderName: m.sender.name,
            senderUsername: m.sender.username,
            senderPhoto: m.sender.profile?.photoUrl ?? null,
            content: m.content,
            type: m.type,
            fileUrl: m.fileUrl,
            fileName: m.fileName,
            createdAt: m.createdAt.toISOString(),
            starredAt: s.createdAt.toISOString(),
            receiverId: m.receiverId,
            groupId: m.groupId,
            deletedFor: m.deletedFor,
          }
        }),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
