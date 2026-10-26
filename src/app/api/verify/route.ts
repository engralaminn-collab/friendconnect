import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// POST /api/verify — request verification (sets status to pending)
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const reason = String(body.reason || '').trim().slice(0, 500)
    const profile = await db.profile.findUnique({ where: { userId: me.id } })
    if (!profile) return errorJson('Profile not found', 404)
    if (profile.verified === 'verified') return errorJson('Already verified', 400)
    if (profile.verified === 'pending') return errorJson('Verification already pending', 400)
    await db.profile.update({ where: { userId: me.id }, data: { verified: 'pending' } })
    // create a system notification for review (in a real app, admins would review)
    await db.notification.create({
      data: {
        userId: me.id,
        type: 'system',
        title: 'Verification requested',
        body: reason ? `Your verification request: ${reason}` : 'Your verification request has been submitted.',
        data: JSON.stringify({ verified: 'pending' }),
      },
    })
    return json({ ok: true, verified: 'pending' })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

// GET verification status
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const profile = await db.profile.findUnique({ where: { userId: me.id }, select: { verified: true } })
    return json({ verified: profile?.verified ?? 'unverified' })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
