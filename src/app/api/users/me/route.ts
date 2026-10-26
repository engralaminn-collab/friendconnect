import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { ensureProfile, errorJson, json } from '@/lib/serialize'

export async function PUT(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    await ensureProfile(me.id)

    // optional: update name/username
    const name = body.name !== undefined ? String(body.name).trim() : undefined
    const username = body.username !== undefined ? String(body.username).trim().toLowerCase() : undefined
    if (username && username !== me.username) {
      const clash = await db.user.findUnique({ where: { username } })
      if (clash) return errorJson('Username already taken', 409)
    }

    if (name || username) {
      await db.user.update({ where: { id: me.id }, data: { ...(name ? { name } : {}), ...(username ? { username } : {}) } })
    }

    const profileData: Record<string, string | null> = {}
    for (const key of ['photoUrl', 'bio', 'phone', 'location', 'birthday', 'education', 'work', 'profileVisibility', 'messagePermission', 'callPermission', 'photoFilter']) {
      if (body[key] !== undefined) {
        profileData[key] = body[key] === '' ? null : String(body[key])
      }
    }
    // boolean field handled separately
    if (typeof body.readReceipts === 'boolean') {
      profileData.readReceipts = body.readReceipts as unknown as string
    }
    if (Object.keys(profileData).length > 0) {
      await db.profile.update({ where: { userId: me.id }, data: profileData as any })
    }

    const updated = await db.user.findUnique({ where: { id: me.id }, include: { profile: true } })
    return json({
      user: {
        id: updated!.id,
        email: updated!.email,
        username: updated!.username,
        name: updated!.name,
        profile: updated!.profile
          ? {
              photoUrl: updated!.profile.photoUrl,
              bio: updated!.profile.bio,
              phone: updated!.profile.phone,
              location: updated!.profile.location,
              birthday: updated!.profile.birthday,
              education: updated!.profile.education,
              work: updated!.profile.work,
              profileVisibility: updated!.profile.profileVisibility,
              messagePermission: updated!.profile.messagePermission,
              callPermission: updated!.profile.callPermission,
              readReceipts: updated!.profile.readReceipts,
              photoFilter: updated!.profile.photoFilter,
              verified: updated!.profile.verified,
              lastSeen: updated!.profile.lastSeen?.toISOString(),
            }
          : null,
      },
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
