import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { verifyTotp, generateBackupCodes } from '@/lib/totp'
import { hashPassword } from '@/lib/auth'
import { audit } from '@/lib/audit'
import { errorJson, json } from '@/lib/serialize'

// POST verify a TOTP code + enable 2FA
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const user = await db.user.findUnique({ where: { id: me.id } })
    if (!user) return errorJson('User not found', 404)
    if (user.twoFactorEnabled) return errorJson('2FA already enabled', 400)
    if (!user.twoFactorSecret) return errorJson('Setup 2FA first', 400)
    const body = await req.json()
    const code = String(body.code || '')
    if (!verifyTotp(code, user.twoFactorSecret)) return errorJson('Invalid code', 400)
    // generate backup codes (hashed for storage)
    const codes = generateBackupCodes()
    const hashed = codes.map((c) => hashPassword(c + user.id)).join(',')
    await db.user.update({ where: { id: me.id }, data: { twoFactorEnabled: true, twoFactorBackup: hashed } })
    await audit({ userId: me.id, action: '2fa_enable' })
    return json({ ok: true, backupCodes: codes })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
