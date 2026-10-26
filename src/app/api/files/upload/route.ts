import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { errorJson, json } from '@/lib/serialize'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'

const UPLOAD_DIR = '/home/z/my-project/upload'
const MAX_FILE_SIZE = 50 * 1024 * 1024
const BLOCKED_MIME = ['application/x-msdownload', 'application/x-executable', 'application/x-dosexec', 'application/x-sh', 'application/x-bat']
const BLOCKED_EXT = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.com', '.scr', '.vbs', '.js', '.jar']

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser()
    if (!me) return errorJson('Unauthorized', 401)
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return errorJson('No file provided', 400)
    if (file.size > MAX_FILE_SIZE) return errorJson('File too large (max 50MB)', 413)
    const mimeType = file.type || 'application/octet-stream'
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8)
    if (BLOCKED_MIME.includes(mimeType) || BLOCKED_EXT.includes('.' + ext)) return errorJson('File type not allowed', 415)
    const user = await db.user.findUnique({ where: { id: me.id }, select: { fileQuotaBytes: true, fileUsedBytes: true } })
    if (!user) return errorJson('User not found', 404)
    if (user.fileUsedBytes + file.size > user.fileQuotaBytes) return errorJson('Storage quota exceeded', 507)
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
    const id = randomBytes(12).toString('hex')
    const buf = Buffer.from(await file.arrayBuffer())
    if (mimeType.startsWith('image/') && mimeType !== 'image/gif') {
      try {
        const sharp = (await import('sharp')).default
        const optimized = await sharp(buf).resize(1920, 1920, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer()
        if (optimized.length < buf.length) {
          writeFileSync(join(UPLOAD_DIR, `${id}.jpg`), optimized)
          const fileRecord = await db.file.create({ data: { ownerId: me.id, name: file.name, mimeType: 'image/jpeg', size: optimized.length, url: `/api/files/${id}` } })
          await db.user.update({ where: { id: me.id }, data: { fileUsedBytes: { increment: optimized.length } } })
          return json({ file: { id, url: fileRecord.url, name: fileRecord.name, mimeType: 'image/jpeg', size: optimized.length } })
        }
      } catch (e: any) { logger.warn('image optimization skipped', { error: e?.message }) }
    }
    writeFileSync(join(UPLOAD_DIR, `${id}.${ext}`), buf)
    const fileRecord = await db.file.create({ data: { ownerId: me.id, name: file.name, mimeType, size: buf.length, url: `/api/files/${id}` } })
    await db.user.update({ where: { id: me.id }, data: { fileUsedBytes: { increment: buf.length } } })
    return json({ file: { id, url: fileRecord.url, name: fileRecord.name, mimeType, size: buf.length } })
  } catch (e: any) {
    logger.error('upload failed', { error: e?.message })
    return errorJson(e?.message || 'Server error', 500)
  }
}
