import { describe, it, expect } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createJar, registerFresh, createDirectConversation, BASE_URL } from "./helpers/http";

const up = await (await import("./helpers/http")).serverIsUp();

describe.skipIf(!up)("17 · call sessions, config and WebRTC signaling", () => {
  it("returns authenticated STUN/TURN configuration", async () => {
    const jar = createJar();
    await registerFresh(jar, "call-cfg");
    const { status, body } = await jar.json("/api/calls/config");
    expect(status).toBe(200);
    expect(Array.isArray(body.data.iceServers)).toBe(true);
    const anon = createJar();
    expect((await anon.json("/api/calls/config")).status).toBe(401);
  });

  it("creates a call, rings the peer and relays SDP while blocking outsider ICE", async () => {
    const alice = createJar();
    const bob = createJar();
    const mallory = createJar();
    await registerFresh(alice, "call-a");
    const b = await registerFresh(bob, "call-b");
    await registerFresh(mallory, "call-m");
    const conv = await createDirectConversation(alice, b.id);

    // Socket handshake needs the raw cookie; extract it by replaying login
    // against a header-capturing jar.
    const headerJars = [new Map<string, string>(), new Map<string, string>(), new Map<string, string>()];
    const authedFetch = async (which: number, path: string, body?: unknown) => {
      const jar = headerJars[which];
      const res = await fetch(`${BASE_URL}${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          "content-type": "application/json",
          "x-fc-request": "1",
          cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      for (const c of res.headers.getSetCookie()) {
        const [pair] = c.split(";");
        const eq = pair.indexOf("=");
        jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
      return res.json();
    };
    const stamp = Date.now();
    const ua = await authedFetch(0, "/api/auth/register", {
      email: `vt_call_a_${stamp}@example.com`,
      password: "Password123!",
      displayName: "Call A",
    });
    const ub = await authedFetch(1, "/api/auth/register", {
      email: `vt_call_b_${stamp}@example.com`,
      password: "Password123!",
      displayName: "Call B",
    });
    await authedFetch(2, "/api/auth/register", {
      email: `vt_call_m_${stamp}@example.com`,
      password: "Password123!",
      displayName: "Call M",
    });
    const conv2 = await authedFetch(0, "/api/conversations", {
      type: "direct",
      memberIds: [ub.data.userId],
    });
    const conversationId = conv2.data.conversation.id;

    const connect = (which: number) =>
      new Promise<Socket>((resolve, reject) => {
        const s = io(BASE_URL, {
          path: "/api/realtime",
          transports: ["websocket"],
          extraHeaders: {
            cookie: [...headerJars[which]].map(([k, v]) => `${k}=${v}`).join("; "),
          },
          reconnection: false,
          timeout: 8000,
        });
        s.once("connect", () => resolve(s));
        s.once("connect_error", reject);
      });

    const [sa, sb, sm] = await Promise.all([connect(0), connect(1), connect(2)]);
    await new Promise((r) => setTimeout(r, 1200));

    const ring = new Promise<{ call: { id: string } }>((resolve) => sb.on("call:incoming", resolve));
    const created = await authedFetch(0, "/api/calls", { conversationId, kind: "video" });
    expect(created.data.call.call.state).toBe("ringing");
    const callId = created.data.call.call.id;
    const ringEvent = await ring;
    expect(ringEvent.call.id).toBe(callId);

    // SDP offer relay from alice to bob.
    const sdp = new Promise<{ callId: string; sdp: { type: string } }>((resolve) =>
      sb.on("call:sdp", resolve),
    );
    await new Promise<void>((resolve, reject) =>
      sa.emit(
        "call:sdp",
        { callId, toUserId: ub.data.userId, sdp: { type: "offer", sdp: "v=0" } },
        (ack: { ok: boolean }) => (ack.ok ? resolve() : reject(new Error("sdp rejected"))),
      ),
    );
    const sdpEvent = await sdp;
    expect(sdpEvent.sdp.type).toBe("offer");

    // Mallory is not a participant: ICE must be rejected.
    const iceAck = await new Promise<{ ok: boolean; error?: string }>((resolve) =>
      sm.emit(
        "call:ice",
        { callId, toUserId: ua.data.userId, candidate: { candidate: "x" } },
        resolve,
      ),
    );
    expect(iceAck.ok).toBe(false);

    sa.close();
    sb.close();
    sm.close();
    void conv;
    void b;
  });
});
