import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { sendPushNotification } from '@/lib/push'
import { errorJson, json } from '@/lib/serialize'

// POST /api/push/send — send a test push notification to the current user's devices
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const { title, body: notifBody } = body
    const subs = await db.pushSubscription.findMany({ where: { userId: me.id } })
    if (subs.length === 0) return errorJson('No push subscriptions', 404)
    const results = await Promise.all(
      subs.map(async (s) => {
        const res = await sendPushNotification(s, {
          title: title || 'FriendConnect',
          body: notifBody || 'Test notification',
          icon: '/friendconnect-logo.png',
          badge: '/friendconnect-logo.png',
        })
        return { endpoint: s.endpoint.slice(0, 50), ok: res.ok }
      })
    )
    // Clean up expired subscriptions (410 Gone)
    for (let i = 0; i < subs.length; i++) {
      if (!results[i].ok) {
        await db.pushSubscription.deleteMany({ where: { endpoint: subs[i].endpoint } }).catch(() => {})
      }
    }
    return json({ sent: results.filter(r => r.ok).length, total: subs.length, results })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
