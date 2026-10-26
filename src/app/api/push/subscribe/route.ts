import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST /api/push/subscribe — store a push subscription for the current user
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const { endpoint, keys } = body
    if (!endpoint || !keys?.p256dh || !keys?.auth) return errorJson('Invalid subscription', 400)
    const userAgent = req.headers.get('user-agent') || null
    // Upsert — endpoint is unique
    await db.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: me.id, p256dh: keys.p256dh, auth: keys.auth, userAgent, updatedAt: new Date() },
      create: { userId: me.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
