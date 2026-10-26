import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { audit } from '@/lib/audit'
import { errorJson, json } from '@/lib/serialize'

// POST verify email with a code
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const code = String(body.code || '').trim()
    if (!code) return errorJson('Code required', 400)
    const user = await db.user.findUnique({ where: { id: me.id } })
    if (!user) return errorJson('User not found', 404)
    if (user.emailVerified) return errorJson('Email already verified', 400)
    if (!user.otpCode || !user.otpExpiry) return errorJson('No code requested', 400)
    if (user.otpExpiry.getTime() < Date.now()) return errorJson('Code expired', 400)
    if (user.otpCode !== code) return errorJson('Invalid code', 400)
    await db.user.update({ where: { id: me.id }, data: { emailVerified: true, otpCode: null, otpExpiry: null } })
    await audit({ userId: me.id, action: 'email_verify' })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
