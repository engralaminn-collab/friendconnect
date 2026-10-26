import { describe, it, expect } from "vitest";
import { createJar, registerFresh, serverIsUp, BASE_URL } from "./helpers/http";

const up = await serverIsUp();

describe.skipIf(!up)("12 · health & authentication over HTTP", () => {
  it("serves liveness and database health", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns a null session for anonymous callers", async () => {
    const jar = createJar();
    const { status, body } = await jar.json("/api/auth/session");
    expect(status).toBe(200);
    expect(body.data.user).toBeNull();
  });

  it("registers a user and sets an opaque session cookie", async () => {
    const jar = createJar();
    const user = await registerFresh(jar, "auth");
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    const { body } = await jar.json("/api/auth/session");
    expect(body.data.user.email).toBe(user.email);
  });

  it("rejects bad passwords with 401 and never issues a cookie", async () => {
    const jar = createJar();
    const user = await registerFresh(jar, "badlogin");
    const fresh = createJar();
    const { status } = await fresh.json("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "WrongPassword9!" }),
    });
    expect(status).toBe(401);
    const { body } = await fresh.json("/api/auth/session");
    expect(body.data.user).toBeNull();
  });

  it("logs out and revokes the session", async () => {
    const jar = createJar();
    await registerFresh(jar, "logout");
    const logout = await jar.json("/api/auth/logout", { method: "POST" });
    expect(logout.status).toBe(200);
    const { body } = await jar.json("/api/auth/session");
    expect(body.data.user).toBeNull();
  });
});
