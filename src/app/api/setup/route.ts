import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { ensureProfile, json, errorJson } from '@/lib/serialize'

const DEMO = [
  { name: 'Aria Ahmed', username: 'aria', email: 'aria@friendconnect.app', password: 'password123', bio: 'Reconnecting with old classmates.', location: 'Dhaka, Bangladesh' },
  { name: 'Bilal Khan', username: 'bilal', email: 'bilal@friendconnect.app', password: 'password123', bio: 'Traveler. Coffee enthusiast.', location: 'Chittagong, Bangladesh' },
  { name: 'Carla Gomez', username: 'carla', email: 'carla@friendconnect.app', password: 'password123', bio: 'Designer & music lover.', location: 'Madrid, Spain' },
]

export async function POST() {
  try {
    const created: { username: string; email: string; password: string; name: string }[] = []
    const ids: Record<string, string> = {}
    for (const d of DEMO) {
      let user = await db.user.findUnique({ where: { email: d.email } })
      if (!user) {
        user = await db.user.create({
          data: { email: d.email, username: d.username, name: d.name, passwordHash: hashPassword(d.password), emailVerified: true },
        })
        await ensureProfile(user.id)
        await db.profile.update({
          where: { userId: user.id },
          data: { bio: d.bio, location: d.location },
        })
      }
      // make aria an admin + verified profile for the admin dashboard
      if (d.username === 'aria') {
        await db.user.update({ where: { id: user.id }, data: { role: 'admin', emailVerified: true } })
        await db.profile.updateMany({ where: { userId: user.id }, data: { verified: 'verified' } })
      }
      ids[d.username] = user.id
      created.push({ username: d.username, email: d.email, password: d.password, name: d.name })
    }
    // make aria <-> bilal friends, aria <-> carla friends
    const link = async (a: string, b: string) => {
      const aId = ids[a], bId = ids[b]
      const existing = await db.friendship.findFirst({
        where: { OR: [{ requesterId: aId, receiverId: bId }, { requesterId: bId, receiverId: aId }] },
      })
      if (!existing) {
        await db.friendship.create({ data: { requesterId: aId, receiverId: bId, status: 'ACCEPTED' } })
      }
    }
    await link('aria', 'bilal')
    await link('aria', 'carla')

    // a couple of seed messages between aria and bilal
    const existingMsg = await db.message.findFirst({ where: { senderId: ids['aria'], receiverId: ids['bilal'] } })
    if (!existingMsg) {
      await db.message.create({ data: { senderId: ids['aria'], receiverId: ids['bilal'], content: 'Hey Bilal! Long time no see 🎉', type: 'text', status: 'SEEN' } })
      await db.message.create({ data: { senderId: ids['bilal'], receiverId: ids['aria'], content: 'Aria! So good to hear from you. How have you been?', type: 'text', status: 'SEEN' } })
    }

    return json({ ok: true, accounts: created })
  } catch (e: any) {
    return errorJson(e?.message || 'Server error', 500)
  }
}
