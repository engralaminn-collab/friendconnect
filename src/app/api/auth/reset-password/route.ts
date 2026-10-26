import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, validatePassword } from '@/lib/auth'
import { errorJson, json } from '@/lib/serialize'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const identifier = String(body.email || body.username || '').trim().toLowerCase()
    const otp = String(body.otp || '').trim()
    const password = String(body.password || '')
    if (!identifier || !otp || !password) return errorJson('Missing fields', 400)
    const pwErr = validatePassword(password)
    if (pwErr) return errorJson(pwErr, 400)
    const user = await db.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    })
    if (!user) return errorJson('Account not found', 404)
    if (!user.otpCode || !user.otpExpiry) return errorJson('No OTP requested', 400)
    if (user.otpExpiry.getTime() < Date.now()) return errorJson('OTP expired', 400)
    if (user.otpCode !== otp) return errorJson('Invalid OTP', 400)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password), otpCode: null, otpExpiry: null },
    })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
