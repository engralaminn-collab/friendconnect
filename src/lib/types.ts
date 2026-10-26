/* ============================================================
   FriendConnect — domain model
   ============================================================ */

export type ID = string;
export type Stage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export interface Contact {
  id: ID;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  country?: string;
  city?: string;
  tags: string[];
  stage: Stage;
  value: number;
  source: string;
  owner: string;
  notes?: string;
  starred?: boolean;
  avatarHue: number;
  createdAt: string;
  lastContact: string;
}

export interface Company {
  id: ID;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  country?: string;
  employees?: number;
  revenue?: number;
  description?: string;
  logoHue: number;
  createdAt: string;
}

export interface Deal {
  id: ID;
  title: string;
  value: number;
  stage: Stage;
  contactId?: ID;
  companyId?: ID;
  probability: number;
  closeDate: string;
  createdAt: string;
  notes?: string;
  tags: string[];
}

export interface Lead {
  id: ID;
  name: string;
  email: string;
  company: string;
  role?: string;
  score: number;
  signals: string[];
  status: "new" | "enriched" | "qualified" | "contacted" | "converted" | "lost";
  source: string;
  createdAt: string;
}

export interface Activity {
  id: ID;
  type: "call" | "email" | "meeting" | "note" | "task" | "stage_change";
  title: string;
  detail?: string;
  contactId?: ID;
  dealId?: ID;
  due?: string;
  done: boolean;
  createdAt: string;
}

export interface Task {
  id: ID;
  title: string;
  done: boolean;
  priority: "low" | "medium" | "high";
  due?: string;
  module: string;
  createdAt: string;
}

/* ---------------- Education ---------------- */

export interface University {
  id: ID;
  name: string;
  country: string;
  city: string;
  ranking: number;
  tuition: number;
  currency: string;
  intakes: string[];
  programs: string[];
  scholarships: boolean;
  logoHue: number;
  description: string;
  website: string;
}

export interface Course {
  id: ID;
  title: string;
  code: string;
  universityId: ID;
  level: "Foundation" | "UG" | "PG" | "Research";
  duration: string;
  ielts: string;
  tuition: number;
  tags: string[];
}

export interface Student {
  id: ID;
  name: string;
  email: string;
  country: string;
  level: string;
  targetCourseId?: ID;
  status: "enquiry" | "shortlisted" | "applied" | "offer" | "visa" | "enrolled" | "lost";
  budget: number;
  createdAt: string;
  avatarHue: number;
}

export interface Application {
  id: ID;
  studentId: ID;
  universityId: ID;
  courseId?: ID;
  status: "drafting" | "documents" | "submitted" | "interview" | "offer" | "rejected" | "accepted";
  progress: number;
  dueDate: string;
  checklist: { id: ID; label: string; done: boolean }[];
  notes?: string;
}

export interface StudySession {
  id: ID;
  subject: string;
  topic: string;
  plannedMinutes: number;
  loggedMinutes: number;
  date: string;
  done: boolean;
  confidence: number;
}

/* ---------------- Marketing ---------------- */

export interface Article {
  id: ID;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: "idea" | "draft" | "review" | "published";
  keywords: string[];
  readTime: number;
  views: number;
  conversions: number;
  seoScore: number;
  tone: string;
  createdAt: string;
  publishedAt?: string;
}

export interface Campaign {
  id: ID;
  name: string;
  channel: "email" | "social" | "ads" | "webinar" | "sms";
  status: "draft" | "scheduled" | "running" | "paused" | "complete";
  audience: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  budget: number;
  startDate: string;
  endDate: string;
  subject?: string;
  body?: string;
}

export interface SocialPost {
  id: ID;
  platform: "LinkedIn" | "X" | "Instagram" | "Facebook" | "TikTok" | "YouTube";
  caption: string;
  hashtags: string[];
  scheduledFor: string;
  status: "draft" | "scheduled" | "published";
  media: "none" | "carousel" | "video" | "image" | "thread";
  engagement: number;
}

export interface SeoAudit {
  id: ID;
  url: string;
  title: string;
  description: string;
  score: number;
  keywords: string[];
  checks: { label: string; pass: boolean; detail: string }[];
  scannedAt: string;
}

/* ---------------- Studios ---------------- */

export interface DiagramNode {
  id: ID;
  type: "process" | "decision" | "data" | "actor" | "start" | "end" | "note";
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface DiagramEdge {
  id: ID;
  from: ID;
  to: ID;
  label?: string;
  dashed?: boolean;
}

export interface Diagram {
  id: ID;
  name: string;
  description: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  template: string;
  updatedAt: string;
}

export interface VideoScene {
  id: ID;
  index: number;
  title: string;
  narration: string;
  duration: number;
  shot: string;
  transition: string;
  color: string;
}

export interface VideoProject {
  id: ID;
  title: string;
  format: "short" | "long" | "square" | "explainer";
  hook: string;
  scenes: VideoScene[];
  status: "idea" | "scripting" | "production" | "editing" | "published";
  aspect: string;
  voice: string;
  captions: { time: string; text: string }[];
  createdAt: string;
  duration: number;
}

export interface VoiceClip {
  id: ID;
  title: string;
  text: string;
  voice: string;
  rate: number;
  pitch: number;
  duration: number;
  createdAt: string;
  tags: string[];
}

export interface Agent {
  id: ID;
  name: string;
  role: string;
  description: string;
  model: string;
  tools: string[];
  temperature: number;
  runs: number;
  successRate: number;
  createdAt: string;
}

export interface AgentRun {
  id: ID;
  agentId: ID;
  prompt: string;
  steps: { tool: string; input: string; output: string; ms: number }[];
  status: "running" | "success" | "error";
  startedAt: string;
}

export interface Note {
  id: ID;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string;
  createdAt: string;
  color: string;
}

export interface WikiPage {
  id: ID;
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  links: string[];
  updatedAt: string;
}

export interface Plugin {
  id: ID;
  name: string;
  slug: string;
  description: string;
  category: string;
  author: string;
  downloads: number;
  rating: number;
  version: string;
  installed: boolean;
  featured?: boolean;
  tags: string[];
}

export interface ApiDefinition {
  id: ID;
  name: string;
  slug: string;
  category: string;
  description: string;
  auth: "none" | "api-key" | "oauth2" | "basic";
  https: boolean;
  cors: boolean;
  rating: number;
  reviews: number;
  url: string;
  tags: string[];
}

/* ------------------------------------------------------------------ */
/* Private messaging                                                    */
/* ------------------------------------------------------------------ */

export type MessageKind =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "location"
  | "poll"
  | "contact"
  | "system";

export interface PollOption {
  label: string;
  votes: number;
}

export interface MediaAttachment {
  kind:
    | "image"
    | "video"
    | "audio"
    | "voice"
    | "document"
    | "location"
    | "contact"
    | "poll";
  name: string;
  sizeLabel: string;
  mime: string;
  /** Deterministic artwork seed — renders offline with no stored bytes. */
  seed?: string;
  /** Audio and voice note runtime in seconds. */
  durationSec?: number;
  /** Video resolution label, e.g. "1080p". */
  resolution?: string;
  /** Video or image dimensions. */
  width?: number;
  height?: number;
  /** Location payload. */
  lat?: number;
  lng?: number;
  address?: string;
  /** Poll payload. */
  poll?: {
    question: string;
    options: PollOption[];
    totalVotes: number;
    myOption?: number;
  };
  /** Shared contact card. */
  contactCard?: { name: string; phone: string; company?: string };
  /** Caption typed alongside the media. */
  caption?: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface Message {
  id: ID;
  from: "me" | "them";
  body: string;
  at: string;
  status?: "sent" | "delivered" | "read" | "failed";
  attachment?: string;
  /** Defaults to "text" when omitted. */
  kind?: MessageKind;
  media?: MediaAttachment;
  replyTo?: ID;
  reactions?: Reaction[];
  edited?: boolean;
  forwarded?: boolean;
  starred?: boolean;
  deleted?: boolean;
  /** Delivery latency in seconds, shown next to the tick. */
  latencySec?: number;
  /** System message kind: added, left, call, media, changed, security. */
  systemKind?: "added" | "left" | "call" | "media" | "changed" | "security";
}

export interface Thread {
  id: ID;
  channel: "sms" | "whatsapp" | "voip" | "email";
  contactName: string;
  contactId?: ID;
  messages: Message[];
  unread: number;
  updatedAt: string;
  status: "open" | "waiting" | "resolved";
  avatarHue?: number;
  about?: string;
  phone?: string;
  email?: string;
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  typing?: boolean;
  /** Wallpaper seed for the chat background. */
  wallpaper?: string;
  labels?: string[];
  verified?: boolean;
  business?: boolean;
  /** Disappearing-message timer in seconds. 0 disables it. */
  disappearing?: number;
}

/* ------------------------------------------------------------------ */
/* Calling                                                              */
/* ------------------------------------------------------------------ */

export interface CallQuality {
  rttMs: number;
  jitterMs: number;
  lossPct: number;
  bitrateKbps: number;
  mos: number;
  codec: string;
}

export interface CallRecord {
  id: ID;
  contactName: string;
  contactId?: ID;
  direction: "incoming" | "outgoing" | "missed";
  kind: "audio" | "video";
  startedAt: string;
  durationSec: number;
  status: "completed" | "missed" | "declined" | "failed";
  quality: CallQuality;
  recording: boolean;
}

export interface DeviceProfile {
  id: ID;
  label: string;
  kind: "microphone" | "camera" | "speaker";
  default: boolean;
}

/* ------------------------------------------------------------------ */
/* Gateways and bridges                                                 */
/* ------------------------------------------------------------------ */

export type GatewayProvider =
  | "httpsms"
  | "domovina"
  | "comfyui"
  | "sip"
  | "webhook";

export interface GatewayConfig {
  id: ID;
  name: string;
  provider: GatewayProvider;
  description: string;
  baseUrl: string;
  authHeader: string;
  connected: boolean;
  capabilities: string[];
  lastSync?: string;
  monthlyVolume: number;
  /** Provider-specific settings. */
  settings: Record<string, string>;
}

export interface IpcChannel {
  name: string;
  direction: "invoke" | "emit" | "subscribe";
  description: string;
  calls: number;
  lastLatencyMs: number;
  lastError?: string;
}

export interface Post {
  id: ID;
  author: string;
  authorRole: string;
  avatarHue: number;
  body: string;
  topic: string;
  tags: string[];
  likes: number;
  comments: number;
  createdAt: string;
  liked?: boolean;
  pinned?: boolean;
}

export interface EventItem {
  id: ID;
  title: string;
  type: "webinar" | "deadline" | "meeting" | "launch" | "community";
  date: string;
  time?: string;
  description: string;
  attendees: number;
  location?: string;
  duration?: number;
}

export interface Notification {
  id: ID;
  title: string;
  body: string;
  kind: "success" | "info" | "warning" | "error";
  at: string;
  read: boolean;
}

export interface MetricPoint {
  label: string;
  value: number;
}

/* ------------------------------------------------------------------ */
/* Image studio                                                        */
/* ------------------------------------------------------------------ */

export type ImageModel =
  | "flux-1.1-pro"
  | "sdxl-turbo"
  | "dalle-3"
  | "gpt-image-1"
  | "stable-diffusion-3.5"
  | "ideogram-2";

export interface ImageJob {
  id: ID;
  prompt: string;
  negativePrompt: string;
  model: ImageModel;
  style: string;
  aspect: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  seed: number;
  steps: number;
  cfg: number;
  status: "queued" | "running" | "done";
  favorite: boolean;
  tags: string[];
  createdAt: string;
}

export interface PromptTemplate {
  id: ID;
  name: string;
  prompt: string;
  negative: string;
  category: string;
  tags: string[];
  uses: number;
}

export interface ComfyWorkflow {
  id: ID;
  name: string;
  description: string;
  nodes: {
    id: string;
    label: string;
    kind: "model" | "prompt" | "sampler" | "latent" | "save" | "load";
    x: number;
    y: number;
  }[];
  edges: { from: string; to: string }[];
}

/* ------------------------------------------------------------------ */
/* Dashboard builder                                                    */
/* ------------------------------------------------------------------ */

export type WidgetKind =
  | "metric"
  | "bar"
  | "line"
  | "donut"
  | "table"
  | "funnel"
  | "text";

export interface DashWidget {
  id: ID;
  kind: WidgetKind;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  source: string;
  metric: string;
  note?: string;
}

export interface DashBoard {
  id: ID;
  name: string;
  description: string;
  widgets: DashWidget[];
  updatedAt: string;
}
