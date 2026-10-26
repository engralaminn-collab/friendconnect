/* ============================================================
   Bill Agent — shared types
   ------------------------------------------------------------
   Everything the operator needs to drive the workspace: a tool
   contract a model can read, a strict JSON-schema subset, and
   the port through which a tool mutates workspace state.
   ============================================================ */

import type {
  Activity,
  Agent,
  ApiDefinition,
  Application,
  Article,
  CallRecord,
  Campaign,
  Company,
  Contact,
  Deal,
  DeviceProfile,
  Diagram,
  EventItem,
  GatewayConfig,
  ImageJob,
  Lead,
  MessageReport,
  Note,
  Notification,
  Plugin,
  Post,
  SafetySettings,
  SavedMessage,
  SeoAudit,
  SocialPost,
  Stage,
  Student,
  StudySession,
  Task,
  Thread,
  University,
  VideoProject,
  VoiceClip,
  WikiPage,
} from "@/lib/types";
import type { ExamAttempt } from "@/lib/exam";

/* ------------------------------------------------------------------ */
/* Tool contract                                                       */
/* ------------------------------------------------------------------ */

export type ToolGroup =
  | "crm"
  | "education"
  | "marketing"
  | "knowledge"
  | "messaging"
  | "studios"
  | "insights"
  | "operations";

/**
 * `read` never mutates anything, `write` creates or updates records,
 * `destructive` removes or rewrites records irreversibly.
 */
export type ToolRisk = "read" | "write" | "destructive";

export interface SchemaProperty {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  enum?: string[];
  items?: { type: "string" | "number" | "boolean" };
  default?: unknown;
}

/** The subset of JSON Schema the registry validates against. */
export interface ToolSchema {
  type: "object";
  properties: Record<string, SchemaProperty>;
  required: string[];
  additionalProperties: false;
}

export interface ToolResult {
  ok: boolean;
  /** One line a model can read back without parsing JSON. */
  summary: string;
  /** Structured payload for the UI and for follow-up steps. */
  data?: unknown;
}

export interface ToolExample {
  args: Record<string, unknown>;
  note: string;
}

export interface ToolDefinition {
  name: string;
  title: string;
  group: ToolGroup;
  description: string;
  risk: ToolRisk;
  /** True when the operator must confirm before the tool runs. */
  requiresApproval: boolean;
  schema: ToolSchema;
  examples?: ToolExample[];
  run: (ctx: ToolContext, args: Record<string, unknown>) => ToolResult | Promise<ToolResult>;
}

export interface ToolContext {
  workspace: WorkspacePort;
  now: () => Date;
}

/* ------------------------------------------------------------------ */
/* Workspace port                                                      */
/* ------------------------------------------------------------------ */

/**
 * The slice of the workspace store tools are allowed to touch.
 *
 * Tools never import the store directly: the page passes a live port and
 * the test-suite passes a plain object. That is the whole reason this
 * interface exists.
 */
export interface WorkspacePort {
  contacts: Contact[];
  companies: Company[];
  deals: Deal[];
  leads: Lead[];
  activities: Activity[];
  tasks: Task[];
  universities: University[];
  students: Student[];
  applications: Application[];
  studySessions: StudySession[];
  articles: Article[];
  campaigns: Campaign[];
  socialPosts: SocialPost[];
  seoAudits: SeoAudit[];
  diagrams: Diagram[];
  videos: VideoProject[];
  voiceClips: VoiceClip[];
  agents: Agent[];
  imageJobs: ImageJob[];
  notes: Note[];
  wikiPages: WikiPage[];
  plugins: Plugin[];
  apis: ApiDefinition[];
  threads: Thread[];
  calls: CallRecord[];
  devices: DeviceProfile[];
  gateways: GatewayConfig[];
  posts: Post[];
  events: EventItem[];
  notifications: Notification[];
  savedMessages: SavedMessage[];
  reports: MessageReport[];
  safety: SafetySettings;

  addContact: (contact: Omit<Contact, "id" | "createdAt" | "lastContact" | "avatarHue">) => Contact;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  removeContact: (id: string) => void;
  moveContactStage: (id: string, stage: Stage) => void;
  toggleContactStar: (id: string) => void;
  addCompany: (company: Omit<Company, "id" | "createdAt" | "logoHue">) => Company;
  addDeal: (deal: Omit<Deal, "id" | "createdAt">) => Deal;
  updateDeal: (id: string, patch: Partial<Deal>) => void;
  moveDeal: (id: string, stage: Stage) => void;
  removeDeal: (id: string) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  removeLead: (id: string) => void;
  addActivity: (activity: Omit<Activity, "id" | "createdAt">) => void;
  toggleActivity: (id: string) => void;
  toggleTask: (id: string) => void;
  addTask: (task: { title: string; priority: "low" | "medium" | "high"; module: string }) => void;
  removeTask: (id: string) => void;
  addStudent: (student: Omit<Student, "id" | "createdAt" | "avatarHue">) => Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  updateApplication: (id: string, patch: Partial<Application>) => void;
  toggleChecklist: (appId: string, itemId: string) => void;
  addStudySession: (session: Omit<StudySession, "id">) => void;
  examAttempts: ExamAttempt[];
  saveExamAttempt: (attempt: ExamAttempt) => void;
  removeExamAttempt: (id: string) => void;
  addArticle: (
    article: Omit<Article, "id" | "createdAt" | "readTime" | "views" | "conversions">,
  ) => Article;
  updateArticle: (id: string, patch: Partial<Article>) => void;
  removeArticle: (id: string) => void;
  addCampaign: (campaign: Omit<Campaign, "id">) => Campaign;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  addSocialPost: (post: Omit<SocialPost, "id" | "engagement">) => SocialPost;
  updateSocialPost: (id: string, patch: Partial<SocialPost>) => void;
  addSeoAudit: (audit: Omit<SeoAudit, "id" | "scannedAt">) => void;
  saveNote: (
    note: Omit<Note, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) => Note;
  removeNote: (id: string) => void;
  toggleNotePin: (id: string) => void;
  addWikiPage: (page: Omit<WikiPage, "id" | "updatedAt">) => WikiPage;
  updateWikiPage: (id: string, patch: Partial<WikiPage>) => void;
  addEvent: (event: Omit<EventItem, "id">) => EventItem;
  addPost: (post: Omit<Post, "id" | "createdAt" | "likes" | "comments">) => Post;
  sendMessage: (threadId: string, body: string) => void;
  markThreadRead: (id: string) => void;
  toggleThreadPin: (id: string) => void;
  toggleThreadArchive: (id: string) => void;
  toggleThreadMute: (id: string) => void;
  createThread: (
    thread: Omit<Thread, "id" | "updatedAt" | "unread" | "messages">,
  ) => Thread;
  addCall: (call: Omit<CallRecord, "id">) => CallRecord;
  toggleGateway: (id: string) => void;
  updateGateway: (id: string, patch: Partial<GatewayConfig>) => void;
  saveMessageItem: (item: Omit<SavedMessage, "id" | "at">) => SavedMessage;
  reportMessage: (report: Omit<MessageReport, "id" | "at" | "status">) => void;
  saveDiagram: (
    diagram: Omit<Diagram, "id" | "updatedAt"> & { id?: string },
  ) => Diagram;
  removeDiagram: (id: string) => void;
  togglePlugin: (id: string) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  setKidSafe: (on: boolean) => void;
}

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

export type ProviderKind = "local" | "cloud" | "custom";

export interface ProviderCatalogEntry {
  id: string;
  name: string;
  kind: ProviderKind;
  /** Open weights, or an aggregator that serves predominantly open weights. */
  openSource: boolean;
  licence: string;
  homepage: string;
  docs: string;
  defaultBaseUrl: string;
  requiresKey: boolean;
  /** How the chat endpoint is shaped. */
  wire: "openai" | "ollama";
  suggestedModels: string[];
  note?: string;
}

export interface ProviderConfig {
  /** Base URL as typed by the operator (no trailing slash required). */
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export type ProvidersState = Record<string, ProviderConfig>;

/* ------------------------------------------------------------------ */
/* Runs, steps, audit                                                  */
/* ------------------------------------------------------------------ */

export interface PendingToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ChatTurn {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: PendingToolCall[];
  toolCallId?: string;
  name?: string;
}

export type RunStatus =
  | "completed"
  | "step-budget"
  | "repeat-guard"
  | "time-budget"
  | "rejected"
  | "error";

export interface RunStep {
  index: number;
  at: string;
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  summary: string;
  ms: number;
  approved: boolean;
}

export interface RunRecord {
  id: string;
  task: string;
  startedAt: string;
  finishedAt: string;
  status: RunStatus;
  providerId: string;
  model: string;
  offline: boolean;
  answer: string;
  steps: RunStep[];
  error?: string;
}

export type AuditKind = "tool" | "approval" | "provider" | "run" | "automation" | "remote";

export interface AuditEntry {
  id: string;
  at: string;
  kind: AuditKind;
  action: string;
  detail: string;
  risk?: ToolRisk;
  ok?: boolean;
  runId?: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  /** Tool invoked when the automation runs. */
  tool: string;
  args: Record<string, unknown>;
  trigger: "manual" | "daily" | "weekly" | "on-open";
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  lastResult?: string;
  runCount: number;
}

/** A command accepted over HTTP and executed by the browser operator. */
export interface RemoteCommand {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  createdAt: string;
  status: "pending" | "done" | "failed";
  result?: string;
}
