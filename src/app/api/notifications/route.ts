import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const notifications = await db.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unread = await db.notification.count({ where: { userId: me.id, read: false } })
    return json({
      unread,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data ? JSON.parse(n.data) : null,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    if (body.all) {
      await db.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } })
      return json({ ok: true })
    }
    const id = String(body.id || '')
    if (id) {
      await db.notification.updateMany({ where: { id, userId: me.id }, data: { read: true } })
    }
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
