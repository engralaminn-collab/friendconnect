/** Typed wrappers around every backend endpoint used by the web client. */
import { api } from "./client";
import type {
  CallDto,
  ContactDto,
  ConversationDto,
  IceConfig,
  MessageDto,
  NotificationDto,
  PublicUser,
  SavedMessageRowDto,
} from "./types";

// ---- Auth ------------------------------------------------------------------

export const authApi = {
  register: (input: { email: string; password: string; displayName: string; handle?: string }) =>
    api.post<{ userId: string; devVerifyToken?: string }>("/api/auth/register", input),
  login: (input: { email: string; password: string }) =>
    api.post<{ user: PublicUser }>("/api/auth/login", input),
  logout: () => api.post<{ loggedOut: boolean }>("/api/auth/logout"),
  session: () => api.get<{ user: PublicUser | null }>("/api/auth/session"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/auth/change-password", { currentPassword, newPassword }),
  forgotPassword: (email: string) => api.post<{ requested: boolean; devToken?: string }>("/api/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post("/api/auth/reset-password", { token, newPassword }),
  verifyEmail: (token: string) => api.post("/api/auth/verify-email", { token }),
};

// ---- Profile ---------------------------------------------------------------

export const profileApi = {
  get: () => api.get<{ profile: PublicUser }>("/api/profile"),
  update: (patch: Record<string, unknown>) => api.patch<{ profile: PublicUser }>("/api/profile", patch),
  setAvatar: (mediaId: string) => api.post<{ profile: PublicUser }>("/api/profile/avatar", { mediaId }),
  searchUsers: (q: string) =>
    api.get<{ results: Array<Pick<PublicUser, "id" | "email" | "displayName" | "handle">> }>(
      `/api/users/search?q=${encodeURIComponent(q)}`,
    ),
};

// ---- Contacts --------------------------------------------------------------

export const contactsApi = {
  list: () => api.get<{ contacts: ContactDto[] }>("/api/contacts"),
  create: (input: Record<string, unknown>) => api.post<{ contact: ContactDto }>("/api/contacts", input),
  remove: (contactId: string) => api.delete<{ deleted: boolean }>(`/api/contacts/${contactId}`),
  request: (toUserId: string, message?: string) =>
    api.post("/api/contact-requests", { toUserId, message }),
  respond: (requestId: string, decision: "accepted" | "declined") =>
    api.post(`/api/contact-requests/${requestId}`, { decision }),
  pending: () => api.get("/api/contact-requests"),
};

// ---- Conversations & messages ----------------------------------------------

export interface SendMessageInput {
  body?: string;
  kind?: string;
  clientNonce?: string;
  replyToId?: string;
  mediaIds?: string[];
  poll?: { question: string; options: string[] };
  location?: { lat: number; lng: number; address?: string };
  contactCard?: { name: string; phone: string; company?: string };
}

export const conversationsApi = {
  list: () => api.get<{ conversations: ConversationDto[] }>("/api/conversations"),
  create: (input: { type: "direct" | "group"; memberIds: string[]; title?: string }) =>
    api.post<{ conversation: ConversationDto }>("/api/conversations", input),
  get: (conversationId: string) =>
    api.get<{ conversation: ConversationDto }>(`/api/conversations/${conversationId}`),
  updateSettings: (
    conversationId: string,
    patch: { archived?: boolean; muted?: boolean; pinned?: boolean; wallpaper?: string; disappearingSec?: number },
  ) => api.patch<{ conversation: ConversationDto }>(`/api/conversations/${conversationId}`, patch),
  messages: (conversationId: string, opts: { limit?: number; cursor?: string } = {}) => {
    const params = new URLSearchParams();
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.cursor) params.set("cursor", opts.cursor);
    const qs = params.toString();
    return api.get<{ items: MessageDto[]; nextCursor: string | null }>(
      `/api/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`,
    );
  },
  send: (conversationId: string, input: SendMessageInput) =>
    api.post<{ message: MessageDto }>(`/api/conversations/${conversationId}/messages`, input),
  markRead: (conversationId: string) =>
    api.post<{ read: boolean; messageIds: string[] }>(`/api/conversations/${conversationId}/read`),
  markDelivered: (conversationId: string, upToMessageId?: string) =>
    api.post(`/api/conversations/${conversationId}/delivered`, { upToMessageId }),
};

export const messagesApi = {
  edit: (messageId: string, body: string) =>
    api.patch<{ message: MessageDto }>(`/api/messages/${messageId}`, { body }),
  delete: (messageId: string) => api.delete<{ deleted: boolean }>(`/api/messages/${messageId}`),
  react: (messageId: string, emoji: string) =>
    api.post(`/api/messages/${messageId}/reactions`, { emoji }),
  unreact: (messageId: string, emoji: string) =>
    api.delete(`/api/messages/${messageId}/reactions`, { emoji }),
  votePoll: (messageId: string, optionId: string) => api.post(`/api/messages/${messageId}/poll`, { optionId }),
  pin: (messageId: string) => api.post(`/api/messages/${messageId}/pin`),
  unpin: (messageId: string) => api.delete(`/api/messages/${messageId}/pin`),
  save: (messageId: string, note?: string, tag?: string) =>
    api.post(`/api/messages/${messageId}/saved`, { note, tag }),
  report: (messageId: string, reason: string, detail?: string) =>
    api.post(`/api/messages/${messageId}/report`, { reason, detail }),
  saved: () => api.get<{ saved: SavedMessageRowDto[] }>("/api/saved-messages"),
  unsave: (savedId: string) => api.delete(`/api/saved-messages?id=${encodeURIComponent(savedId)}`),
};

// ---- Media -----------------------------------------------------------------

export interface UploadedMedia {
  id: string;
  mime: string;
  kind: string;
  filename: string;
  sizeBytes: string;
  url: string;
  durationSec: number | null;
}

export const mediaApi = {
  upload: (file: Blob, opts: { kind?: string; durationSec?: number; onProgress?: (pct: number) => void } = {}) =>
    uploadWithProgress(file, opts),
};

function uploadWithProgress(
  file: Blob,
  opts: { kind?: string; durationSec?: number; onProgress?: (pct: number) => void },
): Promise<{ media: UploadedMedia }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    const filename = file instanceof File ? file.name : "upload";
    form.append("file", file, filename);
    if (opts.kind) form.append("kind", opts.kind);
    if (opts.durationSec) form.append("durationSec", String(opts.durationSec));
    xhr.open("POST", "/api/media/upload");
    xhr.withCredentials = true;
    xhr.setRequestHeader("x-fc-request", "1");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && json.ok) resolve(json.data);
        else
          reject(
            new Error(json?.error?.message ?? `Upload failed (${xhr.status})`),
          );
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

// ---- Calls -----------------------------------------------------------------

export const callsApi = {
  config: () => api.get<IceConfig>("/api/calls/config"),
  create: (conversationId: string, kind: "audio" | "video") =>
    api.post<CallDto>("/api/calls", { conversationId, kind }),
  get: (callId: string) => api.get<CallDto>(`/api/calls/${callId}`),
  join: (callId: string) => api.post<CallDto>(`/api/calls/${callId}/join`),
  leave: (callId: string) => api.post<CallDto>(`/api/calls/${callId}/leave`),
  decline: (callId: string) => api.post<CallDto>(`/api/calls/${callId}/decline`),
};

// ---- Notifications ---------------------------------------------------------

export const notificationsApi = {
  list: (unreadOnly = false) =>
    api.get<{ notifications: NotificationDto[] }>(
      `/api/notifications${unreadOnly ? "?unreadOnly=true" : ""}`,
    ),
  read: (notificationId: string) =>
    api.post(`/api/notifications/${notificationId}/read`),
  readAll: () => api.post("/api/notifications"),
};

// ---- Workspace persistence & migration -------------------------------------

export const workspaceApi = {
  list: (collection: string) => api.get(`/api/workspace/${collection}`),
  upsert: (collection: string, recordId: string, data: Record<string, unknown>) =>
    api.post(`/api/workspace/${collection}`, { recordId, data }),
  bulkUpsert: (collection: string, records: { recordId: string; data: Record<string, unknown> }[]) =>
    api.post(`/api/workspace/${collection}`, { records }),
  remove: (collection: string, recordId: string) =>
    api.delete(`/api/workspace/${collection}?recordId=${encodeURIComponent(recordId)}`),
  export: () => api.get("/api/workspace/export"),
};

export const migrationApi = {
  importLocal: (payload: unknown) => api.post("/api/migrate/local", payload),
};
