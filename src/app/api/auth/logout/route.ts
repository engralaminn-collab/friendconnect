import { db } from '@/lib/db'
import { clearSessionCookie, getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function POST() {
  try {
    const user = await getSessionUser()
    if (user) {
      await db.session.deleteMany({ where: { userId: user.id } }).catch(() => {})
    }
    await clearSessionCookie()
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
