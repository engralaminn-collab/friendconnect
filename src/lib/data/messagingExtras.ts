/**
 * Everything the messenger needs beyond plain chat: stickers, smart replies,
 * the notification feed, saved items, threaded replies and the AI assistant.
 */

export interface Sticker {
  id: string;
  emoji: string;
  label: string;
  pack: string;
}

export interface StickerPack {
  id: string;
  name: string;
  note: string;
  stickers: Sticker[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "pack_reactions",
    name: "Reactions",
    note: "The quick ones — a tap and it is sent.",
    stickers: [
      { id: "sr1", emoji: "👍", label: "Thumbs up", pack: "Reactions" },
      { id: "sr2", emoji: "❤️", label: "Heart", pack: "Reactions" },
      { id: "sr3", emoji: "😂", label: "Laugh", pack: "Reactions" },
      { id: "sr4", emoji: "😮", label: "Surprised", pack: "Reactions" },
      { id: "sr5", emoji: "😢", label: "Sad", pack: "Reactions" },
      { id: "sr6", emoji: "🙏", label: "Thanks", pack: "Reactions" },
      { id: "sr7", emoji: "🔥", label: "Fire", pack: "Reactions" },
      { id: "sr8", emoji: "🎉", label: "Celebrate", pack: "Reactions" },
    ],
  },
  {
    id: "pack_moods",
    name: "Moods",
    note: "How today went, without typing it.",
    stickers: [
      { id: "sm1", emoji: "😀", label: "Good", pack: "Moods" },
      { id: "sm2", emoji: "😅", label: "Survived it", pack: "Moods" },
      { id: "sm3", emoji: "🥱", label: "Tired", pack: "Moods" },
      { id: "sm4", emoji: "🤔", label: "Thinking", pack: "Moods" },
      { id: "sm5", emoji: "😤", label: "Frustrated", pack: "Moods" },
      { id: "sm6", emoji: "🥳", label: "Great news", pack: "Moods" },
    ],
  },
  {
    id: "pack_study",
    name: "Study",
    note: "For the education half of the workspace.",
    stickers: [
      { id: "ss1", emoji: "📚", label: "Books", pack: "Study" },
      { id: "ss2", emoji: "📝", label: "Notes", pack: "Study" },
      { id: "ss3", emoji: "✏️", label: "Writing", pack: "Study" },
      { id: "ss4", emoji: "🧮", label: "Maths", pack: "Study" },
      { id: "ss5", emoji: "🔬", label: "Science", pack: "Study" },
      { id: "ss6", emoji: "🎓", label: "Graduated", pack: "Study" },
    ],
  },
  {
    id: "pack_family",
    name: "Family",
    note: "The ones the family group actually uses.",
    stickers: [
      { id: "sf1", emoji: "🏠", label: "Home", pack: "Family" },
      { id: "sf2", emoji: "🍲", label: "Dinner", pack: "Family" },
      { id: "sf3", emoji: "🚌", label: "On the way", pack: "Family" },
      { id: "sf4", emoji: "🌧️", label: "Rain", pack: "Family" },
      { id: "sf5", emoji: "💤", label: "Good night", pack: "Family" },
      { id: "sf6", emoji: "🥘", label: "Dinner is ready", pack: "Family" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* smart replies                                                        */
/* ------------------------------------------------------------------ */

export interface SmartReply {
  id: string;
  text: string;
  tone: "casual" | "professional" | "warm" | "brief";
  context: "question" | "scheduling" | "meeting" | "pricing" | "thanks" | "apology" | "intro";
}

export const SMART_REPLIES: SmartReply[] = [
  { id: "sr_q1", text: "Good question — let me check and come back to you today.", tone: "professional", context: "question" },
  { id: "sr_q2", text: "Yes, that works for me. Shall I put it in the calendar?", tone: "casual", context: "question" },
  { id: "sr_q3", text: "Could you send a little more detail so I get this right?", tone: "professional", context: "question" },
  { id: "sr_s1", text: "Tuesday afternoon or Wednesday morning — does either suit you?", tone: "brief", context: "scheduling" },
  { id: "sr_s2", text: "I can do 14:00 or 16:30. Anything outside those and I am in meetings.", tone: "professional", context: "scheduling" },
  { id: "sr_m1", text: "Here is the link — it works on any device, no install needed.", tone: "brief", context: "meeting" },
  { id: "sr_m2", text: "I have moved it to Thursday so we have more time to cover it properly.", tone: "professional", context: "meeting" },
  { id: "sr_p1", text: "Our consults start at £900 and include a shortlist plus the document checklist.", tone: "professional", context: "pricing" },
  { id: "sr_p2", text: "I have sent the full breakdown — the one-off cost and the ongoing fee are on separate lines.", tone: "professional", context: "pricing" },
  { id: "sr_t1", text: "Thanks for turning that around so quickly — really appreciated.", tone: "warm", context: "thanks" },
  { id: "sr_t2", text: "Thank you! Glad that helped.", tone: "warm", context: "thanks" },
  { id: "sr_a1", text: "Apologies for the delay — that was on my side.", tone: "warm", context: "apology" },
  { id: "sr_a2", text: "Sorry about the confusion earlier. Here is the corrected version.", tone: "professional", context: "apology" },
  { id: "sr_i1", text: "Hi! Thanks for getting in touch — I am Amara, and I look after applications here.", tone: "professional", context: "intro" },
  { id: "sr_i2", text: "Hi there — good to hear from you. What are you hoping to apply for?", tone: "casual", context: "intro" },
];

export const SMART_REPLY_TONES: SmartReply["tone"][] = [
  "casual",
  "professional",
  "warm",
  "brief",
];

/* ------------------------------------------------------------------ */
/* notification feed                                                    */
/* ------------------------------------------------------------------ */

export interface FeedNotification {
  id: string;
  at: string;
  kind: "message" | "call" | "mention" | "safety" | "system";
  title: string;
  body: string;
  threadId?: string;
  read: boolean;
  actor?: string;
  hue?: number;
}

export const FEED_NOTIFICATIONS: FeedNotification[] = [
  {
    id: "fn1",
    at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    kind: "message",
    title: "Sam Osei",
    body: "The visa slot opens at nine — I will keep an eye on it.",
    threadId: "ch_samuel",
    read: false,
    actor: "SO",
    hue: 152,
  },
  {
    id: "fn2",
    at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    kind: "call",
    title: "Missed call — Meridian Bank",
    body: "Outgoing call, 0:12. Not answered.",
    threadId: "ch_meridian",
    read: false,
    actor: "MB",
    hue: 268,
  },
  {
    id: "fn3",
    at: new Date(Date.now() - 1000 * 60 * 46).toISOString(),
    kind: "mention",
    title: "Design team",
    body: "Karim mentioned you in the thread: “can you check the new bubble shadows?”",
    threadId: "ch_design",
    read: false,
    actor: "KT",
    hue: 18,
  },
  {
    id: "fn4",
    at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    kind: "safety",
    title: "Safety log updated",
    body: "One message was held for guardian review.",
    read: true,
  },
  {
    id: "fn5",
    at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    kind: "system",
    title: "Recording limit reached",
    body: "The Meridian call reached the 2-hour recording cap. Audio was stopped and the segment archived.",
    threadId: "ch_meridian",
    read: true,
  },
  {
    id: "fn6",
    at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    kind: "message",
    title: "Family",
    body: "Amara shared a photo in the family group.",
    threadId: "ch_family",
    read: true,
    actor: "AO",
    hue: 226,
  },
];

/* ------------------------------------------------------------------ */
/* saved items                                                          */
/* ------------------------------------------------------------------ */

export interface SavedItem {
  id: string;
  at: string;
  threadId: string;
  threadName: string;
  author: string;
  body: string;
  note: string;
  tag: "important" | "reference" | "todo" | "attachment";
}

/* ------------------------------------------------------------------ */
/* threaded replies                                                     */
/* ------------------------------------------------------------------ */

export interface ThreadReply {
  id: string;
  rootId: string;
  from: "me" | "them";
  author: string;
  body: string;
  at: string;
}

/* ------------------------------------------------------------------ */
/* AI assistant                                                         */
/* ------------------------------------------------------------------ */

export interface AssistantTurn {
  id: string;
  role: "user" | "assistant";
  body: string;
  at: string;
  chips?: string[];
}

export const ASSISTANT_CHIPS: string[] = [
  "Summarise this thread",
  "Draft a reply",
  "What did we agree?",
  "Extract the deadlines",
  "Translate to Bangla",
  "Make it sound warmer",
  "Turn this into a checklist",
  "Find the open questions",
];

export const ASSISTANT_ANSWERS: Record<string, string> = {
  "summarise this thread": "Amara has confirmed the Oxford conditional offer, the deposit deadline, and that the English test must be booked before the end of the month. The only open item is the financial evidence letter.",
  "draft a reply": "Thanks for confirming — that clears up the deposit question. I will book the English test this week and send the financial evidence on Monday. Shout if the deadline moves.",
  "what did we agree?": "Three things: the deposit date, who books the English test, and that we wait on the bank letter before paying anything. Nothing else has been committed.",
  "extract the deadlines": "• English test booked by Friday\n• Financial evidence letter — Monday\n• Deposit — 14 days after the bank letter arrives\n• University response window — 10 working days",
  "translate to bangla": "Here is the same message in Bangla, keeping the tone and leaving the names untranslated.",
  "make it sound warmer": "Thanks so much for confirming — that really takes the pressure off. I will book the English test this week and send the bank letter over on Monday. Shout if anything moves.",
  "turn this into a checklist": "1. Book the English test — before Friday\n2. Request the bank statement from the bank — Monday\n3. Assemble the financial evidence letter\n4. Wait for the bank letter before paying the deposit\n5. Confirm the university response inside 10 working days",
  "find the open questions": "• Which test centre has a slot before Friday?\n• Does the bank letter need to be certified?\n• Who pays the deposit if the deadline shifts?",
};

/* ------------------------------------------------------------------ */
/* reports                                                              */
/* ------------------------------------------------------------------ */

export interface ReportRecord {
  id: string;
  at: string;
  threadName: string;
  messageBody: string;
  reason: string;
  detail: string;
  status: "received" | "reviewing" | "actioned" | "closed";
}

export const REPORT_REASONS: { id: string; label: string; detail: string }[] = [
  { id: "spam", label: "Spam or scam", detail: "Unsolicited, promotional or an obvious fraud attempt." },
  { id: "abuse", label: "Harassment", detail: "Bullying, threats or repeated unwanted contact." },
  { id: "privacy", label: "Shares something private", detail: "Your contact details or something personal was shared without permission." },
  { id: "sexual", label: "Adult content", detail: "Sexual or adult material sent to you." },
  { id: "selfharm", label: "Self-harm or suicide", detail: "Content that suggests someone is at risk." },
  { id: "fake", label: "Not who they say they are", detail: "An impersonation, or an account pretending to be someone else." },
  { id: "other", label: "Something else", detail: "Anything the categories above do not cover." },
];
