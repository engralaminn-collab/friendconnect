import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { audit } from '@/lib/audit'
import { errorJson, json } from '@/lib/serialize'

// DELETE revoke a session (logout a device)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const session = await db.session.findUnique({ where: { id } })
    if (!session) return errorJson('Session not found', 404)
    if (session.userId !== me.id) return errorJson('Forbidden', 403)
    await db.session.delete({ where: { id } })
    await audit({ userId: me.id, action: 'session_revoke', resource: `session:${id}`, userAgent: session.userAgent, ip: session.ipAddress })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
