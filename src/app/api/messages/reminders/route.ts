import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET my active reminders
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const reminders = await db.messageReminder.findMany({
      where: { userId: me.id, notified: false, remindAt: { gt: new Date() } },
      orderBy: { remindAt: 'asc' },
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } },
          },
        },
      },
    })
    return json({
      reminders: reminders.map((r) => {
        const m = r.message
        const peer = m.senderId === me.id ? m.receiver : m.sender
        return {
          id: r.id,
          messageId: m.id,
          content: m.content,
          type: m.type,
          remindAt: r.remindAt.toISOString(),
          peerId: peer?.id ?? null,
          peerName: peer?.name ?? 'Unknown',
        }
      }),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
