/**
 * The native-call sample catalogue — the reference implementations the web
 * calling stack is measured against, and what each one teaches a browser
 * implementation.
 */

export interface NativeCallSample {
  id: string;
  name: string;
  platform: "Android" | "iOS" | "Cross-platform" | "Server";
  language: string;
  stack: string[];
  demo: string;
  teaches: string;
  repo: string;
  licence: string;
  accent: string;
}

export const NATIVE_CALL_SAMPLES: NativeCallSample[] = [
  {
    id: "webrtc_kotlin",
    name: "WebRTC Kotlin Sample",
    platform: "Android",
    language: "Kotlin",
    stack: ["Jetpack Compose", "libwebrtc", "Ktor signalling"],
    demo:
      "A one-to-one call with a full-screen renderer, local and remote camera tracks, microphone and camera toggles, and a native ICE candidate exchange over a companion signalling server.",
    teaches:
      "That a real call needs three moving parts, not one: the peer connection, a signalling channel, and a render surface. The browser gives you the first two for free — which is exactly why the failure modes differ.",
    repo: "webrtc-sdk / android samples",
    licence: "BSD-3-Clause",
    accent: "#3b64f6",
  },
  {
    id: "voip_call_sample",
    name: "VoIP Call Sample",
    platform: "Android",
    language: "Java",
    stack: ["Android SIP", "Asterisk", "Linphone stack"],
    demo:
      "An inbound and outbound SIP call with DTMF, hold, mute and a call-quality readout, talking to a real Asterisk server.",
    teaches:
      "That the telephone network is still the hard part. Every WebRTC call still ends up as an INVITE somewhere, and the signalling vocabulary is worth learning before you hide it.",
    repo: "VoIP-Call-Sample",
    licence: "Apache-2.0",
    accent: "#14b8a6",
  },
  {
    id: "android_java_chat",
    name: "Android Java Chat App",
    platform: "Android",
    language: "Java",
    stack: ["Android SDK", "Socket.IO", "MediaRecorder"],
    demo:
      "A complete chat client — text, images, voice notes, group chats and call buttons — with a matching server.",
    teaches:
      "The full message envelope: what a media attachment carries, how a receipt works, and why a chat client without a call button feels unfinished.",
    repo: "android-java-chat-app",
    licence: "MIT",
    accent: "#f59e0b",
  },
  {
    id: "linphone_iphone",
    name: "Linphone iPhone",
    platform: "iOS",
    language: "Objective-C / Swift",
    stack: ["Linphone SDK", "belled", "Apple PushKit"],
    demo:
      "The reference SIP client for iOS — SIP registration, incoming push notifications, VoIP call handling and a contact-matching address book.",
    teaches:
      "What a phone call must survive: the screen locks, the app is backgrounded, the network changes mid-call. A browser tab gets none of that for free.",
    repo: "linphone-iphone",
    licence: "GPL-3.0",
    accent: "#8b5cf6",
  },
  {
    id: "linphone_core",
    name: "Linphone Core",
    platform: "Cross-platform",
    language: "C / C++",
    stack: ["belled", "belle-sip", "OpenSSL", "Codec2"],
    demo:
      "The media engine underneath the phone clients — SIP signalling, codec negotiation, jitter buffers and echo cancellation.",
    teaches:
      "Where quality actually comes from: jitter buffer depth, packet loss concealment, and an echo canceller that has to run before the audio reaches the speaker.",
    repo: "Belledonne / linphone-sdk",
    licence: "GPL-3.0",
    accent: "#ec4899",
  },
  {
    id: "sip_gateway",
    name: "SIP ↔ WebRTC gateway",
    platform: "Server",
    language: "Go / Rust",
    stack: ["SIP", "RTP", "DTLS-SRTP", "Janus"],
    demo:
      "The bridge that lets a browser client join a SIP call — media relayed, DTLS terminated on the edge, SIP signalling kept on the other side.",
    teaches:
      "Why a browser can join the phone network at all, and where the encryption boundary actually sits.",
    repo: "sip gateway deployments",
    licence: "MIT",
    accent: "#0ea5e9",
  },
  {
    id: "voip_recording",
    name: "Call recording pipeline",
    platform: "Server",
    language: "Go",
    stack: ["SIPREC", "GStreamer", "Object storage"],
    demo:
      "Segment capture from the media plane, written to object storage with an index, and a hard two-hour cap on the recording.",
    teaches:
      "That recording belongs on the media plane, not in the application, and that a retention cap has to be enforced by the recorder rather than by policy.",
    repo: "call-centre reference stack",
    licence: "MIT",
    accent: "#ef4444",
  },
];

export const CALL_ENGINE_COVERAGE: {
  layer: string;
  browser: string;
  native: string;
  note: string;
}[] = [
  {
    layer: "Signalling",
    browser: "WebSocket — built in",
    native: "SIP over TLS",
    note: "The browser cannot speak SIP, so a gateway terminates it for you.",
  },
  {
    layer: "Transport",
    browser: "ICE / UDP / TCP",
    native: "UDP, TCP, TLS",
    note: "TURN relay is the fallback when both peers are behind NAT.",
  },
  {
    layer: "Media encryption",
    browser: "DTLS-SRTP — mandatory",
    native: "SRTP optional, TLS signalling",
    note: "The browser never lets you turn DTLS off, which is the right answer.",
  },
  {
    layer: "Audio codec",
    browser: "Opus, G.711",
    native: "Opus, G.711, G.729, AMR",
    note: "G.729 is the codec the telephone network actually uses.",
  },
  {
    layer: "Video codec",
    browser: "VP8, VP9, H.264, AV1",
    native: "H.264, VP8, VP9",
    note: "Hardware encode decides whether a video call is possible on a phone.",
  },
  {
    layer: "Call state",
    browser: "WebRTC state machine",
    native: "TelephonyManager, CallState",
    note: "Native clients also get carrier signalling — busy, no answer, barred.",
  },
  {
    layer: "Push",
    browser: "None — the tab must be open",
    native: "FCM, APNs, PushKit",
    note: "The single biggest gap between the browser client and a phone app.",
  },
  {
    layer: "Background",
    browser: "None",
    native: "Background mode, VoIP push",
    note: "A browser call dies when the tab sleeps; a phone call does not.",
  },
  {
    layer: "Recording",
    browser: "MediaRecorder on a captured stream",
    native: "AudioRecord, CallRecorder",
    note: "Recording must sit on the media plane to work on both.",
  },
  {
    layer: "Directory",
    browser: "Your own directory",
    native: "System contacts, carrier CNAM",
    note: "A phone already knows who is calling; a browser does not.",
  },
];

export const CALL_LIMITS: { id: string; label: string; value: string; why: string }[] = [
  {
    id: "recording_cap",
    label: "Recording cap",
    value: "2 hours",
    why: "A recording stops on the cap and the segment is archived, so a long call never becomes an unbounded liability.",
  },
  {
    id: "consent",
    label: "Recording consent",
    value: "Explicit, per call",
    why: "The consent artefact is stored with the call record, not with the recording.",
  },
  {
    id: "mos_floor",
    label: "Quality floor",
    value: "MOS 3.0",
    why: "Below 3.0 the call is flagged for review rather than silently degraded.",
  },
  {
    id: "retry",
    label: "Redial policy",
    value: "2 attempts, 90 s apart",
    why: "Two attempts, ninety seconds apart, and no more — the unreached contact is recorded as unreached, never as voicemail.",
  },
  {
    id: "queue_depth",
    label: "Queue depth",
    value: "12 simultaneous",
    why: "A supervisor wallboard shows the queue, the roster and who is handling what, so the limit is visible before it is reached.",
  },
  {
    id: "handover",
    label: "Handover window",
    value: "Full context",
    why: "A human handover carries the transcript, the sentiment and the action items — not a summary that hides the difficult part.",
  },
];
