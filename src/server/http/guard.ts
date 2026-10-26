/**
 * Request-level security helpers: same-origin enforcement (CSRF defence for
 * cookie auth), client IP extraction, validated body/query parsing.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "../config/env";
import { badRequest, forbidden } from "./errors";

export function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 45);
  return req.headers.get("x-real-ip")?.slice(0, 45) ?? null;
}

function origins(): Set<string> {
  const list = [env.APP_URL, ...env.ALLOWED_ORIGINS, ...env.WEBSOCKET_CORS_ORIGINS]
    .filter(Boolean)
    .map((o) => o.replace(/\/$/, ""));
  return new Set(list);
}

/**
 * SameSite=Lax already prevents cross-site cookie attachment on unsafe
 * methods; this defence-in-depth check rejects mismatched Origin/Host headers
 * on state-changing requests.
 */
export function assertSameOrigin(req: NextRequest): void {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return;
  const origin = req.headers.get("origin");
  if (!origin) {
    // Non-browser clients (tests, curl) may omit Origin; require the custom
    // request header so plain cross-origin forms cannot forge the call.
    if (req.headers.get("x-fc-request")) return;
    throw forbidden("Missing Origin header");
  }
  if (!origins().has(origin.replace(/\/$/, ""))) {
    throw forbidden(`Origin ${origin} is not allowed`);
  }
}

export async function parseJson<Out, In = unknown>(
  req: NextRequest,
  schema: z.ZodType<Out, z.ZodTypeDef, In>,
): Promise<Out> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw result.error;
  return result.data;
}

export function parseQuery<Out, In = unknown>(
  req: NextRequest,
  schema: z.ZodType<Out, z.ZodTypeDef, In>,
): Out {
  const obj: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  const result = schema.safeParse(obj);
  if (!result.success) throw result.error;
  return result.data;
}

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function userAgent(req: NextRequest): string | null {
  return req.headers.get("user-agent");
}
