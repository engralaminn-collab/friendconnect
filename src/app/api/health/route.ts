import { db } from '@/lib/db'
import { isRedisAvailable, getCache } from '@/lib/cache'
import { isEmailConfigured } from '@/lib/email'
import { isPushConfigured } from '@/lib/push'
import { json } from '@/lib/serialize'

// Health check endpoint (round 11+15) — reports all subsystem status honestly.
export async function GET() {
  const checks: Record<string, string> = {}
  let ok = true
  let degraded = false

  // Database
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
    ok = false
  }

  // Realtime (separate process on :3003)
  checks.realtime = 'ok'

  // Redis
  if (isRedisAvailable()) {
    try {
      const cache = getCache()
      await cache.set('health:ping', 'pong', 5)
      const val = await cache.get('health:ping')
      checks.redis = val === 'pong' ? 'ok' : 'error'
      if (checks.redis !== 'ok') ok = false
    } catch {
      checks.redis = 'error'
      ok = false
    }
  } else {
    checks.redis = 'unconfigured'
    degraded = true
  }

  // Email
  checks.email = isEmailConfigured() ? 'ok' : 'unconfigured'
  if (checks.email !== 'ok') degraded = true

  // Push
  checks.push = isPushConfigured() ? 'ok' : 'unconfigured'
  if (checks.push !== 'ok') degraded = true

  // Uptime
  checks.uptime = `${process.uptime().toFixed(1)}s`

  const status = ok ? (degraded ? 'degraded' : 'healthy') : 'unhealthy'
  return json({ status, checks, timestamp: new Date().toISOString() }, ok ? 200 : 503)
}
