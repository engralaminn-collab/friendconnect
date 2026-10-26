import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { audit } from '@/lib/audit'
import { errorJson, json } from '@/lib/serialize'

// POST disable 2FA (requires password re-auth or current code — simplified: just requires being logged in)
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    // simple guard: require the current password (re-typed)
    const { verifyPassword } = await import('@/lib/auth')
    const user = await db.user.findUnique({ where: { id: me.id } })
    if (!user) return errorJson('User not found', 404)
    if (!verifyPassword(String(body.password || ''), user.passwordHash)) return errorJson('Incorrect password', 401)
    await db.user.update({ where: { id: me.id }, data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackup: null } })
    await audit({ userId: me.id, action: '2fa_disable' })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
