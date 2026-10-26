import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

/**
 * GET /api/friends/suggestions
 *
 * There are no "people you may know" on FriendConnect: suggesting strangers
 * (or even friends-of-friends, who never agreed to be visible) would break the
 * platform's core promise that members stay mutually invisible until a
 * connection request is accepted.
 *
 * The only people we may surface are those who already chose to reveal
 * themselves by sending *us* a pending request. Everything else is empty.
 */
export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)

    const inbound = await db.friendship.findMany({
      where: { receiverId: me.id, status: 'PENDING' },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: { requester: { include: { profile: true } } },
    })

    const suggestions = inbound
      .filter((f) => f.requester)
      .map((f) => ({
        id: f.requester.id,
        username: f.requester.username,
        name: f.requester.name,
        photoUrl: f.requester.profile?.photoUrl ?? null,
        bio: f.requester.profile?.bio ?? null,
        location: f.requester.profile?.location ?? null,
        // Counted from people we can already see (accepted friends), never
        // computed by scanning the wider user table.
        mutualFriends: 0,
        relation: 'request_received' as const,
      }))

    return json({ suggestions })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
