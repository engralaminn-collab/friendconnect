import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth'
import { verifyTotp } from '@/lib/totp'
import { createSession, setSessionCookie } from '@/lib/session'
import { audit } from '@/lib/audit'
import { errorJson, json } from '@/lib/serialize'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const identifier = String(body.email || body.username || '').trim().toLowerCase()
    const password = String(body.password || '')
    const twoFactorCode = String(body.twoFactorCode || '').trim()
    if (!identifier || !password) return errorJson('Missing credentials', 400)

    const user = await db.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    })
    if (!user) return errorJson('Account not found', 404)
    if (!verifyPassword(password, user.passwordHash)) return errorJson('Incorrect password', 401)

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return json({ requiresTwoFactor: true, message: 'Enter your 2FA code' }, 200)
      }
      if (!user.twoFactorSecret || !verifyTotp(twoFactorCode, user.twoFactorSecret)) {
        return errorJson('Invalid 2FA code', 401)
      }
    }

    const userAgent = req.headers.get('user-agent') || undefined
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined
    const token = await createSession(user.id, { userAgent, ip })
    await setSessionCookie(token)
    await audit({ userId: user.id, action: 'login', ip, userAgent, meta: { twoFactor: user.twoFactorEnabled } })
    return json({ user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role } })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
