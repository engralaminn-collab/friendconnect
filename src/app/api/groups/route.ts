import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function GET() {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const memberships = await db.groupMember.findMany({
      where: { userId: me.id },
      include: { group: { include: { members: { include: { user: { include: { profile: true } } } } } } },
    })
    return json({
      groups: memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description,
        photoUrl: m.group.photoUrl,
        role: m.role,
        memberCount: m.group.members.length,
        createdAt: m.group.createdAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const body = await req.json()
    const name = String(body.name || '').trim()
    const description = body.description ? String(body.description) : null
    const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds.filter((x: any) => typeof x === 'string') : []
    if (!name) return errorJson('Group name required', 400)
    const group = await db.group.create({
      data: {
        name,
        description,
        createdBy: me.id,
        photoUrl: body.photoUrl ? String(body.photoUrl) : null,
      },
    })
    await db.groupMember.create({ data: { groupId: group.id, userId: me.id, role: 'OWNER' } })
    for (const uid of memberIds) {
      if (uid === me.id) continue
      await db.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId: uid } },
        update: {},
        create: { groupId: group.id, userId: uid, role: 'MEMBER' },
      })
      await db.notification.create({
        data: {
          userId: uid,
          type: 'group',
          title: 'Added to group',
          body: `${me.name} added you to "${name}"`,
          data: JSON.stringify({ groupId: group.id, name }),
        },
      })
    }
    return json({ group: { id: group.id, name: group.name } })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
