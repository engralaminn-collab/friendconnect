import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

// GET friend suggestions ranked by mutual friends count
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)

    // my friends
    const myFriendships = await db.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: me.id }, { receiverId: me.id }] },
    })
    const myFriendIds = new Set(myFriendships.map((f) => (f.requesterId === me.id ? f.receiverId : f.requesterId)))

    // all relationships (to exclude pending/blocked)
    const allMyRelations = await db.friendship.findMany({
      where: { OR: [{ requesterId: me.id }, { receiverId: me.id }] },
    })
    const excluded = new Set<string>([me.id])
    for (const r of allMyRelations) {
      excluded.add(r.requesterId === me.id ? r.receiverId : r.requesterId)
    }

    // friends-of-friends: collect candidates from my friends' friend lists
    const candidateCounts = new Map<string, number>()
    for (const fid of myFriendIds) {
      const fofs = await db.friendship.findMany({
        where: { status: 'ACCEPTED', OR: [{ requesterId: fid }, { receiverId: fid }] },
      })
      for (const f of fofs) {
        const candidate = f.requesterId === fid ? f.receiverId : f.requesterId
        if (excluded.has(candidate)) continue
        candidateCounts.set(candidate, (candidateCounts.get(candidate) || 0) + 1)
      }
    }

    // if not enough candidates, add some random non-friends
    if (candidateCounts.size < 5) {
      const others = await db.user.findMany({
        where: { id: { notIn: Array.from(excluded).concat(Array.from(candidateCounts.keys())) } },
        take: 10,
        include: { profile: true },
      })
      for (const u of others) candidateCounts.set(u.id, 0)
    }

    const candidateIds = Array.from(candidateCounts.keys()).slice(0, 20)
    const users = await db.user.findMany({
      where: { id: { in: candidateIds } },
      include: { profile: true },
    })

    const suggestions = users
      .map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        photoUrl: u.profile?.photoUrl ?? null,
        bio: u.profile?.bio ?? null,
        location: u.profile?.location ?? null,
        mutualFriends: candidateCounts.get(u.id) || 0,
      }))
      .sort((a, b) => b.mutualFriends - a.mutualFriends)
      .slice(0, 10)

    return json({ suggestions })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
