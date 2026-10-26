/**
 * End-to-end media + structured-message verification against the live server.
 *
 * Covers every supported upload family with REAL byte fixtures (magic-number
 * valid), confirms content sniffing rejects garbage, round-trips each item
 * through a persisted message, verifies byte-identical cookie-authed
 * downloads, cross-user authorization (member allowed / outsider 403), and
 * real location + contact-card messages with persisted metadata.
 *
 * Run with the server live: node scripts/media-matrix-smoke.mjs
 */
import { createHash } from "node:crypto";

const BASE = process.env.FC_BASE_URL ?? "http://localhost:3000";
let pass = 0;
let fail = 0;

function check(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`PASS: ${name}`);
  } else {
    fail++;
    console.error(`FAIL: ${name} ${detail}`);
  }
}

const u32 = (n) => Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

function riff(fourcc, payload = Buffer.alloc(32, 7)) {
  const body = Buffer.concat([Buffer.from(fourcc), payload]);
  return Buffer.concat([Buffer.from("RIFF"), u32(body.length), body]);
}

function ftyp(brand) {
  const box = Buffer.concat([Buffer.from("ftyp"), Buffer.from(brand), Buffer.from([0, 0, 0, 0]), Buffer.from(brand)]);
  return Buffer.concat([u32(8 + box.length), box, Buffer.alloc(24, 1)]);
}

// Real, magic-number-valid fixtures for every sniffed family.
const FIXTURES = [
  { name: "PNG image", file: "pixel.png", mime: "image/png", kind: "image",
    bytes: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") },
  { name: "JPEG image", file: "photo.jpg", mime: "image/jpeg", kind: "image",
    bytes: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("JFIF"), Buffer.alloc(24, 0), Buffer.from([0xff, 0xd9])]) },
  { name: "GIF image", file: "anim.gif", mime: "image/gif", kind: "image",
    bytes: Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(20, 0), Buffer.from([0x3b])]) },
  { name: "WebP image", file: "pic.webp", mime: "image/webp", kind: "image", bytes: riff("WEBP") },
  { name: "MP4 video", file: "clip.mp4", mime: "video/mp4", kind: "video", bytes: ftyp("isom") },
  { name: "WebM video", file: "clip.webm", mime: "video/webm", kind: "video",
    bytes: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(40, 1)]) },
  { name: "MP3 audio", file: "song.mp3", mime: "audio/mpeg", kind: "audio",
    bytes: Buffer.concat([Buffer.from("ID3"), Buffer.from([0x03, 0x00, 0x00, 0x00]), Buffer.alloc(24, 0), Buffer.from([0xff, 0xfb]), Buffer.alloc(16, 0)]) },
  { name: "WAV audio", file: "rec.wav", mime: "audio/wav", kind: "audio", bytes: riff("WAVE") },
  { name: "Ogg audio", file: "rec.ogg", mime: "audio/ogg", kind: "audio",
    bytes: Buffer.concat([Buffer.from("OggS"), Buffer.alloc(40, 0)]) },
  { name: "M4A audio", file: "rec.m4a", mime: "audio/mp4", kind: "audio", bytes: ftyp("M4A ") },
  { name: "WebM voice note", file: "voice.webm", mime: "audio/webm", kind: "voice", formKind: "voice",
    bytes: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(40, 2)]) },
  { name: "PDF document", file: "doc.pdf", mime: "application/pdf", kind: "document",
    bytes: Buffer.from("%PDF-1.4\n%real pdf fixture\n%%EOF\n") },
  { name: "DOCX (zip) document", file: "doc.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "document",
    bytes: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(40, 3)]) },
  { name: "Plain text document", file: "notes.txt", mime: "text/plain", kind: "document",
    bytes: Buffer.from("FriendConnect media matrix — real text fixture, line one.\nLine two.\n") },
];

async function jar() {
  const cookies = new Map();
  function header() {
    return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  return {
    async req(path, opts = {}) {
      const res = await fetch(`${BASE}${path}`, {
        ...opts,
        headers: { ...(opts.headers ?? {}), cookie: header(), "x-fc-request": "1" },
        redirect: "manual",
      });
      const setCookie = res.headers.getSetCookie?.() ?? [];
      for (const c of setCookie) {
        const [pair] = c.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
      return res;
    },
    async json(path, opts = {}) {
      const res = await this.req(path, opts);
      const body = await res.json().catch(() => null);
      return { status: res.status, body };
    },
  };
}

async function login(client, email, password) {
  const { status, body } = await client.json("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (status !== 200 || !body?.ok) throw new Error(`login ${email} failed: ${status}`);
  return body.data.user;
}

async function registerFresh(client, tag) {
  const email = `mm_${tag}_${Date.now()}@example.com`;
  const { status, body } = await client.json("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Password123!", displayName: `MM ${tag}` }),
  });
  if (status !== 200 || !body?.ok) throw new Error(`register ${tag} failed: ${status} ${JSON.stringify(body)}`);
  return { id: body.data.userId, email, displayName: `MM ${tag}` };
}

async function upload(client, fixture) {
  const form = new FormData();
  form.append("file", new Blob([fixture.bytes], { type: fixture.mime }), fixture.file);
  if (fixture.formKind) form.append("kind", fixture.formKind);
  const res = await client.req("/api/media/upload", { method: "POST", body: form });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main() {
  const alice = await jar();
  const bob = await jar();
  const charlie = await jar();
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await registerFresh(alice, `a_${stamp}`);
  const bobUser = await registerFresh(bob, `b_${stamp}`);
  await registerFresh(charlie, `c_${stamp}`);

  // Conversation between alice and bob.
  const conv = await alice.json("/api/conversations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "direct", memberIds: [bobUser.id] }),
  });
  check("conversation created", conv.status === 201, String(conv.status));
  const conversationId = conv.body?.data?.conversation?.id;

  for (const fx of FIXTURES) {
    const sha = createHash("sha256").update(fx.bytes).digest("hex");
    const up = await upload(alice, fx);
    check(`upload accepted: ${fx.name}`, up.status === 201 && up.body?.ok, `${up.status} ${JSON.stringify(up.body?.error ?? "")}`);
    const mediaId = up.body?.data?.media?.id;
    check(`sniffed kind=${fx.kind} for ${fx.name}`, up.body?.data?.media?.kind === fx.kind);

    // Attach it to a persisted message.
    const sent = await alice.json(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        body: `fixture: ${fx.name}`,
        kind: fx.kind === "voice" ? "voice" : fx.kind,
        mediaIds: [mediaId],
        clientNonce: `mm_${sha.slice(0, 16)}`,
      }),
    });
    check(`message persisted with ${fx.name}`, sent.status === 201 && sent.body?.data?.message?.id, String(sent.status));
    const url = sent.body?.data?.message?.attachments?.[0]?.media?.url;
    check(`private media url issued for ${fx.name}`, typeof url === "string" && url.startsWith("/api/media/"));

    // Owner downloads byte-identical content with the session cookie.
    const dl = await alice.req(url);
    const bytes = Buffer.from(await dl.arrayBuffer());
    check(`owner download 200 for ${fx.name}`, dl.status === 200, String(dl.status));
    check(`byte-identical download for ${fx.name}`, createHash("sha256").update(bytes).digest("hex") === sha);

    // Conversation member (bob) is authorized.
    const bobDl = await bob.req(url);
    check(`member download allowed for ${fx.name}`, bobDl.status === 200 || bobDl.status === 307, String(bobDl.status));

    // Outsider (charlie) is forbidden.
    const outsider = await charlie.req(url);
    check(`outsider blocked for ${fx.name}`, outsider.status === 403, String(outsider.status));
  }

  // Garbage bytes must be rejected by the magic-number sniffer.
  const garbage = Buffer.from(Array.from({ length: 64 }, () => Math.floor(Math.random() * 256)));
  const bad = await upload(alice, { name: "garbage", file: "x.bin", mime: "application/octet-stream", bytes: garbage });
  check("random bytes rejected with 415", bad.status === 415, String(bad.status));

  // Empty upload rejected.
  const empty = await upload(alice, { name: "empty", file: "empty.txt", mime: "text/plain", bytes: Buffer.alloc(0) });
  check("empty upload rejected", empty.status === 415 || empty.status === 400, String(empty.status));

  // Real location message with persisted metadata.
  const location = await alice.json(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "location",
      location: { lat: 23.8103, lng: 90.4125, address: "Dhaka, Bangladesh" },
      clientNonce: `loc_${stamp}`,
    }),
  });
  check("location message stored", location.status === 201 && location.body?.data?.message?.kind === "location", String(location.status));
  check(
    "location metadata round-trips",
    location.body?.data?.message?.metadata?.location?.lat === 23.8103 &&
      location.body?.data?.message?.metadata?.location?.address === "Dhaka, Bangladesh",
    JSON.stringify(location.body?.data?.message?.metadata),
  );

  // Real contact-card message with persisted metadata.
  const contact = await alice.json(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "contact",
      contactCard: { name: bobUser.displayName, phone: "+880 1700 000000", company: "FriendConnect" },
      clientNonce: `card_${stamp}`,
    }),
  });
  check("contact message stored", contact.status === 201 && contact.body?.data?.message?.kind === "contact", String(contact.status));
  check(
    "contact metadata round-trips",
    contact.body?.data?.message?.metadata?.contactCard?.phone === "+880 1700 000000",
    JSON.stringify(contact.body?.data?.message?.metadata),
  );

  // Recipient sees the structured messages via the history endpoint.
  const history = await bob.json(`/api/conversations/${conversationId}/messages?limit=50`);
  const items = history.body?.data?.items ?? [];
  check("recipient history includes location", items.some((m) => m.kind === "location" && m.metadata?.location?.lng === 90.4125));
  check("recipient history includes contact", items.some((m) => m.kind === "contact" && m.metadata?.contactCard?.name));

  // Idempotency: replaying the location nonce returns the same message id.
  const replay = await alice.json(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "location",
      location: { lat: 23.8103, lng: 90.4125, address: "Dhaka, Bangladesh" },
      clientNonce: `loc_${stamp}`,
    }),
  });
  check("nonce replay is idempotent", replay.body?.data?.message?.id === location.body?.data?.message?.id);

  console.log(`\nMEDIA MATRIX ${pass}/${pass + fail} checks passed`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
