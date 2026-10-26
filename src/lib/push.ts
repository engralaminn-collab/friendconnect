// Web Push notification library (round 15)
// Uses web-push npm package. If VAPID keys are not configured, push is disabled (graceful fallback).
import { logger } from '@/lib/logger'

let _webpush: any = null
let _configured = false

export function initWebPush() {
  if (_webpush) return _webpush
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@friendconnect.app'
  if (!publicKey || !privateKey) {
    logger.warn('web-push not configured — VAPID keys missing. Run: ./scripts/generate-vapid.sh')
    return null
  }
  try {
    const webpush = (eval('require')('web-push'))
    webpush.setVapidDetails(subject, publicKey, privateKey)
    _webpush = webpush
    _configured = true
    logger.info('web-push configured', { subject })
    return webpush
  } catch (e: any) {
    logger.error('web-push init failed', { error: e?.message })
    return null
  }
}

export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || ''
}

export async function sendPushNotification(subscription: { endpoint: string; p256dh: string; auth: string }, payload: any) {
  const webpush = initWebPush()
  if (!webpush) return { ok: false, error: 'web-push not configured' }
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    )
    return { ok: true }
  } catch (e: any) {
    logger.error('push send failed', { error: e?.message, endpoint: subscription.endpoint.slice(0, 50) })
    return { ok: false, error: e?.message, statusCode: e?.statusCode }
  }
}
