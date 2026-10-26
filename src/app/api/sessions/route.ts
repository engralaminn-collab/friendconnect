import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET active sessions for the current user (device management)
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const cookieStore = await import('next/headers').then(m => m.cookies())
    const currentToken = (await cookieStore).get('fc_session')?.value
    const sessions = await db.session.findMany({
      where: { userId: me.id, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: 'desc' },
    })
    return json({
      sessions: sessions.map((s) => ({
        id: s.id,
        deviceName: s.deviceName || 'Unknown device',
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        lastActiveAt: s.lastActiveAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isCurrent: s.token === currentToken,
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
