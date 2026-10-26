import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const group = await db.group.findUnique({
      where: { id },
      include: { members: { include: { user: { include: { profile: true } } } } },
    })
    if (!group) return errorJson('Group not found', 404)
    const isMember = group.members.some((m) => m.userId === me.id)
    return json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        photoUrl: group.photoUrl,
        createdAt: group.createdAt.toISOString(),
        isMember,
        members: group.members.map((m) => ({
          id: m.user.id,
          username: m.user.username,
          name: m.user.name,
          photoUrl: m.user.profile?.photoUrl ?? null,
          role: m.role,
        })),
      },
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
