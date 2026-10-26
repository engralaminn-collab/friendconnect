import { createServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Redis } from 'ioredis'
// Import PrismaClient from the main project (where prisma generate produced the client)
import { PrismaClient } from '/home/z/my-project/node_modules/@prisma/client'

const db = new PrismaClient()

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Redis adapter for multi-process Socket.IO scaling (round 14).
// If REDIS_URL is set, connects pub/sub clients + creates the adapter.
// Without Redis, falls back to single-process (fine for small deployments).
const REDIS_URL = process.env.REDIS_URL || ''
let redisConnected = false
if (REDIS_URL) {
  try {
    const pubClient = new Redis(REDIS_URL, { retryStrategy: (times: number) => Math.min(times * 500, 2000) })
    const subClient = pubClient.duplicate()
    io.adapter(createAdapter(pubClient, subClient))
    pubClient.on('connect', () => { redisConnected = true; console.log('[rt] Redis adapter connected') })
    pubClient.on('error', (err: any) => console.error('[rt] Redis pub error:', err.message))
    subClient.on('error', (err: any) => console.error('[rt] Redis sub error:', err.message))
  } catch (e: any) {
    console.warn('[rt] Redis adapter init failed, running single-process:', e?.message)
  }
} else {
  console.log('[rt] REDIS_URL not set — running single-process (no multi-server scaling)')
}

interface AuthPayload {
  token: string
}
interface SendMsgPayload {
  tempId?: string
  receiverId: string
  content: string
  type?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  replyToId?: string
}
interface GroupSendPayload {
  tempId?: string
  groupId: string
  content: string
  type?: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  replyToId?: string
}

const online = new Map<string, Set<string>>() // userId -> set(socketIds)

function room(userId: string) {
  return `user:${userId}`
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    out[k] = decodeURIComponent(v)
  }
  return out
}

io.use(async (socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie)
    const token = cookies['fc_session']
    if (!token) {
      socket.data.userId = null
      return next()
    }
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session || session.expiresAt.getTime() < Date.now()) {
      socket.data.userId = null
      return next()
    }
    socket.data.userId = session.user.id
    socket.data.user = session.user
    next()
  } catch (e: any) {
    next(e)
  }
})

function setOnline(userId: string, socketId: string) {
  let set = online.get(userId)
  if (!set) {
    set = new Set()
    online.set(userId, set)
  }
  set.add(socketId)
}

function setOffline(userId: string, socketId: string) {
  const set = online.get(userId)
  if (!set) return
  set.delete(socketId)
  if (set.size === 0) online.delete(userId)
}

function isOnline(userId: string) {
  return online.has(userId)
}

async function updateLastSeen(userId: string) {
  try {
    await db.profile.update({
      where: { userId },
      data: { lastSeen: new Date() },
    })
  } catch {
    // profile may not exist yet
  }
}

io.on('connection', (socket) => {
  let userId: string | null = socket.data.userId ?? null

  const finishAuth = () => {
    if (!userId) return
    setOnline(userId, socket.id)
    socket.join(room(userId))
    io.emit('presence', { userId, online: true })
  }

  if (userId) finishAuth()

  // Fallback: client may also send token explicitly (e.g. if cookie not propagated)
  socket.on('auth', async (payload: AuthPayload, ack?: (r: any) => void) => {
    try {
      if (userId) {
        ack?.({ ok: true, userId })
        return
      }
      if (!payload?.token) {
        ack?.({ ok: false, error: 'no token' })
        return
      }
      const session = await db.session.findUnique({
        where: { token: payload.token },
        include: { user: true },
      })
      if (!session || session.expiresAt.getTime() < Date.now()) {
        ack?.({ ok: false, error: 'invalid session' })
        return
      }
      userId = session.user.id
      finishAuth()
      ack?.({ ok: true, userId })
    } catch (e: any) {
      ack?.({ ok: false, error: e?.message || 'error' })
    }
  })

  socket.on('message:send', async (data: SendMsgPayload, ack?: (r: any) => void) => {
    if (!userId) return ack?.({ ok: false, error: 'unauth' })
    try {
      const blocked = await db.friendship.findFirst({
        where: {
          status: 'BLOCKED',
          OR: [
            { requesterId: userId, receiverId: data.receiverId },
            { requesterId: data.receiverId, receiverId: userId },
          ],
        },
      })
      if (blocked) {
        ack?.({ ok: false, error: 'blocked' })
        return
      }
      // Check disappearing-messages preference for this conversation (sender's pref)
      let expiresAt: Date | null = null
      const senderPref = await db.chatPreference.findUnique({
        where: { userId_peerId: { userId, peerId: data.receiverId } },
      }).catch(() => null)
      if (senderPref && senderPref.disappearing !== 'OFF') {
        const ttlMs = senderPref.disappearing === '24H' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
        expiresAt = new Date(Date.now() + ttlMs)
      }
      const msg = await db.message.create({
        data: {
          senderId: userId,
          receiverId: data.receiverId,
          content: data.content,
          type: data.type || 'text',
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          status: 'SENT',
          expiresAt,
          replyToId: data.replyToId || null,
        },
      })
      ack?.({ ok: true, message: msg, tempId: data.tempId })
      io.to(room(data.receiverId)).emit('message:new', msg)
      io.to(room(userId)).emit('message:new', msg)
      // if recipient online -> delivered
      if (isOnline(data.receiverId)) {
        await db.message.update({ where: { id: msg.id }, data: { status: 'DELIVERED' } }).catch(() => {})
        io.to(room(userId)).emit('message:status', { id: msg.id, status: 'DELIVERED' })
      }
    } catch (e: any) {
      ack?.({ ok: false, error: e?.message })
    }
  })

  socket.on('message:seen', async (data: { messageId: string }) => {
    if (!userId) return
    try {
      const msg = await db.message.findUnique({ where: { id: data.messageId } })
      if (!msg || msg.receiverId !== userId) return
      if (msg.status !== 'SEEN') {
        await db.message.update({
          where: { id: msg.id },
          data: { status: 'SEEN', seenAt: new Date() },
        })
      }
      io.to(room(msg.senderId)).emit('message:status', { id: msg.id, status: 'SEEN' })
    } catch {}
  })

  socket.on('typing', (data: { receiverId: string; isTyping: boolean }) => {
    if (!userId) return
    io.to(room(data.receiverId)).emit('typing:indicator', { userId, isTyping: data.isTyping })
  })

  // ---------- Reactions ----------
  socket.on('reaction:add', async (data: { messageId: string; emoji: string }, ack?: (r: any) => void) => {
    if (!userId) return ack?.({ ok: false, error: 'unauth' })
    try {
      const msg = await db.message.findUnique({ where: { id: data.messageId } })
      if (!msg) return ack?.({ ok: false, error: 'message not found' })
      // validate participation: sender, receiver, or group member
      const isParticipant =
        msg.senderId === userId ||
        msg.receiverId === userId ||
        (msg.groupId ? !!(await db.groupMember.findUnique({ where: { groupId_userId: { groupId: msg.groupId, userId } } })) : false)
      if (!isParticipant) return ack?.({ ok: false, error: 'forbidden' })
      const emoji = String(data.emoji || '').slice(0, 8)
      if (!emoji) return ack?.({ ok: false, error: 'no emoji' })
      await db.messageReaction.upsert({
        where: { messageId_userId_emoji: { messageId: data.messageId, userId, emoji } },
        update: {},
        create: { messageId: data.messageId, userId, emoji },
      })
      ack?.({ ok: true })
      const payload = { messageId: data.messageId, userId, emoji, action: 'add' as const }
      // notify sender + receiver (or group members)
      io.to(room(msg.senderId)).emit('reaction:update', payload)
      if (msg.receiverId) io.to(room(msg.receiverId)).emit('reaction:update', payload)
      if (msg.groupId) {
        const members = await db.groupMember.findMany({ where: { groupId: msg.groupId } })
        for (const m of members) io.to(room(m.userId)).emit('reaction:update', payload)
      }
    } catch (e: any) {
      ack?.({ ok: false, error: e?.message })
    }
  })

  socket.on('reaction:remove', async (data: { messageId: string; emoji: string }, ack?: (r: any) => void) => {
    if (!userId) return ack?.({ ok: false, error: 'unauth' })
    try {
      const msg = await db.message.findUnique({ where: { id: data.messageId } })
      if (!msg) return ack?.({ ok: false, error: 'message not found' })
      const emoji = String(data.emoji || '').slice(0, 8)
      await db.messageReaction.deleteMany({ where: { messageId: data.messageId, userId, emoji } })
      ack?.({ ok: true })
      const payload = { messageId: data.messageId, userId, emoji, action: 'remove' as const }
      io.to(room(msg.senderId)).emit('reaction:update', payload)
      if (msg.receiverId) io.to(room(msg.receiverId)).emit('reaction:update', payload)
      if (msg.groupId) {
        const members = await db.groupMember.findMany({ where: { groupId: msg.groupId } })
        for (const m of members) io.to(room(m.userId)).emit('reaction:update', payload)
      }
    } catch (e: any) {
      ack?.({ ok: false, error: e?.message })
    }
  })

  // ---------- Message delete (realtime propagation) ----------
  socket.on('message:delete', async (data: { messageId: string; scope: 'me' | 'everyone' }, ack?: (r: any) => void) => {
    if (!userId) return ack?.({ ok: false, error: 'unauth' })
    try {
      const msg = await db.message.findUnique({ where: { id: data.messageId } })
      if (!msg) return ack?.({ ok: false, error: 'not found' })
      if (data.scope === 'everyone') {
        if (msg.senderId !== userId) return ack?.({ ok: false, error: 'forbidden' })
        await db.message.update({
          where: { id: data.messageId },
          data: { deletedFor: 'everyone', content: '', fileUrl: null, fileName: null, fileSize: null, mimeType: null },
        })
        const payload = { messageId: data.messageId, scope: 'everyone' }
        io.to(room(msg.senderId)).emit('message:deleted', payload)
        if (msg.receiverId) io.to(room(msg.receiverId)).emit('message:deleted', payload)
        if (msg.groupId) {
          const members = await db.groupMember.findMany({ where: { groupId: msg.groupId } })
          for (const m of members) io.to(room(m.userId)).emit('message:deleted', payload)
        }
      } else {
        const existing = msg.deletedFor ? msg.deletedFor.split(',').filter(Boolean) : []
        if (!existing.includes(userId)) existing.push(userId)
        await db.message.update({ where: { id: data.messageId }, data: { deletedFor: existing.join(',') } })
      }
      ack?.({ ok: true })
    } catch (e: any) {
      ack?.({ ok: false, error: e?.message })
    }
  })

  // ---------- Message edit (realtime propagation) ----------
  socket.on('message:edit', async (data: { messageId: string; content: string }, ack?: (r: any) => void) => {
    if (!userId) return ack?.({ ok: false, error: 'unauth' })
    try {
      const msg = await db.message.findUnique({ where: { id: data.messageId } })
      if (!msg) return ack?.({ ok: false, error: 'not found' })
      if (msg.senderId !== userId) return ack?.({ ok: false, error: 'forbidden' })
      const ageMin = (Date.now() - msg.createdAt.getTime()) / 60000
      if (ageMin > 15) return ack?.({ ok: false, error: 'edit window expired' })
      const content = String(data.content || '').slice(0, 5000)
      if (!content) return ack?.({ ok: false, error: 'empty' })
      const updated = await db.message.update({
        where: { id: data.messageId },
        data: { content, edited: true, editedAt: new Date() },
      })
      const payload = {
        messageId: data.messageId,
        content: updated.content,
        editedAt: updated.editedAt?.toISOString(),
      }
      io.to(room(msg.senderId)).emit('message:edited', payload)
      if (msg.receiverId) io.to(room(msg.receiverId)).emit('message:edited', payload)
      if (msg.groupId) {
        const members = await db.groupMember.findMany({ where: { groupId: msg.groupId } })
        for (const m of members) io.to(room(m.userId)).emit('message:edited', payload)
      }
      ack?.({ ok: true })
    } catch (e: any) {
      ack?.({ ok: false, error: e?.message })
    }
  })

  // ---------- Group typing (sender-aware) ----------
  socket.on('group:typing', async (data: { groupId: string; isTyping: boolean }, ack?: (r: any) => void) => {
    if (!userId) return ack?.({ ok: false, error: 'unauth' })
    try {
      const membership = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: data.groupId, userId } },
      }).catch(() => null)
      if (!membership) return ack?.({ ok: false, error: 'not a member' })
      const members = await db.groupMember.findMany({ where: { groupId: data.groupId } })
      for (const m of members) {
        if (m.userId !== userId) {
          io.to(room(m.userId)).emit('group:typing:indicator', { groupId: data.groupId, userId, isTyping: data.isTyping })
        }
      }
      ack?.({ ok: true })
    } catch (e: any) {
      ack?.({ ok: false, error: e?.message })
    }
  })

  socket.on('group:message:send', async (data: GroupSendPayload, ack?: (r: any) => void) => {
    if (!userId) return ack?.({ ok: false, error: 'unauth' })
    try {
      const membership = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: data.groupId, userId } },
      })
      if (!membership) {
        ack?.({ ok: false, error: 'not a member' })
        return
      }
      const msg = await db.message.create({
        data: {
          senderId: userId,
          groupId: data.groupId,
          content: data.content,
          type: data.type || 'text',
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          status: 'SENT',
          replyToId: data.replyToId || null,
        },
        include: { sender: true },
      })
      ack?.({ ok: true, message: msg, tempId: data.tempId })
      const members = await db.groupMember.findMany({ where: { groupId: data.groupId } })
      for (const m of members) {
        io.to(room(m.userId)).emit('group:message:new', msg)
      }
    } catch (e: any) {
      ack?.({ ok: false, error: e?.message })
    }
  })

  // ---------- Call signaling (hardened round 13) ----------
  // Tracks active calls per user for busy detection + authorization.
  // All signaling validates that the sender is authenticated + not blocked.
  const activeCalls = new Map<string, { callId: string; peerId: string; role: 'caller' | 'receiver' }>()

  const forward = (targetUserId: string, event: string, payload: any) => {
    io.to(room(targetUserId)).emit(event, { ...payload, from: userId })
  }

  // Rate limit: max 5 call initiations per 10 seconds per user
  const callRateMap = new Map<string, number[]>()
  function checkCallRate(uid: string): boolean {
    const now = Date.now()
    const arr = (callRateMap.get(uid) || []).filter(t => now - t < 10000)
    arr.push(now)
    callRateMap.set(uid, arr)
    return arr.length <= 5
  }

  // Helper: validate call participation (not blocked)
  async function canCall(callerId: string, receiverId: string): Promise<{ ok: boolean; reason?: string }> {
    if (callerId === receiverId) return { ok: false, reason: 'cannot call yourself' }
    const blocked = await db.friendship.findFirst({
      where: {
        status: 'BLOCKED',
        OR: [
          { requesterId: callerId, receiverId: receiverId },
          { requesterId: receiverId, receiverId: callerId },
        ],
      },
    })
    if (blocked) return { ok: false, reason: 'blocked' }
    // Check receiver's call permission
    const receiverProfile = await db.profile.findUnique({ where: { userId: receiverId } })
    if (receiverProfile?.callPermission === 'FRIENDS') {
      const fr = await db.friendship.findFirst({
        where: { status: 'ACCEPTED', OR: [{ requesterId: callerId, receiverId: receiverId }, { requesterId: receiverId, receiverId: callerId }] },
      })
      if (!fr) return { ok: false, reason: 'not friends' }
    }
    return { ok: true }
  }

  // call:invite — caller initiates a call (before SDP offer)
  socket.on('call:invite', async (data: { targetUserId: string; type: string; callId: string }, ack?: (r: any) => void) => {
    if (!userId) return ack?.({ ok: false, error: 'unauth' })
    if (!checkCallRate(userId)) return ack?.({ ok: false, error: 'rate_limited' })
    const { targetUserId, type, callId } = data
    if (!targetUserId || !callId) return ack?.({ ok: false, error: 'missing fields' })
    // Authorization
    const check = await canCall(userId, targetUserId)
    if (!check.ok) return ack?.({ ok: false, error: check.reason })
    // Busy check — if receiver is already in a call
    if (activeCalls.has(targetUserId)) {
      forward(targetUserId, 'call:busy', { callId, callerId: userId })
      ack?.({ ok: false, error: 'busy' })
      return
    }
    // Check if receiver is online
    if (!isOnline(targetUserId)) {
      ack?.({ ok: false, error: 'unavailable' })
      return
    }
    // Record active call
    activeCalls.set(userId, { callId, peerId: targetUserId, role: 'caller' })
    activeCalls.set(targetUserId, { callId, peerId: userId, role: 'receiver' })
    // Forward invite to receiver
    forward(targetUserId, 'call:incoming', { callerId: userId, type, callId })
    ack?.({ ok: true })
    // Set 30s timeout — if not answered, auto-cancel
    setTimeout(() => {
      if (activeCalls.has(userId) && activeCalls.get(userId)?.callId === callId) {
        forward(userId, 'call:timeout', { callId })
        forward(targetUserId, 'call:timeout', { callId })
        activeCalls.delete(userId)
        activeCalls.delete(targetUserId)
      }
    }, 30000)
  })

  // call:ringing — receiver's device is ringing
  socket.on('call:ringing', (data: { targetUserId: string; callId: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:ringing', { callId: data.callId })
  })

  // call:accepted — receiver accepted (will send answer next)
  socket.on('call:accepted', (data: { targetUserId: string; callId: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:accepted', { callId: data.callId })
  })

  // call:rejected — receiver rejected
  socket.on('call:rejected', (data: { targetUserId: string; callId: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:ended', { reason: 'declined', by: userId, callId: data.callId })
    activeCalls.delete(userId)
    activeCalls.delete(data.targetUserId)
  })

  // call:offer — caller sends SDP offer (after invite was acked)
  socket.on('call:offer', (data: { targetUserId: string; type: string; sdp: string; callId?: string }) => {
    if (!userId) return
    // Authorization: must have an active call with this peer
    const active = activeCalls.get(userId)
    if (active && active.peerId !== data.targetUserId) return // mismatch — reject
    forward(data.targetUserId, 'call:incoming', {
      callerId: userId,
      type: data.type,
      sdp: data.sdp,
      callId: data.callId,
    })
  })

  // call:answer — receiver sends SDP answer
  socket.on('call:answer', (data: { targetUserId: string; sdp: string; callId?: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:sdp', { kind: 'answer', sdp: data.sdp, callId: data.callId })
  })

  // call:ice — ICE candidate exchange
  socket.on('call:ice', (data: { targetUserId: string; candidate: any; callId?: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:ice-candidate', { candidate: data.candidate, callId: data.callId })
  })

  // call:connected — ICE connected (call is live)
  socket.on('call:connected', (data: { targetUserId: string; callId: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:connected', { callId: data.callId })
  })

  // call:reconnecting — ICE is reconnecting
  socket.on('call:reconnecting', (data: { targetUserId: string; callId: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:reconnecting', { callId: data.callId })
  })

  // call:reconnected — ICE reconnected
  socket.on('call:reconnected', (data: { targetUserId: string; callId: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:reconnected', { callId: data.callId })
  })

  // call:failed — ICE failed
  socket.on('call:failed', (data: { targetUserId: string; callId: string; reason?: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:ended', { reason: 'failed', by: userId, callId: data.callId, failureReason: data.reason })
    activeCalls.delete(userId)
    activeCalls.delete(data.targetUserId)
  })

  // call:cancelled — caller cancelled before answer
  socket.on('call:cancelled', (data: { targetUserId: string; callId: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:ended', { reason: 'cancelled', by: userId, callId: data.callId })
    activeCalls.delete(userId)
    activeCalls.delete(data.targetUserId)
  })

  // call:end — either party ends the call (legacy + new)
  socket.on('call:end', (data: { targetUserId: string; callId?: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:ended', { reason: 'ended', by: userId, callId: data.callId })
    activeCalls.delete(userId)
    activeCalls.delete(data.targetUserId)
  })

  // Legacy: call:reject (preserved for backward compat with existing CallOverlay)
  socket.on('call:reject', (data: { targetUserId: string }) => {
    if (!userId) return
    forward(data.targetUserId, 'call:ended', { reason: 'declined', by: userId })
    activeCalls.delete(userId)
    activeCalls.delete(data.targetUserId)
  })

  socket.on('disconnect', async () => {
    if (userId) {
      setOffline(userId, socket.id)
      // Clean up active calls — notify peer that this user disconnected
      const active = activeCalls.get(userId)
      if (active) {
        forward(active.peerId, 'call:ended', { reason: 'disconnected', by: userId, callId: active.callId })
        activeCalls.delete(userId)
        activeCalls.delete(active.peerId)
      }
      if (!isOnline(userId)) {
        io.emit('presence', { userId, online: false })
        await updateLastSeen(userId)
      }
    }
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`FriendConnect realtime service running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})
