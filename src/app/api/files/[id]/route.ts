import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const UPLOAD_DIR = '/home/z/my-project/upload'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const file = await db.file.findFirst({
    where: { OR: [{ id }, { url: `/api/files/${id}` }] },
  })
  if (!file) return new Response('Not found', { status: 404 })
  // try stored file by id prefix
  const candidates = existsSync(join(UPLOAD_DIR, `${id}.bin`)) ? [`${id}.bin`] : []
  if (candidates.length === 0) {
    // find any file starting with id.
    const { readdirSync } = await import('fs')
    const match = readdirSync(UPLOAD_DIR).find((f) => f.startsWith(id + '.'))
    if (!match) return new Response('File missing', { status: 404 })
    const buf = readFileSync(join(UPLOAD_DIR, match))
    return new Response(buf, {
      headers: {
        'content-type': file.mimeType,
        'content-disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
        'cache-control': 'private, max-age=3600',
      },
    })
  }
  const buf = readFileSync(join(UPLOAD_DIR, candidates[0]))
  return new Response(buf, {
    headers: {
      'content-type': file.mimeType,
      'content-disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
      'cache-control': 'private, max-age=3600',
    },
  })
}
