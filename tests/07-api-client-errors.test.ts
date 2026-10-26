import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch, ApiClientError } from "@/lib/api/client";

describe("07 · browser API client error handling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("unwraps the {ok,data} envelope and sends the CSRF header", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ ok: true, data: { hello: "world" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const data = await apiFetch<{ hello: string }>("/api/ping");
    expect(data.hello).toBe("world");
    const init = fetchMock.mock.calls[0][1]!;
    expect((init.headers as Record<string, string>)["x-fc-request"]).toBe("1");
    expect(init.credentials).toBe("same-origin");
  });

  it("maps server error envelopes into ApiClientError with status/code/correlation id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "forbidden", message: "nope", correlationId: "corr-1" },
          }),
          { status: 403 },
        ),
      ),
    );
    await expect(apiFetch("/api/secret")).rejects.toBeInstanceOf(ApiClientError);
    try {
      await apiFetch("/api/secret");
    } catch (err) {
      const e = err as ApiClientError;
      expect(e.status).toBe(403);
      expect(e.code).toBe("forbidden");
      expect(e.correlationId).toBe("corr-1");
    }
  });

  it("reports network_error (status 0) when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    try {
      await apiFetch("/api/whatever");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect((err as ApiClientError).status).toBe(0);
      expect((err as ApiClientError).code).toBe("network_error");
    }
  });

  it("serializes JSON bodies and sets content-type on writes", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ ok: true, data: {} })));
    vi.stubGlobal("fetch", fetchMock);
    await apiFetch("/api/x", { method: "POST", body: { a: 1 } });
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
  });
});
