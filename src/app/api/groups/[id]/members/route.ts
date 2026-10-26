import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const body = await req.json()
    const targetId = String(body.userId || '')
    if (!targetId) return errorJson('userId required', 400)
    const membership = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: me.id } },
    })
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return errorJson('Only owner/admin can add members', 403)
    }
    await db.groupMember.upsert({
      where: { groupId_userId: { groupId: id, userId: targetId } },
      update: {},
      create: { groupId: id, userId: targetId, role: 'MEMBER' },
    })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const { id } = await params
    const url = new URL(req.url)
    const targetId = url.searchParams.get('userId') || me.id
    await db.groupMember.deleteMany({ where: { groupId: id, userId: targetId } })
    return json({ ok: true })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
