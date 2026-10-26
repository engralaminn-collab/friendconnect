import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET file quota for the current user
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const user = await db.user.findUnique({ where: { id: me.id }, select: { fileQuotaBytes: true, fileUsedBytes: true } })
    if (!user) return errorJson('User not found', 404)
    const used = user.fileUsedBytes
    const quota = user.fileQuotaBytes
    return json({
      used,
      quota,
      remaining: Math.max(0, quota - used),
      usedMB: (used / 1048576).toFixed(2),
      quotaMB: (quota / 1048576).toFixed(2),
      percent: quota > 0 ? Math.round((used / quota) * 100) : 0,
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
