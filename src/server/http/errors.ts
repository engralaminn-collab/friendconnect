/**
 * Uniform API error handling. Internal details are never leaked to clients;
 * the real error is logged server-side with a correlation id.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  expose: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { details?: unknown; expose?: boolean },
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = options?.details;
    this.expose = options?.expose ?? status < 500;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "bad_request", message, { details });
export const unauthorized = (message = "Authentication required") =>
  new ApiError(401, "unauthorized", message);
export const forbidden = (message = "Forbidden") => new ApiError(403, "forbidden", message);
export const notFound = (message = "Resource not found") =>
  new ApiError(404, "not_found", message);
export const conflict = (message: string) => new ApiError(409, "conflict", message);
export const payloadTooLarge = (message: string) =>
  new ApiError(413, "payload_too_large", message);
export const unsupportedMediaType = (message: string) =>
  new ApiError(415, "unsupported_media_type", message);
export const tooManyRequests = (message = "Too many requests") =>
  new ApiError(429, "rate_limited", message);
export const internalError = (message = "Internal server error") =>
  new ApiError(500, "internal_error", message, { expose: false });

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function failResponse(error: unknown) {
  const correlationId = cryptoRandom();
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "validation_error",
          message: "Request validation failed",
          details: error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
          correlationId,
        },
      },
      { status: 400 },
    );
  }
  if (error instanceof ApiError) {
    if (!error.expose) {
      console.error(`[api:error] ${correlationId}`, error);
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.expose ? error.message : "Internal server error",
          details: error.expose ? error.details : undefined,
          correlationId,
        },
      },
      { status: error.status },
    );
  }
  console.error(`[api:unhandled] ${correlationId}`, error);
  return NextResponse.json(
    {
      ok: false,
      error: { code: "internal_error", message: "Internal server error", correlationId },
    },
    { status: 500 },
  );
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Wrap a route handler so thrown errors become safe JSON responses. */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      return failResponse(err);
    }
  };
}
