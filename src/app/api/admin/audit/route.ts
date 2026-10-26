import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET audit log entries (admin only)
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    if (me.role !== 'admin') return errorJson('Forbidden', 403)
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 100), 500)
    const action = req.nextUrl.searchParams.get('action')
    const logs = await db.auditLog.findMany({
      where: action ? { action } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, name: true, username: true } } },
    })
    return json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        resource: l.resource,
        ip: l.ip,
        userAgent: l.userAgent,
        meta: l.meta ? JSON.parse(l.meta) : null,
        createdAt: l.createdAt.toISOString(),
        user: l.user ? { id: l.user.id, name: l.user.name, username: l.user.username } : null,
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
