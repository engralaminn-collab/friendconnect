import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'
import {
  MAX_SEARCH_RESULTS,
  MIN_SEARCH_LENGTH,
  isSearchLookupAllowed,
  normalizeSearchTerm,
} from '@/server/privacy/visibility'

/**
 * GET /api/users/search?q=<exact email or handle>
 *
 * Privacy model: FriendConnect has no member directory. People are invisible
 * until they accept a connection request, so this endpoint is an
 * "I already know you" lookup only:
 *
 *  - the query must be an exact email address or an exact handle
 *  - free-text name matching is rejected (it would allow enumeration)
 *  - results are capped and never include the caller
 *
 * The response keeps both keys the two clients in this repo read (`users` for
 * the FC shell, `results` for the module workspace) and never exposes email
 * addresses of people the caller is not already connected to.
 */
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)

    const raw = req.nextUrl.searchParams.get('q') || ''
    const term = normalizeSearchTerm(raw)

    if (term.length < MIN_SEARCH_LENGTH) {
      return json({ users: [], results: [], reason: 'query_too_short' })
    }
    if (!isSearchLookupAllowed(term)) {
      // Not an exact email and not a handle → refuse instead of guessing.
      return json({ users: [], results: [], reason: 'exact_email_or_handle_only' })
    }

    const matched = await db.user.findMany({
      where: {
        id: { not: me.id },
        OR: [{ email: term }, { username: term }],
      },
      take: MAX_SEARCH_RESULTS,
      include: { profile: true },
    })

    if (matched.length === 0) return json({ users: [], results: [] })

    const ids = matched.map((u) => u.id)
    const friendships = await db.friendship.findMany({
      where: {
        OR: [
          { requesterId: me.id, receiverId: { in: ids } },
          { receiverId: me.id, requesterId: { in: ids } },
        ],
      },
    })

    const relationFor = (userId: string, blockedByMe: boolean) => {
      const f = friendships.find(
        (x) =>
          (x.requesterId === me.id && x.receiverId === userId) ||
          (x.receiverId === me.id && x.requesterId === userId),
      )
      if (!f) return 'stranger'
      if (f.status === 'ACCEPTED') return 'friend'
      if (f.status === 'BLOCKED') return blockedByMe ? 'blocked_by_me' : 'blocked_me'
      if (f.status === 'PENDING') {
        return f.requesterId === me.id ? 'request_sent' : 'request_received'
      }
      return 'stranger'
    }

    const users = matched.map((u) => {
      const relation = relationFor(
        u.id,
        friendships.some(
          (x) => x.status === 'BLOCKED' && x.requesterId === me.id && x.receiverId === u.id,
        ),
      )
      const visible = relation !== 'stranger'
      return {
        id: u.id,
        username: u.username,
        name: visible ? u.name : u.username,
        photoUrl: visible ? u.profile?.photoUrl ?? null : null,
        bio: visible ? u.profile?.bio ?? null : null,
        location: visible ? u.profile?.location ?? null : null,
        relation,
      }
    })

    return json({ users, results: users })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
