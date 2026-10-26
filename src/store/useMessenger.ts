"use client";

/**
 * Backend-backed messenger store.
 *
 * Exposes the same field/action names the existing UI was built against, while
 * authoritative data lives in MySQL: conversations, messages, receipts,
 * contacts, saved messages and reports all go through the REST + realtime API.
 * Local-only workspace slices (safety, gibber link, AI assistant, thread
 * replies, CRM campaigns) are bridged from the legacy Zustand store.
 */
import { create } from "zustand";
import type {
  CallRecord,
  Campaign,
  Contact,
  MediaAttachment,
  Message,
  MessageReport,
  Notification,
  SavedMessage,
  Thread,
  ThreadReply,
  AssistantTurn,
  SafetySettings,
  FeedEvent,
  ID,
} from "@/lib/types";
import { uid } from "@/lib/utils";
import { conversationsApi, messagesApi, contactsApi, callsApi } from "@/lib/api/resources";
import type { ConversationDto, MessageDto } from "@/lib/api/types";
import { ApiClientError } from "@/lib/api/client";
import { messageToLegacy, conversationToThread } from "@/lib/api/message-mapper";
import { getSocket } from "@/lib/realtime/socket";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { useStore } from "./useStore";

function hue() {
  return Math.floor(Math.random() * 360);
}

interface MessengerState {
  ready: boolean;
  currentUserId: string | null;
  threads: Thread[];
  contacts: Contact[];
  calls: CallRecord[];
  notifications: Notification[];
  savedMessages: SavedMessage[];
  reports: MessageReport[];
  feed: FeedEvent[];
  campaigns: Campaign[];
  messageThreads: Record<string, ThreadReply[]>;
  assistantChats: Record<string, AssistantTurn[]>;
  safety: SafetySettings;
  gibberThreads: ID[];

  bootstrap: (userId: string) => Promise<void>;
  openThread: (threadId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  createThread: (input: {
    memberIds: string[];
    title?: string;
    type?: "direct" | "group";
  }) => Promise<Thread>;

  sendMessage: (threadId: ID, body: string, media?: MediaAttachment) => void;
  editMessage: (threadId: ID, messageId: ID, body: string) => void;
  deleteMessage: (threadId: ID, messageId: ID) => void;
  toggleMessageStar: (threadId: ID, messageId: ID) => void;
  reactToMessage: (threadId: ID, messageId: ID, emoji: string) => void;
  votePoll: (threadId: ID, messageId: ID, optionIndex: number) => void;
  toggleThreadPin: (threadId: ID) => void;
  toggleThreadArchive: (threadId: ID) => void;
  toggleThreadMute: (threadId: ID) => void;
  setThreadTyping: (threadId: ID, typing: boolean) => void;
  markThreadRead: (threadId: ID) => void;
  addCall: (call: Omit<CallRecord, "id">) => CallRecord;
  saveMessageItem: (item: Omit<SavedMessage, "id" | "at">) => Promise<SavedMessage>;
  removeSavedMessage: (id: ID) => void;
  addThreadReply: (
    threadId: ID,
    rootId: ID,
    body: string,
    from: "me" | "them",
    author: string,
  ) => void;
  addAssistantTurn: (threadId: ID, turn: Omit<AssistantTurn, "id" | "at">) => void;
  clearAssistantChat: (threadId: ID) => void;
  reportMessage: (report: Omit<MessageReport, "id" | "at" | "status">) => void;
  markFeedRead: (id: ID) => void;
  markAllFeedRead: () => void;
  markNotificationRead: (id: ID) => void;
  markAllNotificationsRead: () => void;
  setKidSafe: (on: boolean) => void;
  updateSafety: (patch: Partial<SafetySettings>) => void;
  setSafetyControl: (id: string, value: string) => void;
  toggleGibberThread: (id: ID) => void;
}

const onlineUsers = new Set<string>();
const typingByConversation = new Map<string, Set<string>>();

function mergeThread(state: MessengerState, thread: Thread): Thread[] {
  const exists = state.threads.some((t) => t.id === thread.id);
  return exists
    ? state.threads.map((t) => (t.id === thread.id ? { ...thread, messages: t.messages } : t))
    : [thread, ...state.threads];
}

function upsertMessage(threads: Thread[], threadId: string, message: Message): Thread[] {
  return threads.map((t) => {
    if (t.id !== threadId) return t;
    const idx = t.messages.findIndex((m) => m.id === message.id);
    const messages =
      idx >= 0 ? t.messages.map((m) => (m.id === message.id ? message : m)) : [...t.messages, message];
    return { ...t, messages, updatedAt: message.at };
  });
}

export const useMessenger = create<MessengerState>()((set, get) => {
  // Bridge local-only slices from the legacy store (UI preferences/simulators).
  const local = useStore.getState();

  function bindRealtime(userId: string) {
    const socket = getSocket();

    socket.off(REALTIME_EVENTS.messageNew);
    socket.off(REALTIME_EVENTS.messageUpdate);
    socket.off(REALTIME_EVENTS.messageDelete);
    socket.off(REALTIME_EVENTS.reactionUpdate);
    socket.off(REALTIME_EVENTS.pollUpdate);
    socket.off(REALTIME_EVENTS.typing);
    socket.off(REALTIME_EVENTS.presence);
    socket.off(REALTIME_EVENTS.conversationNew);
    socket.off(REALTIME_EVENTS.messageReceipt);

    socket.on(REALTIME_EVENTS.messageNew, (payload: { conversationId: string; message: MessageDto }) => {
      const legacy = messageToLegacy(payload.message, userId);
      set((s) => ({ threads: upsertMessage(s.threads, payload.conversationId, legacy) }));
      // Acknowledge delivery immediately (persisted via API).
      void conversationsApi
        .markDelivered(payload.conversationId, payload.message.id)
        .catch(() => undefined);
    });

    socket.on(REALTIME_EVENTS.messageUpdate, (payload: { conversationId: string; message: MessageDto }) => {
      const legacy = messageToLegacy(payload.message, userId);
      set((s) => ({ threads: upsertMessage(s.threads, payload.conversationId, legacy) }));
    });

    socket.on(REALTIME_EVENTS.messageDelete, (payload: { conversationId: string; messageId: string }) => {
      set((s) => ({
        threads: s.threads.map((t) =>
          t.id === payload.conversationId
            ? {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === payload.messageId
                    ? { ...m, deleted: true, body: "", kind: "system", systemKind: "changed", media: undefined }
                    : m,
                ),
              }
            : t,
        ),
      }));
    });

    socket.on(
      REALTIME_EVENTS.reactionUpdate,
      (payload: { conversationId: string; messageId: string; reactions: MessageDto["reactions"] }) => {
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === payload.conversationId
              ? {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === payload.messageId
                      ? {
                          ...m,
                          reactions: payload.reactions.map((r) => ({
                            emoji: r.emoji,
                            count: r.count,
                            mine: r.mine,
                          })),
                        }
                      : m,
                  ),
                }
              : t,
          ),
        }));
      },
    );

    socket.on(
      REALTIME_EVENTS.pollUpdate,
      (payload: { conversationId: string; messageId: string; poll: NonNullable<MessageDto["poll"]> }) => {
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === payload.conversationId
              ? {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === payload.messageId && m.media?.poll && payload.poll
                      ? {
                          ...m,
                          media: {
                            ...m.media,
                            optionIds: payload.poll.options.map((o) => o.id),
                            poll: {
                              ...m.media.poll,
                              totalVotes: payload.poll.totalVotes,
                              myOption: payload.poll.options.findIndex((o) => o.mine),
                              options: payload.poll.options.map((o) => ({ label: o.label, votes: o.votes })),
                            },
                          },
                        }
                      : m,
                  ),
                }
              : t,
          ),
        }));
      },
    );

    socket.on(REALTIME_EVENTS.typing, (payload: { conversationId: string; userId: string; typing: boolean }) => {
      const set = typingByConversation.get(payload.conversationId) ?? new Set<string>();
      if (payload.typing) set.add(payload.userId);
      else set.delete(payload.userId);
      typingByConversation.set(payload.conversationId, set);
      setTypingFlag(payload.conversationId, set.size > 0);
    });

    socket.on(REALTIME_EVENTS.presence, (payload: { userId: string; online: boolean }) => {
      if (payload.online) onlineUsers.add(payload.userId);
      else onlineUsers.delete(payload.userId);
      set((s) => ({
        threads: s.threads.map((t) =>
          t.contactId ? { ...t, isOnline: onlineUsers.has(t.contactId) } : t,
        ),
      }));
    });

    socket.on(REALTIME_EVENTS.conversationNew, (dto: ConversationDto) => {
      set((s) => {
        if (s.threads.some((t) => t.id === dto.id)) return s;
        return { threads: mergeThread(s, conversationToThread(dto, userId, onlineUsers, typingByConversation)) };
      });
    });

    socket.on(
      REALTIME_EVENTS.messageReceipt,
      (payload: { conversationId: string; userId: string; state: string; messageIds: string[] }) => {
        if (payload.state !== "read") return;
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === payload.conversationId
              ? { ...t, unread: 0, messages: t.messages.map((m) => (m.from === "me" ? { ...m, status: "read" } : m)) }
              : t,
          ),
        }));
      },
    );
  }

  function setTypingFlag(conversationId: string, typing: boolean) {
    set((s) => ({
      threads: s.threads.map((t) => (t.id === conversationId ? { ...t, typing } : t)),
    }));
  }

  return {
    ready: false,
    currentUserId: null,
    threads: [],
    contacts: [],
    calls: [],
    notifications: [],
    savedMessages: [],
    reports: [],
    feed: local.feed,
    campaigns: local.campaigns,
    messageThreads: local.messageThreads,
    assistantChats: local.assistantChats,
    safety: local.safety,
    gibberThreads: local.gibberThreads,

    bootstrap: async (userId) => {
      set({ currentUserId: userId });
      bindRealtime(userId);
      try {
        const [{ conversations }, { contacts }, saved] = await Promise.all([
          conversationsApi.list(),
          contactsApi.list().catch(() => ({ contacts: [] })),
          messagesApi.saved().catch(() => ({ saved: [] })),
        ]);
        const threads = conversations.map((c) =>
          conversationToThread(c, userId, onlineUsers, typingByConversation),
        );
        const legacyContacts: Contact[] = contacts.map((c) => ({
          id: c.id,
          name: c.displayName,
          email: c.email ?? "",
          phone: c.phone ?? undefined,
          tags: c.tags,
          stage: "lead",
          value: 0,
          source: "friendconnect",
          owner: "me",
          starred: c.starred,
          notes: c.note ?? undefined,
          avatarHue: hue(),
          createdAt: c.createdAt,
          lastContact: c.updatedAt,
        }));
        set({
          threads,
          contacts: legacyContacts,
          savedMessages: (saved.saved ?? []).map(
            (r): SavedMessage => ({
              id: r.id,
              threadId: r.conversationId ?? "",
              threadName: r.threadName ?? "",
              author: r.author ?? "",
              body: r.body ?? "",
              at: r.createdAt,
              note: r.note ?? "",
              tag: (r.tag as SavedMessage["tag"]) ?? "reference",
              messageId: r.messageId ?? undefined,
            }),
          ),
          ready: true,
        });
      } catch (err) {
        console.error("[messenger] bootstrap failed", err);
        set({ ready: true });
      }
    },

    refreshConversations: async () => {
      const userId = get().currentUserId;
      if (!userId) return;
      const { conversations } = await conversationsApi.list();
      set((s) => ({
        threads: conversations.map((c) => {
          const existing = s.threads.find((t) => t.id === c.id);
          const mapped = conversationToThread(c, userId, onlineUsers, typingByConversation);
          return existing ? { ...mapped, messages: existing.messages, typing: existing.typing } : mapped;
        }),
      }));
    },

    openThread: async (threadId) => {
      const userId = get().currentUserId;
      if (!userId) return;
      try {
        const page = await conversationsApi.messages(threadId, { limit: 50 });
        const legacy = page.items.map((m) => messageToLegacy(m, userId));
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId ? { ...t, messages: legacy, unread: 0 } : t,
          ),
        }));
        void conversationsApi.markRead(threadId).catch(() => undefined);
      } catch (err) {
        console.error("[messenger] openThread failed", err);
      }
    },

    createThread: async (input) => {
      const userId = get().currentUserId!;
      const { conversation } = await conversationsApi.create({
        type: input.type ?? "direct",
        memberIds: input.memberIds,
        title: input.title,
      });
      const thread = conversationToThread(conversation, userId, onlineUsers, typingByConversation);
      set((s) => ({ threads: mergeThread(s, thread) }));
      return thread;
    },

    sendMessage: (threadId, body, media) => {
      const nonce = `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const optimistic: Message = {
        id: `tmp_${nonce}`,
        from: "me",
        body,
        at: new Date().toISOString(),
        status: "sent",
        kind: media ? (media.kind === "voice" ? "audio" : (media.kind as Message["kind"])) : "text",
        media,
      };
      set((s) => ({ threads: upsertMessage(s.threads, threadId, optimistic) }));

      const payload: Parameters<typeof conversationsApi.send>[1] = {
        body,
        clientNonce: nonce,
      };
      // Real uploaded media carries its private API URL in seed.
      const uploadedMediaId = media?.seed?.startsWith("/api/media/")
        ? media.seed.split("/").pop()
        : undefined;
      if (uploadedMediaId) {
        payload.mediaIds = [uploadedMediaId];
        payload.kind = media!.kind === "voice" ? "voice" : (media!.kind as string);
      }
      if (media?.kind === "poll" && media.poll) {
        payload.poll = {
          question: media.poll.question,
          options: media.poll.options.map((o) => o.label),
        };
      }
      if (media?.kind === "location" && typeof media.lat === "number" && typeof media.lng === "number") {
        payload.kind = "location";
        payload.location = { lat: media.lat, lng: media.lng, address: media.address };
      }
      if (media?.kind === "contact" && media.contactCard) {
        payload.kind = "contact";
        payload.contactCard = {
          name: media.contactCard.name,
          phone: media.contactCard.phone,
          company: media.contactCard.company,
        };
      }

      conversationsApi
        .send(threadId, payload)
        .then(({ message }) => {
          const userId = get().currentUserId!;
          const saved = messageToLegacy(message, userId);
          set((s) => ({
            threads: s.threads.map((t) =>
              t.id === threadId
                ? {
                    ...t,
                    messages: t.messages.map((m) => (m.id === optimistic.id ? saved : m)),
                    updatedAt: saved.at,
                  }
                : t,
            ),
          }));
        })
        .catch((err: unknown) => {
          const message = err instanceof ApiClientError ? err.message : "Message failed to send";
          set((s) => ({
            threads: s.threads.map((t) =>
              t.id === threadId
                ? {
                    ...t,
                    messages: t.messages.map((m) =>
                      m.id === optimistic.id ? { ...m, status: "failed" } : m,
                    ),
                  }
                : t,
            ),
          }));
          console.error("[messenger] send failed", message);
        });
    },

    editMessage: (threadId, messageId, body) => {
      set((s) => ({
        threads: s.threads.map((t) =>
          t.id === threadId
            ? { ...t, messages: t.messages.map((m) => (m.id === messageId ? { ...m, body, edited: true } : m)) }
            : t,
        ),
      }));
      void messagesApi.edit(messageId, body).catch(console.error);
    },

    deleteMessage: (threadId, messageId) => {
      set((s) => ({
        threads: s.threads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === messageId
                    ? { ...m, deleted: true, body: "", kind: "system", systemKind: "changed", media: undefined }
                    : m,
                ),
              }
            : t,
        ),
      }));
      void messagesApi.delete(messageId).catch(console.error);
    },

    toggleMessageStar: (threadId, messageId) => {
      const existing = get().savedMessages.find((s) => s.threadId === threadId && s.messageId === messageId);
      if (existing) {
        get().removeSavedMessage(existing.id);
        return;
      }
      const thread = get().threads.find((t) => t.id === threadId);
      const message = thread?.messages.find((m) => m.id === messageId);
      void get()
        .saveMessageItem({
          threadId,
          threadName: thread?.contactName ?? "",
          author: message?.from === "me" ? "me" : "them",
          body: message?.body ?? "",
          note: "",
          tag: "important",
          messageId,
        })
        .catch(console.error);
    },

    reactToMessage: (threadId, messageId, emoji) => {
      const thread = get().threads.find((t) => t.id === threadId);
      const message = thread?.messages.find((m) => m.id === messageId);
      const mine = message?.reactions?.some((r) => r.emoji === emoji && r.mine);
      // Optimistic update.
      set((s) => ({
        threads: s.threads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages: t.messages.map((m) => {
                  if (m.id !== messageId) return m;
                  const reactions = [...(m.reactions ?? [])];
                  const idx = reactions.findIndex((r) => r.emoji === emoji);
                  if (idx >= 0 && mine) {
                    if (reactions[idx].count <= 1) reactions.splice(idx, 1);
                    else reactions[idx] = { ...reactions[idx], count: reactions[idx].count - 1, mine: false };
                  } else if (idx >= 0) {
                    reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, mine: true };
                  } else {
                    reactions.push({ emoji, count: 1, mine: true });
                  }
                  return { ...m, reactions };
                }),
              }
            : t,
        ),
      }));
      const action = mine ? messagesApi.unreact(messageId, emoji) : messagesApi.react(messageId, emoji);
      action.catch(console.error);
    },

    votePoll: (threadId, messageId, optionIndex) => {
      const thread = get().threads.find((t) => t.id === threadId);
      const message = thread?.messages.find((m) => m.id === messageId);
      const optionId = (message?.media as { optionIds?: string[] } | undefined)?.optionIds?.[
        optionIndex
      ];
      if (!optionId) return;
      void messagesApi.votePoll(messageId, optionId);
    },

    toggleThreadPin: (threadId) => {
      const thread = get().threads.find((t) => t.id === threadId);
      const pinned = !thread?.pinned;
      set((s) => ({
        threads: s.threads.map((t) => (t.id === threadId ? { ...t, pinned } : t)),
      }));
      void conversationsApi.updateSettings(threadId, { pinned });
    },

    toggleThreadArchive: (threadId) => {
      const archived = !get().threads.find((t) => t.id === threadId)?.archived;
      set((s) => ({
        threads: s.threads.map((t) => (t.id === threadId ? { ...t, archived } : t)),
      }));
      void conversationsApi.updateSettings(threadId, { archived });
    },

    toggleThreadMute: (threadId) => {
      const muted = !get().threads.find((t) => t.id === threadId)?.muted;
      set((s) => ({
        threads: s.threads.map((t) => (t.id === threadId ? { ...t, muted } : t)),
      }));
      void conversationsApi.updateSettings(threadId, { muted });
    },

    setThreadTyping: (threadId, typing) => {
      getSocket().emit("typing", { conversationId: threadId, typing });
    },

    markThreadRead: (threadId) => {
      set((s) => ({
        threads: s.threads.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)),
      }));
      void conversationsApi.markRead(threadId).catch(() => undefined);
      getSocket().emit("message:read", { conversationId: threadId });
    },

    addCall: (call) => {
      const created: CallRecord = { ...call, id: uid("cl") };
      set((s) => ({ calls: [created, ...s.calls] }));
      return created;
    },

    saveMessageItem: async (item) => {
      const created: SavedMessage = { ...item, id: uid("sv"), at: new Date().toISOString() };
      set((s) => ({ savedMessages: [created, ...s.savedMessages] }));
      if (item.messageId) {
        await messagesApi.save(item.messageId, item.note, item.tag);
      }
      return created;
    },

    removeSavedMessage: (id) => {
      set((s) => ({ savedMessages: s.savedMessages.filter((m) => m.id !== id) }));
      void messagesApi.unsave(id).catch(console.error);
    },

    addThreadReply: (...args) => useStore.getState().addThreadReply(...args),
    addAssistantTurn: (...args) => useStore.getState().addAssistantTurn(...args),
    clearAssistantChat: (id) => useStore.getState().clearAssistantChat(id),
    reportMessage: (report) => {
      useStore.getState().reportMessage(report);
      const msgId = (report as unknown as { messageId?: string }).messageId;
      if (msgId) void messagesApi.report(msgId, report.reason, report.detail);
    },
    markFeedRead: (id) => useStore.getState().markFeedRead(id),
    markAllFeedRead: () => useStore.getState().markAllFeedRead(),
    markNotificationRead: (id) => useStore.getState().markNotificationRead(id),
    markAllNotificationsRead: () => useStore.getState().markAllNotificationsRead(),
    setKidSafe: (on) => useStore.getState().setKidSafe(on),
    updateSafety: (patch) => useStore.getState().updateSafety(patch),
    setSafetyControl: (id, value) => useStore.getState().setSafetyControl(id, value),
    toggleGibberThread: (id) => useStore.getState().toggleGibberThread(id),
  };
});

// Keep local-only slices in sync with the legacy persisted store so selectors
// against this store re-render when safety/gibber/assistant state changes.
useStore.subscribe((s) => {
  useMessenger.setState({
    feed: s.feed,
    campaigns: s.campaigns,
    messageThreads: s.messageThreads,
    assistantChats: s.assistantChats,
    safety: s.safety,
    gibberThreads: s.gibberThreads,
    notifications: s.notifications,
  });
});

export { callsApi };
