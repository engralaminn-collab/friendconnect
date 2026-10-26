/**
 * hi-kid style safety layer — the rules and controls a guardian gets, and the
 * filters a kid-safe messenger applies before a message is ever delivered.
 */

export interface GuardianControl {
  id: string;
  label: string;
  description: string;
  default: string;
  options: string[];
  icon: string;
  group: "access" | "content" | "time" | "privacy" | "data";
}

export const GUARDIAN_CONTROLS: GuardianControl[] = [
  {
    id: "approved_contacts",
    label: "Approved contacts",
    description:
      "Only people on this list can message or call the device. Everything else is silently dropped.",
    default: "Family and school only",
    options: ["Anyone", "Family and school only", "Approved list only"],
    icon: "👥",
    group: "access",
  },
  {
    id: "group_chats",
    label: "Group chats",
    description:
      "Groups are where a child most often meets a stranger. Off by default under 13.",
    default: "Off under 13",
    options: ["Always on", "On for approved groups", "Off under 13", "Never"],
    icon: "👥",
    group: "access",
  },
  {
    id: "voice_video",
    label: "Voice and video calls",
    description:
      "Calls open a live channel, so they get their own switch rather than following the chat rule.",
    default: "Approved contacts only",
    options: ["Always on", "Approved contacts only", "Never"],
    icon: "📞",
    group: "access",
  },
  {
    id: "links_filter",
    label: "Link filtering",
    description:
      "External links are wrapped behind a warning that explains where the link goes before it opens.",
    default: "Warn on every link",
    options: ["Off", "Warn on every link", "Block known unsafe domains"],
    icon: "🔗",
    group: "content",
  },
  {
    id: "keyword_filter",
    label: "Keyword and phrase filter",
    description:
      "Blocks grooming language, adult content and personal-information requests. Matches on a normalised form so spacing tricks do not get past it.",
    default: "Strict",
    options: ["Off", "Moderate", "Strict"],
    icon: "🚫",
    group: "content",
  },
  {
    id: "media_filter",
    label: "Media filter",
    description:
      "Images and video are scanned before delivery. Unknown or adult material is held for a guardian.",
    default: "Hold suspicious media",
    options: ["Allow all", "Hold suspicious media", "Block all media"],
    icon: "🖼️",
    group: "content",
  },
  {
    id: "image_blur",
    label: "Blur unknown senders",
    description:
      "Photos from people who are not on the approved list arrive blurred until a guardian approves them.",
    default: "On",
    options: ["On", "Off"],
    icon: "🌫️",
    group: "content",
  },
  {
    id: "quiet_hours",
    label: "Quiet hours",
    description:
      "No sound, no vibration, no notification preview. Calls still arrive, but silently.",
    default: "21:00 – 07:00",
    options: ["20:00 – 07:00", "21:00 – 07:00", "22:00 – 06:00", "Never"],
    icon: "🌙",
    group: "time",
  },
  {
    id: "screen_time",
    label: "Daily screen-time budget",
    description:
      "The messenger locks itself after the budget is spent. The guardian can extend it from their own device.",
    default: "45 minutes",
    options: ["30 minutes", "45 minutes", "60 minutes", "90 minutes"],
    icon: "⏱️",
    group: "time",
  },
  {
    id: "read_receipts",
    label: "Read receipts",
    description:
      "Turning them off stops a child from learning when someone is online.",
    default: "Off for kids",
    options: ["Always on", "Off for kids", "Never"],
    icon: "✓",
    group: "privacy",
  },
  {
    id: "last_seen",
    label: "Last seen and online status",
    description: "Hidden in kid-safe mode for every contact.",
    default: "Hidden",
    options: ["Visible", "Hidden"],
    icon: "🕐",
    group: "privacy",
  },
  {
    id: "location_sharing",
    label: "Location sharing",
    description:
      "Live location is off unless a guardian turns it on for a specific conversation.",
    default: "Ask each time",
    options: ["Always on", "Ask each time", "Never"],
    icon: "📍",
    group: "privacy",
  },
  {
    id: "data_export",
    label: "Guardian visibility",
    description:
      "The guardian sees the thread list, the safety log and the flagged items — never the message content unless a message was flagged.",
    default: "Safety log only",
    options: ["Safety log only", "Full transcript", "Nothing"],
    icon: "👁️",
    group: "data",
  },
  {
    id: "export_data",
    label: "Export the safety log",
    description:
      "A signed, dated record of every filter hit, held message and guardian decision.",
    default: "On demand",
    options: ["On demand", "Weekly", "Never"],
    icon: "📄",
    group: "data",
  },
];

export interface AgeBand {
  id: string;
  label: string;
  range: string;
  /** Control id → option value loaded when this band is chosen. */
  defaults: Record<string, string>;
  note: string;
}

export const AGE_BANDS: AgeBand[] = [
  {
    id: "under_8",
    label: "Little",
    range: "Under 8",
    defaults: {
      approved_contacts: "Approved list only",
      group_chats: "Never",
      voice_video: "Approved contacts only",
      links_filter: "Block known unsafe domains",
      keyword_filter: "Strict",
      media_filter: "Block all media",
      image_blur: "On",
      quiet_hours: "20:00 – 07:00",
      screen_time: "30 minutes",
      read_receipts: "Off for kids",
      last_seen: "Hidden",
      location_sharing: "Never",
      data_export: "Safety log only",
      export_data: "Weekly",
    },
    note: "Text and stickers only. No groups, no calls to anyone but the approved list.",
  },
  {
    id: "9_12",
    label: "Explorer",
    range: "9 – 12",
    defaults: {
      approved_contacts: "Approved list only",
      group_chats: "Never",
      voice_video: "Approved contacts only",
      links_filter: "Warn on every link",
      keyword_filter: "Strict",
      media_filter: "Hold suspicious media",
      image_blur: "On",
      quiet_hours: "21:00 – 07:00",
      screen_time: "45 minutes",
      read_receipts: "Off for kids",
      last_seen: "Hidden",
      location_sharing: "Ask each time",
      data_export: "Safety log only",
      export_data: "On demand",
    },
    note: "Groups stay off. Media from unknown senders is held for a guardian.",
  },
  {
    id: "13_15",
    label: "Teen",
    range: "13 – 15",
    defaults: {
      approved_contacts: "Family and school only",
      group_chats: "On for approved groups",
      voice_video: "Approved contacts only",
      links_filter: "Warn on every link",
      keyword_filter: "Moderate",
      media_filter: "Hold suspicious media",
      image_blur: "On",
      quiet_hours: "21:00 – 07:00",
      screen_time: "60 minutes",
      read_receipts: "Off for kids",
      last_seen: "Visible",
      location_sharing: "Ask each time",
      data_export: "Safety log only",
      export_data: "On demand",
    },
    note: "Groups open up, but only groups a guardian has approved.",
  },
  {
    id: "16_plus",
    label: "Almost there",
    range: "16 and over",
    defaults: {
      approved_contacts: "Family and school only",
      group_chats: "Always on",
      voice_video: "Approved contacts only",
      links_filter: "Warn on every link",
      keyword_filter: "Moderate",
      media_filter: "Allow all",
      image_blur: "Off",
      quiet_hours: "22:00 – 06:00",
      screen_time: "90 minutes",
      read_receipts: "Always on",
      last_seen: "Visible",
      location_sharing: "Ask each time",
      data_export: "Safety log only",
      export_data: "On demand",
    },
    note: "Everything a normal messenger does, with the safety log still switched on.",
  },
];

/** The control values an age band loads, keyed by control id. */
export function bandDefaults(
  bandId: AgeBand["id"],
): Record<string, string> {
  const band = AGE_BANDS.find((b) => b.id === bandId) ?? AGE_BANDS[1];
  return { ...band.defaults };
}

export interface SafetyRule {
  id: string;
  title: string;
  detail: string;
  severity: "block" | "hold" | "warn";
  category: "grooming" | "adult" | "personal" | "link" | "scam";
}

export const SAFETY_RULES: SafetyRule[] = [
  {
    id: "r_grooming",
    title: "Grooming language",
    detail:
      "An adult asking a child to meet alone, move the conversation off-platform, or keep it secret.",
    severity: "block",
    category: "grooming",
  },
  {
    id: "r_adult",
    title: "Adult content",
    detail: "Explicit content is blocked outright and recorded in the safety log.",
    severity: "block",
    category: "adult",
  },
  {
    id: "r_personal",
    title: "Personal information requests",
    detail:
      "Asking for a home address, school name, phone number or a parent's details.",
    severity: "hold",
    category: "personal",
  },
  {
    id: "r_link",
    title: "Unfamiliar link",
    detail:
      "A shortened or newly-registered domain. The child sees a plain-language warning before anything opens.",
    severity: "warn",
    category: "link",
  },
  {
    id: "r_scam",
    title: "Prize and gift scam",
    detail:
      "Free gift, prize, or verification code requests — the classic hooks that lead to a stolen account.",
    severity: "hold",
    category: "scam",
  },
  {
    id: "r_stranger",
    title: "Message from a stranger",
    detail:
      "A first contact from somebody who is not on the approved list. It arrives blurred and queued.",
    severity: "warn",
    category: "personal",
  },
];

/** Phrases the filter recognises. Normalised before matching. */
export const BLOCKED_PHRASES: string[] = [
  "meet me alone",
  "keep this a secret",
  "dont tell your parents",
  "don't tell your parents",
  "what is your address",
  "where do you live",
  "which school do you go to",
  "send me a photo",
  "send me your number",
  "free gift",
  "you have won",
  "verification code",
  "click this link now",
  "private chat",
  "adults only",
];

export const KID_SAFE_PILLARS: { id: string; title: string; detail: string; icon: string }[] = [
  {
    id: "contact",
    title: "Only the people you approve",
    detail:
      "A message from anyone else never reaches the child. It is filtered at the gateway, not on the device, so nothing is even downloaded.",
    icon: "🛡️",
  },
  {
    id: "read",
    title: "Plain words, not filter words",
    detail:
      "The rules read like a parent would speak them. No jargon, no scary error codes, no silent failure — the child is told something was held, and why.",
    icon: "💬",
  },
  {
    id: "time",
    title: "Time that belongs to a child",
    detail:
      "Quiet hours and a screen-time budget set by the guardian, with the lock applied on the server so it cannot be bypassed by reinstalling.",
    icon: "⏳",
  },
  {
    id: "privacy",
    title: "No tracking back",
    detail:
      "Location sharing is off by default, read receipts are off, and the guardian sees the safety log rather than a transcript.",
    icon: "🔒",
  },
];

export const SAFETY_LOG_SEED: {
  id: string;
  at: string;
  kind: "blocked" | "held" | "warned" | "approved" | "expired";
  what: string;
  detail: string;
}[] = [
  {
    id: "sl1",
    at: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    kind: "warned",
    what: "Link in a message from an unapproved contact",
    detail: "bit.ly/2xYk9 — a newly registered domain. The child saw a warning and did not open it.",
  },
  {
    id: "sl2",
    at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    kind: "held",
    what: "Photo from an unapproved contact",
    detail: "Held for guardian review. Nobody saw the image until it was approved.",
  },
  {
    id: "sl3",
    at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    kind: "blocked",
    what: "Message matched a personal-information rule",
    detail: "The sender asked which school the child attends. The message was never delivered.",
  },
  {
    id: "sl4",
    at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    kind: "expired",
    what: "Disappearing message reached the end of its timer",
    detail: "A 24-hour message expired on schedule, as configured.",
  },
  {
    id: "sl5",
    at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    kind: "approved",
    what: "Guardian approved a new contact",
    detail: "Added to the approved list after a video call with a guardian.",
  },
];
