import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)

    // friends
    const friendships = await db.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: me.id }, { receiverId: me.id }] },
      include: { requester: { include: { profile: true } }, receiver: { include: { profile: true } } },
    })
    const friendMap = new Map<string, { id: string; username: string; name: string; photoUrl: string | null }>()
    for (const f of friendships) {
      const other = f.requesterId === me.id ? f.receiver : f.requester
      friendMap.set(other.id, {
        id: other.id,
        username: other.username,
        name: other.name,
        photoUrl: other.profile?.photoUrl ?? null,
      })
    }

    // last message per peer
    const msgs = await db.message.findMany({
      where: {
        OR: [{ senderId: me.id }, { receiverId: me.id }],
        groupId: null,
      },
      orderBy: { createdAt: 'desc' },
    })
    const lastByPeer = new Map<string, (typeof msgs)[number]>()
    const unreadByPeer = new Map<string, number>()
    for (const m of msgs) {
      const peer = m.senderId === me.id ? m.receiverId! : m.senderId
      if (!lastByPeer.has(peer)) lastByPeer.set(peer, m)
      if (m.receiverId === me.id && m.status !== 'SEEN') {
        unreadByPeer.set(peer, (unreadByPeer.get(peer) || 0) + 1)
      }
    }

    // chat preferences (pin/mute/disappearing/wallpaper/archived)
    const prefs = await db.chatPreference.findMany({ where: { userId: me.id } })
    const prefMap = new Map<string, { pinned: boolean; muted: boolean; disappearing: string; wallpaper: string | null; archived: boolean; folder: string | null }>()
    for (const p of prefs) prefMap.set(p.peerId, { pinned: p.pinned, muted: p.muted, disappearing: p.disappearing, wallpaper: p.wallpaper, archived: p.archived, folder: p.folder })

    const conversations = Array.from(new Set([...friendMap.keys(), ...lastByPeer.keys()])).map((peerId) => {
      const friend = friendMap.get(peerId)
      const last = lastByPeer.get(peerId)
      const pref = prefMap.get(peerId)
      return {
        id: peerId,
        username: friend?.username ?? 'user',
        name: friend?.name ?? 'User',
        photoUrl: friend?.photoUrl ?? null,
        lastMessage: last
          ? {
              content: last.content,
              type: last.type,
              senderId: last.senderId,
              createdAt: last.createdAt.toISOString(),
              status: last.status,
            }
          : null,
        unread: unreadByPeer.get(peerId) || 0,
        pinned: pref?.pinned ?? false,
        muted: pref?.muted ?? false,
        disappearing: pref?.disappearing ?? 'OFF',
        wallpaper: pref?.wallpaper ?? null,
        archived: pref?.archived ?? false,
        folder: pref?.folder ?? null,
      }
    })
    conversations.sort((a, b) => {
      // pinned always first
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0
      const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0
      return bt - at
    })

    // separate active vs archived
    const active = conversations.filter((c) => !c.archived)
    const archived = conversations.filter((c) => c.archived)

    return json({ conversations: active, archived })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
