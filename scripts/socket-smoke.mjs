/**
 * Scratch verification of the authenticated Socket.IO engine.
 * Two independent socket clients (alice, bob) on separate cookie jars.
 */
import { io } from "socket.io-client";

const BASE = "http://localhost:3000";
const PATH = "/api/realtime";

function jar() {
  const c = new Map();
  return {
    cookie: () => [...c].map(([k, v]) => `${k}=${v}`).join("; "),
    save(res) {
      for (const s of res.headers.getSetCookie?.() ?? []) {
        const [pair] = s.split(";");
        const i = pair.indexOf("=");
        c.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    },
  };
}

async function api(j, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-fc-request": "1", cookie: j.cookie(), origin: BASE },
    body: body ? JSON.stringify(body) : undefined,
  });
  j.save(res);
  return res.json();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (cond, label) => {
  results.push([cond, label]);
  console.log(cond ? "PASS:" : "FAIL:", label);
};

const alice = jar();
const bob = jar();
const stamp = Date.now();
await api(alice, "POST", "/api/auth/register", { email: `rt_a_${stamp}@example.com`, password: "Password123!", displayName: "RT Alice" });
await api(bob, "POST", "/api/auth/register", { email: `rt_b_${stamp}@example.com`, password: "Password123!", displayName: "RT Bob" });
const search = await api(alice, "GET", `/api/users/search?q=rt_b_${stamp}%40example.com`);
const bobId = search.data.results[0].id;
const conv = await api(alice, "POST", "/api/conversations", { type: "direct", memberIds: [bobId] });
const convId = conv.data.conversation.id;

// 1. Unauthenticated socket must be rejected.
await new Promise((resolve) => {
  const bad = io(BASE, { path: PATH, transports: ["websocket"], reconnection: false });
  bad.on("connect_error", (e) => {
    check(e.message === "unauthorized", "socket handshake rejects missing session");
    bad.close();
    resolve();
  });
  bad.on("connect", () => {
    check(false, "socket handshake rejects missing session");
    bad.close();
    resolve();
  });
});

const socketA = io(BASE, { path: PATH, transports: ["websocket"], extraHeaders: { cookie: alice.cookie() } });
const socketB = io(BASE, { path: PATH, transports: ["websocket"], extraHeaders: { cookie: bob.cookie() } });
await Promise.all([
  new Promise((r) => socketA.on("connect", r)),
  new Promise((r) => socketB.on("connect", r)),
]);
check(socketA.connected && socketB.connected, "two authenticated sockets connected");
await wait(1200);

// 2. message:new reaches bob in real time after DB commit.
const received = new Promise((resolve) => socketB.once("message:new", (p) => resolve(p)));
const sent = await api(alice, "POST", `/api/conversations/${convId}/messages`, { body: "realtime hello", clientNonce: `rt-${stamp}-1` });
const evt = await received;
check(evt?.message?.body === "realtime hello" && evt.message.id === sent.data.message.id, "bob receives message:new with persisted id");

// 3. Typing indicators are relayed and authenticated.
const typing = new Promise((r) => socketB.once("typing", r));
socketA.emit("typing", { conversationId: convId, typing: true });
const typingEvt = await typing;
check(typingEvt.userId && typingEvt.typing === true, "typing event relayed");

const blocked = new Promise((r) =>
  socketA.emit("typing", { conversationId: "conv_nonexistent", typing: true }, (resp) => r(resp)),
);
const blockResp = await blocked;
check(blockResp.ok === false && blockResp.error === "not_a_member", "typing to foreign conversation rejected");

// 4. Read receipt over socket.
const receipt = new Promise((r) => socketA.once("message:receipt", r));
socketB.emit("message:read", { conversationId: convId });
const receiptEvt = await receipt;
check(receiptEvt.state === "read" && Array.isArray(receiptEvt.messageIds), "read receipt broadcast to sender");

// 5. Presence events fire on connect/disconnect.
const presence = new Promise((r) => socketA.on("presence", (p) => r(p)));
socketB.close();
const presenceEvt = await presence;
check(presenceEvt.online === false, "presence offline broadcast on disconnect");

// 6. Call signaling authz: bob creates a call; alice gets call:incoming.
const call = await api(bob, "POST", "/api/calls", { conversationId: convId, kind: "video" });
const callId = call.data.call.call.id;
const socketB2 = io(BASE, { path: PATH, transports: ["websocket"], extraHeaders: { cookie: bob.cookie() } });
await new Promise((r) => socketB2.on("connect", r));
await wait(1200);
const incoming = new Promise((r) => socketA.once("call:incoming", r));
// call was created before bob's reconnect; create a fresh one to emit through current sockets
const call2 = await api(bob, "POST", "/api/calls", { conversationId: convId, kind: "audio" });
const inc = await incoming;
check(inc.call.id === call2.data.call.call.id, "call invitation delivered via socket");
void callId;
const sdp = new Promise((r) => socketB2.once("call:sdp", r));
socketA.emit("call:sdp", { callId: inc.call.id, toUserId: bobId, sdp: { type: "offer", sdp: "v=0" } });
const sdpEvt = await sdp;
check(sdpEvt.fromUserId && sdpEvt.sdp.type === "offer", "SDP relayed between participants");

const iceBlocked = new Promise((r) =>
  socketA.emit("call:ice", { callId: "call_fake", toUserId: bobId, candidate: {} }, (resp) => r(resp)),
);
const iceResp = await iceBlocked;
check(iceResp.ok === false, "ICE relay blocked for non-participants");

await wait(200);
socketA.close();
socketB2.close();
const failed = results.filter(([ok]) => !ok);
console.log(`\nREALTIME ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
