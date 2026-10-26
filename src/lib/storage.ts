// Storage provider abstraction (round 12) — local + S3-compatible.
// If no S3 config is set, uses local filesystem (default).
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync, statSync } from 'fs'
import { join } from 'path'
import { logger } from '@/lib/logger'

export interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<{ url: string; size: number }>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getUrl(key: string): string
  exists(key: string): Promise<boolean>
}

class LocalStorageProvider implements StorageProvider {
  private dir: string
  constructor(dir: string = '/home/z/my-project/upload') {
    this.dir = dir
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
  async upload(key: string, data: Buffer, _mimeType: string) {
    const path = join(this.dir, key)
    writeFileSync(path, data)
    return { url: `/api/files/${key.split('.')[0]}`, size: data.length }
  }
  async download(key: string) {
    // key may be a full filename or just the id prefix
    const { readdirSync } = await import('fs')
    const match = readdirSync(this.dir).find((f: string) => f.startsWith(key.split('.')[0]))
    if (!match) throw new Error('File not found')
    return readFileSync(join(this.dir, match))
  }
  async delete(key: string) {
    try { unlinkSync(join(this.dir, key)) } catch {}
  }
  getUrl(key: string) {
    return `/api/files/${key.split('.')[0]}`
  }
  async exists(key: string) {
    return existsSync(join(this.dir, key))
  }
}

class S3StorageProvider implements StorageProvider {
  private config: { endpoint: string; bucket: string; accessKey: string; secretKey: string; region: string }
  constructor(config: typeof S3StorageProvider.prototype.config) {
    this.config = config
  }
  async upload(key: string, data: Buffer, mimeType: string) {
    // Uses the AWS SDK v3 S3 client (optional dependency)
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3').catch(() => ({ S3Client: null, PutObjectCommand: null }))
    if (!S3Client) throw new Error('@aws-sdk/client-s3 not installed')
    const client = new S3Client({
      endpoint: this.config.endpoint || undefined,
      region: this.config.region,
      credentials: { accessKeyId: this.config.accessKey, secretAccessKey: this.config.secretKey },
      forcePathStyle: !!this.config.endpoint, // MinIO needs path-style
    })
    await client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: data, ContentType: mimeType }))
    const url = this.config.endpoint
      ? `${this.config.endpoint}/${this.config.bucket}/${key}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`
    return { url, size: data.length }
  }
  async download(key: string) {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3').catch(() => ({ S3Client: null, GetObjectCommand: null }))
    if (!S3Client) throw new Error('@aws-sdk/client-s3 not installed')
    const client = new S3Client({ region: this.config.region, credentials: { accessKeyId: this.config.accessKey, secretAccessKey: this.config.secretKey } })
    const res = await client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }))
    return Buffer.from(await res.Body!.transformToByteArray())
  }
  async delete(key: string) {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3').catch(() => ({ S3Client: null, DeleteObjectCommand: null }))
    if (!S3Client) return
    const client = new S3Client({ region: this.config.region, credentials: { accessKeyId: this.config.accessKey, secretAccessKey: this.config.secretKey } })
    await client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }))
  }
  getUrl(key: string) {
    return this.config.endpoint
      ? `${this.config.endpoint}/${this.config.bucket}/${key}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`
  }
  async exists(key: string) {
    try { await this.download(key); return true } catch { return false }
  }
}

let _provider: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider
  const provider = process.env.STORAGE_PROVIDER || 'local'
  if (provider === 's3' && process.env.S3_BUCKET) {
    _provider = new S3StorageProvider({
      endpoint: process.env.S3_ENDPOINT || '',
      bucket: process.env.S3_BUCKET,
      accessKey: process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.S3_SECRET_KEY || '',
      region: process.env.S3_REGION || 'us-east-1',
    })
    logger.info('storage provider: s3', { bucket: process.env.S3_BUCKET })
  } else {
    _provider = new LocalStorageProvider()
    logger.info('storage provider: local')
  }
  return _provider
}

export function isStorageS3(): boolean {
  return process.env.STORAGE_PROVIDER === 's3' && !!process.env.S3_BUCKET
}
