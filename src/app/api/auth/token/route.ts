import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    // return the most recent active session token for the ws fallback auth
    const session = await db.session.findFirst({
      where: { userId: me.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    if (!session) return errorJson('No session', 404)
    return json({ token: session.token })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
