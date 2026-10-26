import { describe, it, expect } from "vitest";
import { io, type Socket } from "socket.io-client";
import { BASE_URL } from "./helpers/http";

const up = await (await import("./helpers/http")).serverIsUp();

function connectSocket(cookie: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      path: "/api/realtime",
      transports: ["websocket"],
      extraHeaders: { cookie },
      reconnection: false,
      timeout: 8000,
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err: Error) => reject(err));
  });
}

describe.skipIf(!up)("16 · authenticated Socket.IO realtime", () => {
  it("rejects handshakes without a session", async () => {
    await expect(
      new Promise<void>((_resolve, reject) => {
        const socket = io(BASE_URL, {
          path: "/api/realtime",
          transports: ["websocket"],
          reconnection: false,
          timeout: 6000,
        });
        socket.on("connect", () => reject(new Error("anonymous socket should not connect")));
        socket.on("connect_error", () => {
          socket.close();
          _resolve();
        });
      }),
    ).resolves.toBeUndefined();
  });

  it("delivers a persisted message:new to the other member and relays typing", async () => {
    // Dedicated jars whose cookie headers we can read for the handshake.
    const cookieMaps = [new Map<string, string>(), new Map<string, string>()];
    const authFetch = async (which: 0 | 1, path: string, body?: unknown) => {
      const jar = cookieMaps[which];
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
    const a = await authFetch(0, "/api/auth/register", {
      email: `vt_sock_a_${stamp}@example.com`,
      password: "Password123!",
      displayName: "Sock A",
    });
    const b = await authFetch(1, "/api/auth/register", {
      email: `vt_sock_b_${stamp}@example.com`,
      password: "Password123!",
      displayName: "Sock B",
    });
    const convCreated = await authFetch(0, "/api/conversations", {
      type: "direct",
      memberIds: [b.data.userId],
    });
    const conversationId = convCreated.data.conversation.id;

    const [socketA, socketB] = await Promise.all([
      connectSocket([...cookieMaps[0]].map(([k, v]) => `${k}=${v}`).join("; ")),
      connectSocket([...cookieMaps[1]].map(([k, v]) => `${k}=${v}`).join("; ")),
    ]);
    await new Promise((r) => setTimeout(r, 1200)); // async room joins

    const incoming = new Promise<{ conversationId: string; message: { id: string; body: string } }>(
      (resolve) => socketB.on("message:new", resolve),
    );
    await authFetch(0, `/api/conversations/${conversationId}/messages`, {
      body: "socket delivery",
      clientNonce: `sock_${stamp}`,
    });
    const event = await incoming;
    expect(event.conversationId).toBe(conversationId);
    expect(event.message.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.message.body).toBe("socket delivery");

    const typingAck = new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socketA.emit("typing", { conversationId, typing: true }, resolve);
    });
    const ack = await typingAck;
    expect(ack.ok).toBe(true);

    // Membership enforcement on a random foreign conversation id.
    const foreign = new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socketA.emit("typing", { conversationId: "00000000-0000-0000-0000-000000000000", typing: true }, resolve);
    });
    expect((await foreign).ok).toBe(false);

    socketA.close();
    socketB.close();
    void a;
  });
});
