import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { isTurnConfigured, STUN_SERVERS, TURN_SERVERS } from '@/lib/constants'
import { json, errorJson } from '@/lib/serialize'

// GET /api/webrtc/config — client-safe ICE config (authenticated)
// Returns STUN servers + TURN credentials (time-limited if TURN_SECRET set).
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const turnConfigured = isTurnConfigured()
    const iceServers: any[] = STUN_SERVERS.map(urls => ({ urls }))
    if (turnConfigured) {
      const { TURN_USERNAME, TURN_PASSWORD, TURN_SECRET } = await import('@/lib/constants')
      let username = TURN_USERNAME
      let credential = TURN_PASSWORD
      if (TURN_SECRET) {
        const { turnCredentials } = await import('@/lib/constants')
        const creds = turnCredentials()
        username = creds.username
        credential = creds.credential
      }
      for (const urls of TURN_SERVERS) {
        iceServers.push({ urls, username, credential })
      }
    }
    return json({
      iceServers,
      stunServers: STUN_SERVERS,
      turnConfigured,
      iceTransportPolicy: turnConfigured ? 'all' : 'all', // allow host candidates too
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
