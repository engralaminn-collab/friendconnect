// TOTP (Time-based One-Time Password) helpers for 2FA (round 11).
// Implements RFC 6238 using Node's built-in crypto — no external deps.
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31]
  }
  return output
}

export function base32Decode(str: string): Buffer {
  const cleaned = str.replace(/=+$/, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const c of cleaned) {
    const idx = BASE32_CHARS.indexOf(c)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

export function generateTwoFactorSecret(): string {
  return base32Encode(randomBytes(20))
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  // write counter as big-endian 64-bit
  const high = Math.floor(counter / 0x100000000)
  const low = counter % 0x100000000
  buf.writeUInt32BE(high, 0)
  buf.writeUInt32BE(low >>> 0, 4)
  const hmac = createHmac('sha1', secret).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
  return (code % 1000000).toString().padStart(6, '0')
}

export function generateTotp(secretBase32: string, window: number = 0): string {
  const counter = Math.floor(Date.now() / 30000) + window
  const secret = base32Decode(secretBase32)
  return hotp(secret, counter)
}

export function verifyTotp(token: string, secretBase32: string, windows: number = 1): boolean {
  const cleaned = token.replace(/\s/g, '')
  if (!/^\d{6}$/.test(cleaned)) return false
  for (let w = -windows; w <= windows; w++) {
    const expected = generateTotp(secretBase32, w)
    const a = Buffer.from(cleaned)
    const b = Buffer.from(expected)
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }
  return false
}

export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 8; i++) {
    codes.push(randomBytes(4).toString('hex'))
  }
  return codes
}

// Build an otpauth:// URI for QR code generation
export function buildOtpauthUri(email: string, secretBase32: string): string {
  const label = encodeURIComponent(`FriendConnect:${email}`)
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer: 'FriendConnect',
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
