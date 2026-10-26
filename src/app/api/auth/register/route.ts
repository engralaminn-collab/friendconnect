import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, isEmail, sanitizeUsername, validatePassword } from '@/lib/auth'
import { createSession, setSessionCookie } from '@/lib/session'
import { ensureProfile, errorJson, json } from '@/lib/serialize'
import { audit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const username = sanitizeUsername(String(body.username || ''))
    const name = String(body.name || '').trim()
    const password = String(body.password || '')

    if (!isEmail(email)) return errorJson('Invalid email', 400)
    if (!username || username.length < 3) return errorJson('Username must be at least 3 chars (a-z, 0-9, _, .)', 400)
    if (!name) return errorJson('Name is required', 400)
    const pwErr = validatePassword(password)
    if (pwErr) return errorJson(pwErr, 400)

    const existingEmail = await db.user.findUnique({ where: { email } })
    if (existingEmail) return errorJson('Email already registered', 409)
    const existingUsername = await db.user.findUnique({ where: { username } })
    if (existingUsername) return errorJson('Username already taken', 409)

    const user = await db.user.create({
      data: { email, username, name, passwordHash: hashPassword(password), emailVerified: false },
    })
    await ensureProfile(user.id)
    const userAgent = req.headers.get('user-agent') || undefined
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined
    const token = await createSession(user.id, { userAgent, ip })
    await setSessionCookie(token)
    await audit({ userId: user.id, action: 'register', ip, userAgent })
    return json({ user: { id: user.id, email, username, name } })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
