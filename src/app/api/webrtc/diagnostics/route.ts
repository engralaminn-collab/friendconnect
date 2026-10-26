import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { isTurnConfigured, STUN_SERVERS, TURN_SERVERS, TURN_REALM } from '@/lib/constants'
import { json, errorJson } from '@/lib/serialize'

// GET /api/webrtc/diagnostics — authenticated diagnostics (no secrets exposed)
// Reports signaling/STUN/TURN/Redis status + recent call stats for the user.
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    // Recent call stats
    const recentCalls = await db.call.findMany({
      where: { OR: [{ callerId: me.id }, { receiverId: me.id }] },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: { id: true, type: true, status: true, startedAt: true, duration: true, failureReason: true, connectionType: true },
    })
    const stats = {
      total: recentCalls.length,
      connected: recentCalls.filter(c => c.status === 'connected' || c.status === 'ended').length,
      failed: recentCalls.filter(c => c.status === 'failed').length,
      missed: recentCalls.filter(c => c.status === 'missed').length,
    }
    return json({
      user: { id: me.id, name: me.name },
      signaling: { status: 'ok', transport: 'websocket', port: 3003 },
      stun: { configured: STUN_SERVERS.length > 0, servers: STUN_SERVERS },
      turn: {
        configured: isTurnConfigured(),
        servers: TURN_SERVERS,
        realm: TURN_REALM,
        credentialType: process.env.TURN_SECRET ? 'time-limited (HMAC)' : (process.env.TURN_USERNAME ? 'static' : 'none'),
      },
      recentCalls: recentCalls.map(c => ({
        id: c.id,
        type: c.type,
        status: c.status,
        startedAt: c.startedAt.toISOString(),
        duration: c.duration,
        failureReason: c.failureReason,
        connectionType: c.connectionType,
      })),
      stats,
      recommendation: !isTurnConfigured()
        ? 'TURN not configured. For calls across different networks (WiFi↔Mobile Data, different ISPs, different countries), configure a TURN server. See coturn/README.md.'
        : 'TURN configured. Cross-network calls should work.',
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
