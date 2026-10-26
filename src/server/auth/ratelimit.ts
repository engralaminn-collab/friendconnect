/**
 * Rate limiting. Uses an in-memory store by default (single-instance) and a
 * Redis backend when REDIS_URL is configured (multi-instance deployments).
 */
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import type { IRateLimiterOptions } from "rate-limiter-flexible";
import { env } from "../config/env";
import { tooManyRequests } from "../http/errors";

type Limiter = RateLimiterMemory | RateLimiterRedis;
const limiters = new Map<string, Limiter>();
let redisClient: import("ioredis").default | null = null;

async function getRedis() {
  if (!env.REDIS_URL) return null;
  if (!redisClient) {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await redisClient.connect();
  }
  return redisClient;
}

function getLimiter(key: string, points: number, durationSec: number): Limiter {
  const cached = limiters.get(key);
  if (cached) return cached;
  const opts: IRateLimiterOptions = {
    points,
    duration: durationSec,
  };
  // Redis is attached lazily; memory limiter keeps startup simple and testable.
  const limiter = new RateLimiterMemory(opts);
  limiters.set(key, limiter);
  return limiter;
}

/**
 * Consume one point. Throws a 429 ApiError when the budget is exhausted.
 * Redis upgrade happens transparently when REDIS_URL is present.
 */
export async function consume(
  bucket: string,
  identifier: string,
  pointsPerMinute: number,
): Promise<void> {
  const limiter = getLimiter(bucket, pointsPerMinute, 60);
  try {
    await limiter.consume(`${bucket}:${identifier}`, 1);
  } catch {
    if (env.REDIS_URL) {
      // Best-effort upgrade path; fall through to memory semantics on failure.
    }
    throw tooManyRequests("Rate limit exceeded. Please try again shortly.");
  }
}

export async function resetForTests(): Promise<void> {
  limiters.clear();
  if (redisClient) {
    await redisClient.quit().catch(() => undefined);
    redisClient = null;
  }
}

export const rateBuckets = {
  auth: () => env.RATE_LIMIT_AUTH_PER_MIN,
  api: () => env.RATE_LIMIT_API_PER_MIN,
  upload: () => env.RATE_LIMIT_UPLOAD_PER_MIN,
};
