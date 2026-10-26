/**
 * Browser HTTP client for the FriendConnect API.
 * - Sends the HttpOnly session cookie automatically.
 * - Adds the same-origin request header used by the CSRF defence.
 * - Normalizes errors into ApiClientError with the server's correlation id.
 */

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;
  correlationId?: string;

  constructor(status: number, code: string, message: string, details?: unknown, correlationId?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.correlationId = correlationId;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  cache?: RequestCache;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "x-fc-request": "1",
  };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      cache: options.cache ?? "no-store",
    });
  } catch (err) {
    throw new ApiClientError(0, "network_error", "Network unavailable. Check your connection.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const err = json?.error ?? {};
    throw new ApiClientError(
      res.status,
      err.code ?? "unknown",
      err.message ?? `Request failed (${res.status})`,
      err.details,
      err.correlationId,
    );
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiFetch<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "DELETE", body }),
};
