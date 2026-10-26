import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { generateTwoFactorSecret, buildOtpauthUri } from '@/lib/totp'
import { errorJson, json } from '@/lib/serialize'

// POST setup 2FA — generates a secret + returns otpauth URI + QR data URL
export async function POST() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    if (me.twoFactorEnabled) return errorJson('2FA already enabled', 400)
    const secret = generateTwoFactorSecret()
    // store secret but don't enable yet (verify step enables)
    await db.user.update({ where: { id: me.id }, data: { twoFactorSecret: secret } })
    const uri = buildOtpauthUri(me.email, secret)
    // generate a simple QR code as a data URL using a public QR API fallback
    // (the frontend can also render the QR from the URI via a lib, but a data URL is simpler)
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`
    return json({ secret, uri, qrDataUrl })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
