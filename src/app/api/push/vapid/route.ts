import { getVapidPublicKey } from '@/lib/push'
import { json } from '@/lib/serialize'

// GET /api/push/vapid — returns the VAPID public key for the client
export async function GET() {
  return json({ publicKey: getVapidPublicKey() })
}
