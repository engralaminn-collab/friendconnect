import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET admin analytics (admin role only)
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    if (me.role !== 'admin') return errorJson('Forbidden', 403)
    const [users, messages, groups, calls, stories, sessions, files, verifiedUsers, twoFactorUsers, archivedChats] = await Promise.all([
      db.user.count(),
      db.message.count(),
      db.group.count(),
      db.call.count(),
      db.story.count(),
      db.session.count({ where: { expiresAt: { gt: new Date() } } }),
      db.file.count(),
      db.user.count({ where: { emailVerified: true } }),
      db.user.count({ where: { twoFactorEnabled: true } }),
      db.chatPreference.count({ where: { archived: true } }),
    ])
    // new users in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const newUsers = await db.user.count({ where: { createdAt: { gt: sevenDaysAgo } } })
    // messages in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const messages24h = await db.message.count({ where: { createdAt: { gt: oneDayAgo } } })
    return json({
      totals: { users, messages, groups, calls, stories, sessions, files, verifiedUsers, twoFactorUsers, archivedChats },
      activity: { newUsers7d: newUsers, messages24h },
      security: { verifiedRate: users > 0 ? Math.round((verifiedUsers / users) * 100) : 0, twoFactorRate: users > 0 ? Math.round((twoFactorUsers / users) * 100) : 0 },
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
