import { describe, it, expect } from "vitest";
import type { NextRequest } from "next/server";
import { assertSameOrigin, clientIp } from "@/server/http/guard";

function fakeReq(method: string, headers: Record<string, string>): NextRequest {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    method,
    headers: { get: (k: string) => map.get(k.toLowerCase()) ?? null },
  } as unknown as NextRequest;
}

describe("06 · same-origin / CSRF guard", () => {
  it("skips safe HTTP methods", () => {
    expect(() => assertSameOrigin(fakeReq("GET", {}))).not.toThrow();
    expect(() => assertSameOrigin(fakeReq("HEAD", {}))).not.toThrow();
    expect(() => assertSameOrigin(fakeReq("OPTIONS", {}))).not.toThrow();
  });

  it("allows same-origin browser requests", () => {
    expect(() =>
      assertSameOrigin(fakeReq("POST", { origin: "http://localhost:3000" })),
    ).not.toThrow();
  });

  it("allows non-browser clients presenting the custom request header", () => {
    expect(() => assertSameOrigin(fakeReq("POST", { "x-fc-request": "1" }))).not.toThrow();
  });

  it("rejects state-changing requests with neither origin nor custom header", () => {
    expect(() => assertSameOrigin(fakeReq("POST", {}))).toThrow();
  });

  it("rejects foreign origins", () => {
    expect(() => assertSameOrigin(fakeReq("POST", { origin: "https://evil.example" }))).toThrow();
  });

  it("extracts the first forwarded IP and truncates length", () => {
    const ip = clientIp(fakeReq("GET", { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    expect(ip).toBe("203.0.113.7");
    expect(clientIp(fakeReq("GET", { "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
    expect(clientIp(fakeReq("GET", {}))).toBeNull();
  });
});
