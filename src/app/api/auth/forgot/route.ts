import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { generateOtp } from '@/lib/auth'
import { errorJson, json } from '@/lib/serialize'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const identifier = String(body.email || body.username || '').trim().toLowerCase()
    if (!identifier) return errorJson('Email or username required', 400)
    const user = await db.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    })
    if (!user) return errorJson('Account not found', 404)
    const otp = generateOtp()
    const expiry = new Date(Date.now() + 1000 * 60 * 10) // 10 min
    await db.user.update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiry: expiry },
    })
    // In a real deployment this would be emailed. We return it for the demo flow.
    return json({ ok: true, otp, message: 'OTP generated. Use the code to reset your password.' })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
