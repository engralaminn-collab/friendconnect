import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { generateOtp } from '@/lib/auth'
import { errorJson, json } from '@/lib/serialize'

// POST resend email verification (generates a code stored on user, returned for demo)
export async function POST() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const user = await db.user.findUnique({ where: { id: me.id } })
    if (!user) return errorJson('User not found', 404)
    if (user.emailVerified) return errorJson('Email already verified', 400)
    // reuse otpCode/otpExpiry for the email verification code
    const code = generateOtp()
    await db.user.update({ where: { id: me.id }, data: { otpCode: code, otpExpiry: new Date(Date.now() + 10 * 60 * 1000) } })
    // in production this would send an email; here we return the code for the demo
    return json({ ok: true, code, message: 'Verification code generated (demo: code returned)' })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
