/**
 * Chat UI kit catalogue.
 *
 * A component inventory in the shape a production chat UI kit exposes:
 * conversations, message bubbles per media type, the composer, reactions,
 * threads, calling surfaces, AI surfaces — plus the cross-platform matrix and
 * the theming, accessibility and localisation contract.
 */

export type KitFamily =
  | "react"
  | "angular"
  | "react-native"
  | "ios"
  | "android"
  | "flutter"
  | "headless";

export interface KitComponent {
  name: string;
  family: KitFamily;
  group:
    | "Conversations"
    | "Messages"
    | "Bubbles"
    | "Calling"
    | "AI"
    | "Engagement"
    | "People"
    | "Utilities";
  description: string;
  /** Feature flags the component depends on. */
  requires: string[];
  platforms: KitFamily[];
  status: "stable" | "beta" | "experimental";
}

export const KIT_FAMILIES: {
  id: KitFamily;
  label: string;
  version: string;
  language: string;
  surface: "ui-kit" | "headless-sdk";
  note: string;
}[] = [
  { id: "react", label: "React", version: "v7", language: "TypeScript", surface: "ui-kit", note: "Web. Works in Vite, Next.js, CRA, React Router and Astro." },
  { id: "angular", label: "Angular", version: "v5", language: "TypeScript", surface: "ui-kit", note: "Web. Standalone components, signals, strict templates." },
  { id: "react-native", label: "React Native", version: "v5", language: "TypeScript", surface: "ui-kit", note: "Mobile and web. Expo and bare React Native." },
  { id: "ios", label: "iOS", version: "v5", language: "Swift / SwiftUI", surface: "ui-kit", note: "Native. UIKit and SwiftUI components." },
  { id: "android", label: "Android", version: "v6", language: "Kotlin / Compose", surface: "ui-kit", note: "Native. Compose and classic Views." },
  { id: "flutter", label: "Flutter", version: "v6", language: "Dart", surface: "ui-kit", note: "Cross-platform. Android, iOS, web and desktop." },
  { id: "headless", label: "Calls SDK (headless)", version: "v5", language: "JS · RN · iOS · Android · Flutter", surface: "headless-sdk", note: "No UI. You bring your own surface; we bring the media." },
];

export const KIT_COMPONENTS: KitComponent[] = [
  // Conversations
  { name: "Conversations", family: "react", group: "Conversations", description: "The list of one-to-one and group chats, with search, filters and unread counts.", requires: [], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "Groups", family: "react", group: "Conversations", description: "Group creation, membership and group metadata management.", requires: ["groups"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "Users", family: "react", group: "People", description: "User directory with presence, role and search.", requires: ["users"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "GroupMembers", family: "react", group: "People", description: "Member list for a group, with role management and invitations.", requires: ["groups"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "Search", family: "react", group: "Utilities", description: "Conversation and message search with filters and highlighted matches.", requires: ["conversation-search"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "NotificationFeed", family: "react", group: "Engagement", description: "A single feed of every notification across conversations.", requires: [], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "SavedMessages", family: "react", group: "Engagement", description: "Your own saved-message collection, separate from any chat.", requires: ["message-bookmarks"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },

  // Messages
  { name: "MessageList", family: "react", group: "Messages", description: "The scrollable message list, with date separators and infinite scroll.", requires: [], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "MessageBubble", family: "react", group: "Bubbles", description: "The base bubble: alignment, tail, grouping, delivery state.", requires: [], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "MessageHeader", family: "react", group: "Messages", description: "The sender row inside a bubble: name, role, timestamp, thread indicator.", requires: [], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "MessageInformation", family: "react", group: "Messages", description: "The detail sheet for one message: deliveries, edits, reactions, moderation actions.", requires: [], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "MessageComposer", family: "react", group: "Messages", description: "The input row: text, attachments, emoji, polls, mentions, typing state.", requires: [], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "ThreadHeader", family: "react", group: "Messages", description: "Header for a threaded reply chain, with participants and subscribe toggle.", requires: ["threads"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "PinnedMessages", family: "react", group: "Engagement", description: "The pinned list for a conversation, with unpin and jump-to-message.", requires: ["message-pinning"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "CreatePoll", family: "react", group: "Messages", description: "Poll builder: question, options, single or multiple choice.", requires: ["polls"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "FlagMessageDialog", family: "react", group: "Utilities", description: "Report a message: reason, optional note, moderation handoff.", requires: ["moderation"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },

  // Bubbles
  { name: "TextBubble", family: "react", group: "Bubbles", description: "Plain text with markdown, mentions, links, quotes and code.", requires: [], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "ImageBubble", family: "react", group: "Bubbles", description: "Inline image with lightbox, download, dimensions and caption.", requires: ["image-message"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "ImagesBubble", family: "react", group: "Bubbles", description: "A grid of images collapsed into one attachment.", requires: ["image-message"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "VideoBubble", family: "react", group: "Bubbles", description: "Video attachment with a scrubber, duration and resolution badge.", requires: ["video-message"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "VideosBubble", family: "react", group: "Bubbles", description: "A grid of videos collapsed into one attachment.", requires: ["video-message"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "AudioBubble", family: "react", group: "Bubbles", description: "An audio file with a player, waveform and duration.", requires: ["audio-message"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "AudiosBubble", family: "react", group: "Bubbles", description: "Several audio files collapsed into one attachment.", requires: ["audio-message"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "VoiceNoteBubble", family: "react", group: "Bubbles", description: "A recorded voice note with a scrubber, waveform and playback speed.", requires: ["voice-message"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "FileBubble", family: "react", group: "Bubbles", description: "A downloadable document with type icon, size and name.", requires: ["file-message"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "FilesBubble", family: "react", group: "Bubbles", description: "Several documents collapsed into one attachment.", requires: ["file-message"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "StickerBubble", family: "react", group: "Bubbles", description: "A sticker, rendered large and without a caption.", requires: ["stickers"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "StickersKeyboard", family: "react", group: "Engagement", description: "A sticker pack browser, searchable by tag.", requires: ["stickers"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "PollBubble", family: "react", group: "Bubbles", description: "A live poll with vote bars, counts and your own selection.", requires: ["polls"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "CallBubble", family: "react", group: "Bubbles", description: "A call event inside the message stream: direction, duration, outcome.", requires: ["calls"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "CallActionBubble", family: "react", group: "Bubbles", description: "An inline call action — join, reschedule or acknowledge a scheduled call.", requires: ["calls"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "beta" },
  { name: "GroupActionBubble", family: "react", group: "Bubbles", description: "System events: someone joined, left, or changed the group.", requires: ["groups"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "CollaborativeDocumentBubble", family: "react", group: "Bubbles", description: "A shared document with live presence and edit state.", requires: ["collaborative-document"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "beta" },
  { name: "CollaborativeWhiteboardBubble", family: "react", group: "Bubbles", description: "A shared whiteboard canvas attached to a message.", requires: ["collaborative-whiteboard"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "beta" },

  // Engagement
  { name: "Reactions", family: "react", group: "Engagement", description: "The reaction row under a bubble, with counts and your own pick.", requires: ["reactions"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "ReactionList", family: "react", group: "Engagement", description: "Who reacted, and with what, for one message.", requires: ["reactions"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },

  // Calling
  { name: "CallLogs", family: "react", group: "Calling", description: "Call history with direction, duration, outcome and quality.", requires: ["calls"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "CallButtons", family: "react", group: "Calling", description: "Voice and video buttons that start a call from anywhere in the UI.", requires: ["calls"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "IncomingCall", family: "react", group: "Calling", description: "The incoming-call surface: caller, avatar, accept and decline.", requires: ["calls"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "OutgoingCall", family: "react", group: "Calling", description: "The outgoing-call surface: dialling, ringing and cancelling.", requires: ["calls"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },
  { name: "OngoingCall", family: "react", group: "Calling", description: "The in-call surface: video, audio, mute, screen share, quality stats.", requires: ["calls"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "stable" },

  // AI
  { name: "AIAssistantChat", family: "react", group: "AI", description: "An assistant that lives in the app: asks about your data, answers, acts.", requires: ["ai"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "beta" },
  { name: "SmartReplies", family: "react", group: "AI", description: "Suggested replies derived from the last message and the thread's context.", requires: ["ai"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "beta" },
  { name: "MessageSummary", family: "react", group: "AI", description: "A digest of a long thread, refreshed as the conversation grows.", requires: ["ai"], platforms: ["react", "angular", "react-native", "ios", "android", "flutter"], status: "beta" },
];

/** The theming contract — CSS custom properties, per family. */
export const THEME_TOKENS: {
  token: string;
  group: "colour" | "shape" | "typography" | "spacing" | "motion";
  react: string;
  android: string;
  ios: string;
  flutter: string;
}[] = [
  { token: "--chat-primary", group: "colour", react: "#3b64f6", android: "colorPrimary", ios: "accentColor", flutter: "primaryColor" },
  { token: "--chat-secondary", group: "colour", react: "#14b8a6", android: "colorSecondary", ios: "tintColor", flutter: "secondaryColor" },
  { token: "--chat-surface", group: "colour", react: "#ffffff", android: "colorSurface", ios: "systemBackground", flutter: "surface" },
  { token: "--chat-on-surface", group: "colour", react: "#0f172a", android: "onSurface", ios: "label", flutter: "onSurface" },
  { token: "--chat-outline", group: "colour", react: "#e2e8f0", android: "colorOutline", ios: "separator", flutter: "outline" },
  { token: "--chat-bubble-in", group: "colour", react: "#f1f5f9", android: "bubbleIncoming", ios: "bubbleIncoming", flutter: "bubbleIncoming" },
  { token: "--chat-bubble-out", group: "colour", react: "#3b64f6", android: "bubbleOutgoing", ios: "bubbleOutgoing", flutter: "bubbleOutgoing" },
  { token: "--chat-radius-bubble", group: "shape", react: "18px", android: "18dp", ios: "18pt", flutter: "18" },
  { token: "--chat-radius-composer", group: "shape", react: "24px", android: "24dp", ios: "24pt", flutter: "24" },
  { token: "--chat-avatar-radius", group: "shape", react: "50%", android: "circle", ios: "circle", flutter: "circle" },
  { token: "--chat-font-family", group: "typography", react: "system-ui", android: "sans-serif", ios: "SF Pro", flutter: "systemFont" },
  { token: "--chat-font-size-base", group: "typography", react: "15px", android: "15sp", ios: "15pt", flutter: "15" },
  { token: "--chat-space-4", group: "spacing", react: "4px", android: "4dp", ios: "4pt", flutter: "4" },
  { token: "--chat-space-8", group: "spacing", react: "8px", android: "8dp", ios: "8pt", flutter: "8" },
  { token: "--chat-motion-fast", group: "motion", react: "120ms", android: "120ms", ios: "0.12s", flutter: "120ms" },
  { token: "--chat-motion-base", group: "motion", react: "220ms", android: "220ms", ios: "0.22s", flutter: "220ms" },
];

/** Accessibility contract — what every component must satisfy. */
export const A11Y_CHECKS: {
  id: string;
  title: string;
  detail: string;
  level: "A" | "AA" | "AAA";
  family: "all" | "bubble" | "composer" | "calling" | "ai";
}[] = [
  { id: "a11y_focus", title: "Visible focus ring on every interactive element", detail: "Focus is never removed, and never invisible. A keyboard user can always see where they are.", level: "AA", family: "all" },
  { id: "a11y_aria", title: "Bubble carries an accessible name and role", detail: "Each bubble announces the sender, the media type and the delivery state, not just the text.", level: "AA", family: "bubble" },
  { id: "a11y_alt", title: "Images carry meaningful alternative text", detail: "A decorative image is marked as such; a screenshot is described. Voice notes carry a transcript.", level: "AA", family: "bubble" },
  { id: "a11y_live", title: "Incoming messages announce politely", detail: "A live region announces new messages without stealing focus.", level: "AA", family: "bubble" },
  { id: "a11y_target", title: "Touch targets are at least 44×44", detail: "Small icons still get a 44-point hit area.", level: "AA", family: "all" },
  { id: "a11y_contrast", title: "Text meets 4.5:1 against its bubble", detail: "Bubbles are checked in both themes; the outgoing bubble ships with a measured contrast pair.", level: "AA", family: "bubble" },
  { id: "a11y_reduce", title: "Motion respects reduced-motion", detail: "Animations collapse to an instant state change when the OS asks for less motion.", level: "AAA", family: "all" },
  { id: "a11y_composer", title: "Composer is a labelled text field with a shortcut hint", detail: "The field announces itself, the send action has a label, and Enter-to-send is documented in the hint.", level: "AA", family: "composer" },
  { id: "a11y_call", title: "Call controls are announced by action", detail: "Mute, camera and screen share announce their new state, not just their icon.", level: "AA", family: "calling" },
  { id: "a11y_ai", title: "AI output is attributed and dismissible", detail: "Assistant messages are labelled as generated and can be closed or regenerated.", level: "AA", family: "ai" },
];

/** Localisation coverage. */
export const LOCALES: { code: string; label: string; progress: number; rtl: boolean }[] = [
  { code: "en", label: "English", progress: 100, rtl: false },
  { code: "es", label: "Español", progress: 100, rtl: false },
  { code: "fr", label: "Français", progress: 100, rtl: false },
  { code: "de", label: "Deutsch", progress: 100, rtl: false },
  { code: "pt-BR", label: "Português (Brasil)", progress: 100, rtl: false },
  { code: "ar", label: "العربية", progress: 94, rtl: true },
  { code: "zh-CN", label: "简体中文", progress: 100, rtl: false },
  { code: "ja", label: "日本語", progress: 88, rtl: false },
  { code: "hi", label: "हिन्दी", progress: 81, rtl: false },
  { code: "he", label: "עברית", progress: 76, rtl: true },
];

/** Extension features a host app can switch on. */
export const EXTENSIONS: {
  id: string;
  name: string;
  description: string;
  category: "ai" | "moderation" | "messaging" | "calling" | "engagement";
}[] = [
  { id: "ai-assistant", name: "AI Assistant", description: "An assistant user in the conversation that answers questions about the workspace.", category: "ai" },
  { id: "ai-summary", name: "Conversation Summary", description: "A running digest of a long thread, generated on demand.", category: "ai" },
  { id: "ai-sentiment", name: "AI Sentiment", description: "Per-message sentiment, surfaced to agents and dashboards.", category: "ai" },
  { id: "moderation", name: "Moderation", description: "Profanity, spam and PII detection with reporting and block lists.", category: "moderation" },
  { id: "profanity-filter", name: "Profanity Filter", description: "Masks or blocks profanity, with per-word allow lists.", category: "moderation" },
  { id: "stickers", name: "Stickers", description: "Sticker packs with an in-conversation keyboard.", category: "engagement" },
  { id: "polls", name: "Polls", description: "Single and multiple choice polls with live tallies.", category: "engagement" },
  { id: "threads", name: "Threads", description: "Reply chains under a message, with subscription and unread counts.", category: "messaging" },
  { id: "message-pinning", name: "Message Pinning", description: "Pin important messages to the top of a conversation.", category: "messaging" },
  { id: "voice-message", name: "Voice Message", description: "Record and send a voice note with a waveform and transcript.", category: "messaging" },
  { id: "collaborative-document", name: "Collaborative Document", description: "A shared document inside a message, edited together.", category: "messaging" },
  { id: "collaborative-whiteboard", name: "Collaborative Whiteboard", description: "A shared canvas attached to a message.", category: "messaging" },
  { id: "calls", name: "Voice & Video Calling", description: "One-to-one and group calls with a full call log.", category: "calling" },
  { id: "conversation-search", name: "Conversation Search", description: "Full-text search across conversations and messages.", category: "messaging" },
  { id: "message-bookmarks", name: "Saved Messages", description: "A private collection of saved messages.", category: "engagement" },
  { id: "push-notifications", name: "Push Notifications", description: "Background delivery for offline users, with per-conversation routing.", category: "messaging" },
  { id: "live-tracking", name: "Live Location", description: "Share a position that expires automatically.", category: "messaging" },
];

/* ------------------------------------------------------------------ */
/* session, auth and live-state surfaces                                */
/* ------------------------------------------------------------------ */

export interface AuthStep {
  id: string;
  step: string;
  who: string;
  detail: string;
  artifact: string;
  ttl: string;
}

export const AUTH_FLOW: AuthStep[] = [
  {
    id: "af1",
    step: "App key",
    who: "Your server",
    detail:
      "The app key never reaches a client. It is the only credential the server holds, and it is used to sign, never to authenticate a browser directly.",
    artifact: "appKey held in a secret store",
    ttl: "rotated on a schedule",
  },
  {
    id: "af2",
    step: "User token",
    who: "Your server → your client",
    detail:
      "After your own login succeeds, the server mints a short-lived user token scoped to that user and that workspace. It is exchanged over TLS and never written to a log.",
    artifact: "signed JWT, `uid` + `role` + `exp`",
    ttl: "30 minutes",
  },
  {
    id: "af3",
    step: "Session token",
    who: "Your client → the chat service",
    detail:
      "The client exchanges the user token for a session token bound to the device. The chat service validates the signature itself — it never calls your server on every request.",
    artifact: "session token, device-bound",
    ttl: "renewed every 15 minutes",
  },
  {
    id: "af4",
    step: "Live token",
    who: "Your client → the chat service",
    detail:
      "Real-time messaging and calls need their own token with an explicit user list, because the WebSocket and the REST API authenticate differently.",
    artifact: "live token, `users` claim",
    ttl: "5 minutes",
  },
  {
    id: "af5",
    step: "Revocation",
    who: "Your server",
    detail:
      "Revoking a user revokes the live token immediately and marks the session token for expiry. A deleted user gets a fresh rejection on the next request.",
    artifact: "revocation list checked at session start",
    ttl: "effective on the next request",
  },
];

export const AUTH_HEADERS = `// 1. your server mints the user token
const res = await fetch("/api/chat/session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ uid: user.id }),
});
const { token } = await res.json();

// 2. the client exchanges it for a session token
await CometChat.login({ token });

// 3. and for a live token used by messaging and calls
const liveToken = await CometChat.createToken(
  CometChat.TokenType.Live,
  { uid: user.id },
);`;

export interface PresenceState {
  id: string;
  label: string;
  colour: string;
  meaning: string;
  visibleTo: string;
}

export const PRESENCE_STATES: PresenceState[] = [
  {
    id: "online",
    label: "Online",
    colour: "#22c55e",
    meaning: "The app is open and the socket is connected.",
    visibleTo: "Everyone except blocked contacts",
  },
  {
    id: "away",
    label: "Away",
    colour: "#f59e0b",
    meaning: "The app is open but idle past the threshold.",
    visibleTo: "Everyone",
  },
  {
    id: "busy",
    label: "Do not disturb",
    colour: "#ef4444",
    meaning: "Notifications are suppressed; calls still arrive.",
    visibleTo: "Everyone",
  },
  {
    id: "recently_active",
    label: "Recently active",
    colour: "#8b5cf6",
    meaning: "Last seen within the last few minutes.",
    visibleTo: "Everyone",
  },
  {
    id: "offline",
    label: "Offline",
    colour: "#94a3b8",
    meaning: "The app is closed or the socket has dropped.",
    visibleTo: "Everyone",
  },
  {
    id: "hidden",
    label: "Hidden",
    colour: "#64748b",
    meaning: "The user has opted out of presence entirely.",
    visibleTo: "Nobody",
  },
];

export interface SurfaceSpec {
  id: string;
  name: string;
  group: "Calling" | "Conversations" | "Utilities";
  states: string[];
  detail: string;
  platforms: KitFamily[];
}

export const SURFACES: SurfaceSpec[] = [
  {
    id: "sf_details",
    name: "Details side panel",
    group: "Conversations",
    states: [
      "Profile header",
      "Media gallery",
      "Group members",
      "Pinned messages",
      "Shared links",
      "Settings",
    ],
    detail:
      "A second panel beside the conversation, not a modal. It keeps its own scroll position per conversation and remembers the last tab it was on.",
    platforms: ["react", "angular", "react-native", "ios", "android", "flutter"],
  },
  {
    id: "sf_typing",
    name: "Typing indicator",
    group: "Utilities",
    states: ["Idle", "One person typing", "Several people typing", "Stopped"],
    detail:
      "Three animated dots for a single person, and a named list for several. The indicator is throttled so a fast typist does not flood the socket.",
    platforms: ["react", "angular", "react-native", "ios", "android", "flutter"],
  },
  {
    id: "sf_presence",
    name: "Presence badge",
    group: "Utilities",
    states: PRESENCE_STATES.map((p) => p.label),
    detail:
      "A coloured dot on the avatar. Hidden states are hidden for the person who set them, not for everybody.",
    platforms: ["react", "angular", "react-native", "ios", "android", "flutter"],
  },
  {
    id: "sf_conference",
    name: "Conference call",
    group: "Calling",
    states: [
      "Joining",
      "In the call",
      "Muted",
      "Camera off",
      "Screen sharing",
      "Reconnecting",
      "Left",
    ],
    detail:
      "A multi-party call with a grid, a speaker list and a single control bar. A participant who drops is re-offered with one tap rather than silently vanishing.",
    platforms: ["react", "angular", "react-native", "ios", "android", "flutter"],
  },
  {
    id: "sf_calllogs",
    name: "Call logs",
    group: "Calling",
    states: ["Completed", "Unanswered", "Busy", "Failed", "Cancelled", "Rejected"],
    detail:
      "Every call with its direction, duration, outcome and — when it is a media call — the quality figures the client measured.",
    platforms: ["react", "angular", "react-native", "ios", "android", "flutter"],
  },
  {
    id: "sf_badge",
    name: "Unread badge",
    group: "Conversations",
    states: ["Count", "Dot", "Muted", "Mentions only"],
    detail:
      "Counts unread messages per conversation, collapses to a dot above ninety-nine, and changes to a mention count when somebody names you.",
    platforms: ["react", "angular", "react-native", "ios", "android", "flutter"],
  },
];
