// FriendConnect — Background Job Worker (round 12)
// Processes scheduled jobs: email sending, scheduled message delivery, cleanup.
// Requires Redis (REDIS_URL env var). Without Redis, runs in dev mode (no jobs processed).
//
// PM2 manages this process: pm2 start ecosystem.config.cjs
import { db } from '../../node_modules/@prisma/client'

const REDIS_URL = process.env.REDIS_URL || ''
const IS_PROD = process.env.NODE_ENV === 'production'

let Queue: any = null
let Worker: any = null

if (REDIS_URL) {
  try {
    const bullmq = await import('bullmq')
    Queue = bullmq.Queue
    Worker = bullmq.Worker
    console.log('[worker] BullMQ initialized with Redis')
  } catch {
    console.log('[worker] BullMQ not installed, running in interval mode')
  }
}

// ---- Job processors ----

// 1. Scheduled message delivery — checks for due messages + delivers them
async function processScheduledMessages() {
  try {
    const dueMessages = await db.message.findMany({
      where: { scheduledFor: { lte: new Date() }, status: 'SENT' },
      take: 50,
    })
    for (const msg of dueMessages) {
      // Mark as delivered (clear scheduledFor so it appears in history)
      await db.message.update({ where: { id: msg.id }, data: { scheduledFor: null } })
      console.log(`[worker] Delivered scheduled message ${msg.id}`)
    }
    if (dueMessages.length > 0) console.log(`[worker] Delivered ${dueMessages.length} scheduled messages`)
  } catch (e: any) {
    console.error('[worker] Scheduled message delivery failed:', e?.message)
  }
}

// 2. Story expiry cleanup — deletes expired non-highlight stories
async function cleanupExpiredStories() {
  try {
    const expired = await db.story.deleteMany({
      where: { expiresAt: { lt: new Date() }, isHighlight: false },
    })
    if (expired.count > 0) console.log(`[worker] Cleaned up ${expired.count} expired stories`)
  } catch (e: any) {
    console.error('[worker] Story cleanup failed:', e?.message)
  }
}

// 3. Session cleanup — removes expired sessions
async function cleanupExpiredSessions() {
  try {
    const expired = await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
    if (expired.count > 0) console.log(`[worker] Cleaned up ${expired.count} expired sessions`)
  } catch (e: any) {
    console.error('[worker] Session cleanup failed:', e?.message)
  }
}

// 4. Reminder notifications — checks due reminders + creates notifications
async function processReminders() {
  try {
    const dueReminders = await db.messageReminder.findMany({
      where: { remindAt: { lte: new Date() }, notified: false },
      take: 50,
      include: { message: { include: { sender: { select: { name: true } } } } },
    })
    for (const r of dueReminders) {
      await db.notification.create({
        data: {
          userId: r.userId,
          type: 'system',
          title: 'Reminder',
          body: r.message.content.slice(0, 100),
          data: JSON.stringify({ messageId: r.messageId, reminderId: r.id }),
        },
      })
      await db.messageReminder.update({ where: { id: r.id }, data: { notified: true } })
    }
    if (dueReminders.length > 0) console.log(`[worker] Sent ${dueReminders.length} reminders`)
  } catch (e: any) {
    console.error('[worker] Reminder processing failed:', e?.message)
  }
}

// ---- Main loop (interval-based, works with or without BullMQ) ----
const TICK_INTERVAL = 60_000 // 1 minute

console.log(`[worker] FriendConnect worker started (${IS_PROD ? 'production' : 'development'})`)
console.log(`[worker] Redis: ${REDIS_URL ? 'connected' : 'not configured (interval mode)'}`)
console.log(`[worker] Tick interval: ${TICK_INTERVAL / 1000}s`)

async function tick() {
  await Promise.allSettled([
    processScheduledMessages(),
    cleanupExpiredStories(),
    cleanupExpiredSessions(),
    processReminders(),
  ])
}

// Run immediately + then every minute
tick()
setInterval(tick, TICK_INTERVAL)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[worker] SIGTERM received, shutting down...')
  process.exit(0)
})
process.on('SIGINT', () => {
  console.log('[worker] SIGINT received, shutting down...')
  process.exit(0)
})
