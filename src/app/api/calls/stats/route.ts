import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET call statistics for the current user
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)

    const calls = await db.call.findMany({
      where: { OR: [{ callerId: me.id }, { receiverId: me.id }] },
    })

    const total = calls.length
    const connected = calls.filter((c) => c.status === 'connected' || c.status === 'ended')
    const missed = calls.filter((c) => c.status === 'missed')
    const declined = calls.filter((c) => c.status === 'declined')
    const outgoing = calls.filter((c) => c.callerId === me.id)
    const incoming = calls.filter((c) => c.receiverId === me.id)
    const totalDurationSec = calls.reduce((sum, c) => sum + (c.duration || 0), 0)
    const audioCalls = calls.filter((c) => c.type === 'audio').length
    const videoCalls = calls.filter((c) => c.type === 'video').length

    return json({
      stats: {
        total,
        connected: connected.length,
        missed: missed.length,
        declined: declined.length,
        outgoing: outgoing.length,
        incoming: incoming.length,
        audioCalls,
        videoCalls,
        totalDurationSec,
        totalDurationLabel: formatDuration(totalDurationSec),
        avgDurationSec: connected.length ? Math.round(totalDurationSec / connected.length) : 0,
      },
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}h ${mm}m`
}
