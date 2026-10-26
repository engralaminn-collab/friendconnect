import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      include: { profile: true },
    })
    if (!user) return errorJson('User not found', 404)

    const friendship = await db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: me.id, receiverId: id },
          { requesterId: id, receiverId: me.id },
        ],
      },
    })
    const isFriend = friendship?.status === 'ACCEPTED'
    const isBlocked = friendship?.status === 'BLOCKED'
    const blockedByMe = isBlocked && friendship?.blockerId === me.id

    // visibility: PRIVATE -> only friends can view full profile
    const visibility = user.profile?.profileVisibility || 'PUBLIC'
    const canViewFull = visibility === 'PUBLIC' || isFriend || id === me.id

    const profile = user.profile
    return json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        photoUrl: profile?.photoUrl ?? null,
        photoFilter: profile?.photoFilter ?? null,
        verified: profile?.verified ?? 'unverified',
        bio: canViewFull ? profile?.bio ?? null : null,
        phone: canViewFull ? profile?.phone ?? null : null,
        location: canViewFull ? profile?.location ?? null : null,
        birthday: canViewFull ? profile?.birthday ?? null : null,
        education: canViewFull ? profile?.education ?? null : null,
        work: canViewFull ? profile?.work ?? null : null,
      },
      relation: {
        isFriend,
        isBlocked,
        blockedByMe,
        status: friendship?.status || 'NONE',
        incomingRequest: friendship?.status === 'PENDING' && friendship?.receiverId === me.id,
        outgoingRequest: friendship?.status === 'PENDING' && friendship?.requesterId === me.id,
      },
      canMessage: isFriend || profile?.messagePermission === 'PUBLIC',
      canCall: isFriend || profile?.callPermission === 'PUBLIC',
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
