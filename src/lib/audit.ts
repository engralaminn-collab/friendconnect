import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// Audit log helper (round 11) — records security-relevant actions.
export async function audit(opts: {
  userId?: string | null
  action: string
  resource?: string | null
  ip?: string | null
  userAgent?: string | null
  meta?: Record<string, any> | null
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        action: opts.action,
        resource: opts.resource ?? null,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
        meta: opts.meta ? JSON.stringify(opts.meta) : null,
      },
    })
    logger.info('audit', { action: opts.action, userId: opts.userId, resource: opts.resource })
  } catch (e: any) {
    logger.error('audit log failed', { error: e?.message })
  }
}
