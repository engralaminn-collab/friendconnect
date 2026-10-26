/**
 * Storage driver abstraction.
 *
 * - `LocalStorageDriver`: writes bytes under MEDIA_LOCAL_DIR, which lives
 *   outside the Next.js public directory and is never served statically.
 * - `S3StorageDriver`: private S3-compatible bucket (AWS/MinIO/R2/B2) with
 *   presigned download URLs; credentials never reach the browser.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve, normalize } from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";

export interface PutOptions {
  mime: string;
  objectKey: string;
}

export interface StorageDriver {
  readonly name: "local" | "s3";
  put(buffer: Buffer, opts: PutOptions): Promise<{ bucket: string | null; objectKey: string }>;
  get(objectKey: string): Promise<Buffer>;
  delete(objectKey: string): Promise<void>;
  /** Returns a presigned URL for S3 or null for the local driver. */
  presignedGetUrl(objectKey: string): Promise<string | null>;
}

export class LocalStorageDriver implements StorageDriver {
  readonly name = "local" as const;
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = resolve(rootDir);
  }

  private safePath(objectKey: string): string {
    const target = normalize(join(this.root, objectKey));
    if (!target.startsWith(this.root)) {
      throw new Error("Invalid object key: path traversal detected");
    }
    return target;
  }

  async put(buffer: Buffer, opts: PutOptions) {
    const path = this.safePath(opts.objectKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer, { mode: 0o600 });
    return { bucket: null, objectKey: opts.objectKey };
  }

  async get(objectKey: string): Promise<Buffer> {
    return readFile(this.safePath(objectKey));
  }

  async delete(objectKey: string): Promise<void> {
    await unlink(this.safePath(objectKey)).catch(() => undefined);
  }

  async presignedGetUrl(): Promise<string | null> {
    return null;
  }
}

export class S3StorageDriver implements StorageDriver {
  readonly name = "s3" as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async put(buffer: Buffer, opts: PutOptions) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: opts.objectKey,
        Body: buffer,
        ContentType: opts.mime,
      }),
    );
    return { bucket: this.bucket, objectKey: opts.objectKey };
  }

  async get(objectKey: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty S3 object body");
    return Buffer.from(bytes);
  }

  async delete(objectKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }

  async presignedGetUrl(objectKey: string): Promise<string | null> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: env.S3_PRESIGN_TTL_SEC },
    );
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  driver =
    env.MEDIA_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver(env.MEDIA_LOCAL_DIR);
  return driver;
}

export function buildObjectKey(kind: string, ext: string): string {
  const d = new Date();
  const yyyymm = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const random = createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex");
  return `${kind}/${yyyymm}/${random}.${ext}`;
}
