import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  if (hashBuf.length !== testBuf.length) return false
  return timingSafeEqual(hashBuf, testBuf)
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const SESSION_COOKIE = 'fc_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export const sessionCookieName = SESSION_COOKIE
export const sessionTtlMs = SESSION_TTL_MS

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function sanitizeUsername(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '')
}

export function validatePassword(v: string): string | null {
  if (v.length < 6) return 'Password must be at least 6 characters'
  if (v.length > 100) return 'Password too long'
  return null
}
