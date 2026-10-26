/**
 * Shared helpers for HTTP/integration tests. Every request carries an
 * independent cookie jar so multi-user authorization can be exercised.
 */
export const BASE_URL = process.env.FC_BASE_URL ?? "http://localhost:3000";

export interface Jar {
  req(path: string, opts?: RequestInit): Promise<Response>;
  json<T = unknown>(path: string, opts?: RequestInit): Promise<{ status: number; body: any }>;
}

export function createJar(): Jar {
  const cookies = new Map<string, string>();
  const header = () => [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  async function req(path: string, opts: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...opts,
      headers: { ...(opts.headers ?? {}), cookie: header(), "x-fc-request": "1" },
      redirect: "manual",
    });
    for (const c of (res.headers.getSetCookie?.() ?? []) as string[]) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    return res;
  }

  return {
    req,
    async json(path, opts = {}) {
      const res = await req(path, opts);
      const body = await res.json().catch(() => null);
      return { status: res.status, body };
    },
  };
}

let cachedServerUp: boolean | null = null;

/** Integration tests skip honestly (never fake-pass) when no server is live. */
export async function serverIsUp(): Promise<boolean> {
  if (cachedServerUp !== null) return cachedServerUp;
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    cachedServerUp = res.ok;
  } catch {
    cachedServerUp = false;
  }
  return cachedServerUp;
}

export async function registerFresh(
  jar: Jar,
  tag: string,
): Promise<{ id: string; email: string; displayName: string }> {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const email = `vt_${tag}_${stamp}@example.com`;
  const displayName = `VT ${tag}`;
  const { status, body } = await jar.json("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Password123!", displayName }),
  });
  if (status !== 200 || !body?.ok) {
    throw new Error(`register ${tag} failed: ${status} ${JSON.stringify(body)}`);
  }
  return { id: body.data.userId as string, email, displayName };
}

export async function createDirectConversation(jar: Jar, peerId: string) {
  const { status, body } = await jar.json("/api/conversations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "direct", memberIds: [peerId] }),
  });
  if (status !== 201) throw new Error(`conversation create failed: ${status} ${JSON.stringify(body)}`);
  return body.data.conversation as { id: string };
}
