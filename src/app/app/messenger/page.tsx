"use client";

import * as React from "react";
import {
  Archive,
  ArrowLeft,
  Bell,
  BellOff,
  Camera,
  ChevronDown,
  FileText,
  Flag,
  Image as ImageIcon,
  Link2,
  MapPin,
  MessageSquare,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Pin,
  Plus,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Star,
  Sticker as StickerIcon,
  Trash2,
  UserPlus,
  Video,
  Voicemail,
  Vote,
  Wand2,
  X,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Badge, EmptyState, Progress } from "@/components/ui/primitives";
import { ChatBubble, TypingIndicator } from "@/components/messaging/ChatBubble";
import { MediaViewer } from "@/components/messaging/MediaViewer";
import { LocationShareDialog, type SharedLocation } from "@/components/messaging/LocationShareDialog";
import { ContactShareDialog } from "@/components/messaging/ContactShareDialog";
import {
  SmartReplies,
  StickerKeyboard,
  TranslateInline,
} from "@/components/messaging/ComposerExtras";
import {
  AiAssistantPanel,
  MessageThreadPanel,
  NotificationFeed,
  SavedMessagesPanel,
  assistantAnswerFor,
} from "@/components/messaging/Panels";
import { KidSafePanel, ReportDialog } from "@/components/messaging/Safety";
import { GibberChannel } from "@/components/messaging/GibberChannel";
import { GeneratedArt } from "@/components/studio/GeneratedArt";
import { useMessenger as useStore } from "@/store/useMessenger";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/store/useUI";
import { cn, copyToClipboard, downloadFile, formatDuration, relativeTime } from "@/lib/utils";
import { RemoteCallEngine } from "@/lib/webrtc/remote-engine";
import { useCallUI } from "@/store/useCallUI";
import { mediaApi, profileApi } from "@/lib/api/resources";
import { VoiceRecorder } from "@/lib/media/voice-recorder";
import { humanize } from "@/lib/humanizer";
import type { MediaAttachment, Message, Thread } from "@/lib/types";

type Scope = "all" | "unread" | "starred" | "archived";

function daysSince(iso: string) {
  return Math.round((Date.now() - +new Date(iso)) / 86400000);
}

const EMOJI = ["😀","😂","😍","👍","🙏","🔥","🎉","✅","💡","🚀","❤️","🤝"];

const STATUS_TEXT: Record<Thread["channel"], string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  voip: "VoIP",
};

export default function MessengerPage() {
  const threads = useStore((s) => s.threads);
  const contacts = useStore((s) => s.contacts);
  const campaigns = useStore((s) => s.campaigns);
  const sendMessage = useStore((s) => s.sendMessage);
  const editMessage = useStore((s) => s.editMessage);
  const deleteMessage = useStore((s) => s.deleteMessage);
  const toggleMessageStar = useStore((s) => s.toggleMessageStar);
  const reactToMessage = useStore((s) => s.reactToMessage);
  const votePoll = useStore((s) => s.votePoll);
  const toggleThreadPin = useStore((s) => s.toggleThreadPin);
  const toggleThreadArchive = useStore((s) => s.toggleThreadArchive);
  const toggleThreadMute = useStore((s) => s.toggleThreadMute);
  const setThreadTyping = useStore((s) => s.setThreadTyping);
  const markThreadRead = useStore((s) => s.markThreadRead);
  const safety = useStore((s) => s.safety);
  const setKidSafe = useStore((s) => s.setKidSafe);
  const updateSafety = useStore((s) => s.updateSafety);
  const setSafetyControl = useStore((s) => s.setSafetyControl);
  const gibberThreads = useStore((s) => s.gibberThreads);
  const toggleGibberThread = useStore((s) => s.toggleGibberThread);
  const savedMessages = useStore((s) => s.savedMessages);
  const saveMessageItem = useStore((s) => s.saveMessageItem);
  const removeSavedMessage = useStore((s) => s.removeSavedMessage);
  const messageThreads = useStore((s) => s.messageThreads);
  const addThreadReply = useStore((s) => s.addThreadReply);
  const assistantChats = useStore((s) => s.assistantChats);
  const addAssistantTurn = useStore((s) => s.addAssistantTurn);
  const clearAssistantChat = useStore((s) => s.clearAssistantChat);
  const reports = useStore((s) => s.reports);
  const reportMessage = useStore((s) => s.reportMessage);
  const feed = useStore((s) => s.feed);
  const markFeedRead = useStore((s) => s.markFeedRead);
  const markAllFeedRead = useStore((s) => s.markAllFeedRead);
  const bootstrap = useStore((s) => s.bootstrap);
  const openThread = useStore((s) => s.openThread);
  const createThread = useStore((s) => s.createThread);
  const { user } = useAuth();
  const toast = useToast();

  const [scope, setScope] = React.useState<Scope>("all");
  const [query, setQuery] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(
    threads[0]?.id ?? null,
  );
  const [draft, setDraft] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<Message | null>(null);
  const [showEmoji, setShowEmoji] = React.useState(false);
  const [showAttach, setShowAttach] = React.useState(false);
  const [showInfo, setShowInfo] = React.useState(false);
  const [showNewChat, setShowNewChat] = React.useState(false);
  const [userQuery, setUserQuery] = React.useState("");
  const [userResults, setUserResults] = React.useState<
    { id: string; email: string | null; displayName: string; handle: string | null }[]
  >([]);
  const [searching, setSearching] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [messageQuery, setMessageQuery] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [recordSec, setRecordSec] = React.useState(0);
  const [locationOpen, setLocationOpen] = React.useState(false);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiText, setAiText] = React.useState("");
  const [aiPasses, setAiPasses] = React.useState<
    { id: string; name: string; description: string; count: number }[]
  >([]);
  const [aiScore, setAiScore] = React.useState({ before: 0, after: 0 });
  const [mobileChat, setMobileChat] = React.useState(false);
  const [viewer, setViewer] = React.useState<{
    items: MediaAttachment[];
    index: number;
  } | null>(null);
  const [pollOpen, setPollOpen] = React.useState(false);
  const [pollQuestion, setPollQuestion] = React.useState(
    "Which day works best for the call?",
  );
  const [pollOptions, setPollOptions] = React.useState([
    "Tuesday morning",
    "Wednesday afternoon",
    "Thursday morning",
  ]);
  const [railTab, setRailTab] = React.useState<
    "details" | "feed" | "saved"
  >("details");
  const [showStickers, setShowStickers] = React.useState(false);
  const [showSmart, setShowSmart] = React.useState(true);
  const [threadRoot, setThreadRoot] = React.useState<Message | null>(null);
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [gibberOpen, setGibberOpen] = React.useState(false);
  const [safetyOpen, setSafetyOpen] = React.useState(false);
  const [pinnedOpen, setPinnedOpen] = React.useState(false);
  const [reportTarget, setReportTarget] = React.useState<Message | null>(null);
  const [translateTarget, setTranslateTarget] = React.useState<Message | null>(
    null,
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const recordTimer = React.useRef<number>(0);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const contact = active?.contactId
    ? contacts.find((c) => c.id === active.contactId)
    : null;

  // Load authoritative data once authenticated; socket updates take over live.
  React.useEffect(() => {
    if (user?.id) void bootstrap(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Debounced platform user search for starting new conversations.
  React.useEffect(() => {
    if (!showNewChat) {
      setUserQuery("");
      setUserResults([]);
      return;
    }
    const q = userQuery.trim();
    if (q.length < 2) {
      setUserResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { results } = await profileApi.searchUsers(q);
        setUserResults(results.filter((r) => r.id !== user?.id));
      } catch {
        setUserResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery, showNewChat, user?.id]);

  const startWithUser = async (peerId: string) => {
    const existing = threads.find((t) => t.contactId === peerId);
    if (existing) {
      setActiveId(existing.id);
      setShowNewChat(false);
      setMobileChat(true);
      return;
    }
    try {
      const thread = await createThread({ memberIds: [peerId] });
      setActiveId(thread.id);
      setShowNewChat(false);
      setMobileChat(true);
    } catch (err) {
      toast.error(
        "Could not start conversation",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  // Auto-select the first conversation after the initial load.
  React.useEffect(() => {
    if (!activeId && threads.length) setActiveId(threads[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads.length]);

  React.useEffect(() => {
    if (active) {
      void openThread(active.id);
      markThreadRead(active.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [active?.messages.length, activeId]);

  /* ---------------- list ---------------- */

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads
      .filter((t) => {
        if (scope === "unread") return t.unread > 0;
        if (scope === "starred") return t.pinned;
        if (scope === "archived") return t.archived;
        return !t.archived;
      })
      .filter(
        (t) =>
          !q ||
          t.contactName.toLowerCase().includes(q) ||
          t.messages.some((m) => m.body.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return +new Date(b.updatedAt) - +new Date(a.updatedAt);
      });
  }, [threads, query, scope]);

  const visibleMessages = React.useMemo(() => {
    if (!active) return [];
    const q = messageQuery.trim().toLowerCase();
    if (!q) return active.messages;
    return active.messages.filter(
      (m) =>
        m.body.toLowerCase().includes(q) ||
        (m.media?.caption ?? "").toLowerCase().includes(q) ||
        (m.media?.name ?? "").toLowerCase().includes(q),
    );
  }, [active, messageQuery]);

  /* ---------------- actions ---------------- */

  const send = () => {
    if (!active) return;
    const body = draft.trim();
    if (!body) return;
    sendMessage(active.id, body);
    setDraft("");
    setReplyTo(null);
    toast.success("Sent", `Delivered to ${active.contactName}.`);
  };

  const sendMedia = (media: MediaAttachment) => {
    if (!active) return;
    sendMessage(active.id, media.caption ?? "", media);
    setShowAttach(false);
    toast.success("Shared", `${media.name} sent to ${active.contactName}.`);
  };

  const [uploading, setUploading] = React.useState<string | null>(null);
  const recorderRef = React.useRef<VoiceRecorder | null>(null);

  const pickFile = (accept: string, kind: MediaAttachment["kind"]) => {
    const input = fileRef.current;
    if (!input) return;
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !active) return;
      try {
        setUploading(kind);
        const { media } = await mediaApi.upload(file, { kind });
        sendMedia({
          kind,
          name: media.filename,
          sizeLabel: `${Math.max(1, Math.round(Number(media.sizeBytes) / 1024))} KB`,
          mime: media.mime,
          seed: media.url,
          durationSec: media.durationSec ?? undefined,
        });
      } catch (err) {
        toast.error(
          "Upload failed",
          err instanceof Error ? err.message : "Please try again.",
        );
      } finally {
        setUploading(null);
        input.value = "";
      }
    };
    input.click();
  };

  const startRecording = async () => {
    const recorder = new VoiceRecorder();
    const status = await recorder.start();
    if (status !== "recording") {
      toast.error(
        "Microphone unavailable",
        status === "denied"
          ? "Permission was denied. Allow microphone access and try again."
          : "Voice recording is not supported in this browser.",
      );
      return;
    }
    recorderRef.current = recorder;
    setRecording(true);
    setRecordSec(0);
    recordTimer.current = window.setInterval(
      () => setRecordSec((s) => s + 1),
      1000,
    );
  };

  const stopRecording = async () => {
    window.clearInterval(recordTimer.current);
    setRecording(false);
    const recorder = recorderRef.current;
    recorderRef.current = null;
    const result = await recorder?.stop(false);
    const secs = result?.durationSec ?? Math.max(1, recordSec);
    setRecordSec(0);
    if (!result || !active) return;
    try {
      setUploading("voice");
      const { media } = await mediaApi.upload(result.blob, {
        kind: "voice",
        durationSec: result.durationSec,
      });
      sendMedia({
        kind: "voice",
        name: media.filename,
        sizeLabel: formatDuration(result.durationSec),
        mime: result.mimeType,
        durationSec: result.durationSec,
        seed: media.url,
      });
      toast.success("Voice note sent", `${secs}s`);
    } catch (err) {
      toast.error(
        "Voice note failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setUploading(null);
    }
  };

  const startCall = (kind: "audio" | "video") => {
    if (!active?.contactId) {
      toast.error("Call unavailable", "This conversation has no reachable participant.");
      return;
    }
    if (active.type === "group") {
      // Honest limitation: multi-party SFU (LiveKit) is not provisioned.
      toast.error(
        "Group calls aren't available yet",
        "Group calling needs an SFU such as LiveKit. Use audio or video calls in direct conversations.",
      );
      return;
    }
    const engine = new RemoteCallEngine();
    useCallUI.getState().start({
      engine,
      kind,
      contactName: active.contactName,
      contactHue: active.avatarHue ?? 226,
      conversationId: active.id,
      contactId: active.contactId,
      direction: "outgoing",
    });
    engine.start(active.id, active.contactId, kind).catch((err: unknown) => {
      toast.error(
        "Call failed",
        err instanceof Error ? err.message : "Could not start the call.",
      );
      useCallUI.getState().close();
    });
  };

  const generateAiReply = () => {
    if (!active) return;
    const last = active.messages.filter((m) => m.from === "them").slice(-1)[0];
    const base =
      last?.body ??
      `Thanks for getting in touch about the Northwind consultancy. I have a couple of quick questions about seat pricing and the timeline.`;
    const result = humanize(base);
    setAiText(result.text);
    setAiPasses(result.passes);
    setAiScore({ before: result.scoreBefore, after: result.scoreAfter });
    setAiOpen(true);
  };

  const sharedMedia = React.useMemo(() => {
    if (!active) return [];
    return active.messages
      .filter((m) => m.media?.kind === "image" || m.media?.kind === "video")
      .slice(-9);
  }, [active]);

  const leadScore = React.useMemo(() => {
    if (!contact) return 0;
    const stageBoost: Record<string, number> = {
      lead: 10,
      qualified: 25,
      proposal: 45,
      negotiation: 60,
      won: 80,
      lost: 5,
    };
    const days = Math.max(
      0,
      Math.round((Date.now() - +new Date(contact.lastContact)) / 86400000),
    );
    const recency = Math.max(0, 30 - days * 2);
    const value = Math.min(25, Math.round(contact.value / 800));
    return Math.min(
      99,
      stageBoost[contact.stage] ?? 15 + recency + value,
    );
  }, [contact]);

  const nextBestAction = React.useMemo(() => {
    if (!contact) return "";
    if (contact.stage === "won")
      return "Send the onboarding pack and ask for two referrals.";
    if (contact.stage === "negotiation")
      return "Propose the retainer. Mention the two seats still unconfirmed.";
    if (contact.stage === "proposal")
      return "The proposal has sat for a while — offer a 20-minute call to close the open questions.";
    if (contact.stage === "qualified")
      return "Send the case study that matches their sector, then book a demo.";
    if (daysSince(contact.lastContact) > 14)
      return "They have gone quiet. A short, useful SMS beats a long email.";
    return "Answer their last message, then propose the next concrete step.";
  }, [contact]);

  const unreadTotal = threads.reduce((a, t) => a + t.unread, 0);
  const mediaCount = threads.reduce(
    (a, t) => a + t.messages.filter((m) => m.media).length,
    0,
  );
  const starredCount = threads.reduce(
    (a, t) => a + t.messages.filter((m) => m.starred).length,
    0,
  );
  const feedUnread = feed.filter((f) => !f.read).length;

  /* ---------------- render ---------------- */

  return (
    <div className="mx-auto max-w-[1700px]">
      <PageHeader
        eyebrow="Communication"
        title="Messenger"
        description="A private messaging workspace — chat, share images, video, voice notes and documents, and call the person without leaving the thread."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setShowNewChat(true)}
              className="btn btn-secondary btn-sm"
            >
              <Plus className="size-3.5" />
              New chat
            </button>
            <button
              onClick={() => setRailTab("feed")}
              className="btn btn-secondary btn-sm relative"
            >
              <Bell className="size-3.5" />
              Notifications
              {feedUnread > 0 && (
                <span className="ml-1 rounded-full bg-[var(--color-brand-500)] px-1.5 text-[10px] text-white">
                  {feedUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => setSafetyOpen(true)}
              className={cn(
                "btn btn-sm",
                safety.kidSafe ? "btn-primary" : "btn-secondary",
              )}
            >
              <ShieldCheck className="size-3.5" />
              Kid-safe
            </button>
            <button
              onClick={() => setScope(scope === "archived" ? "all" : "archived")}
              className={cn(
                "btn btn-sm",
                scope === "archived" ? "btn-primary" : "btn-ghost",
              )}
            >
              <Archive className="size-3.5" />
              Archived
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Conversations"
          value={threads.length}
          deltaLabel={`${unreadTotal} unread`}
          icon={<Send className="size-4" />}
        />
        <StatCard
          label="Shared media"
          value={mediaCount}
          deltaLabel="images, video, files, voice"
          icon={<ImageIcon className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="Starred"
          value={starredCount}
          deltaLabel="messages worth keeping"
          icon={<Star className="size-4" />}
          tone="violet"
        />
        <StatCard
          label="Channels"
          value={4}
          deltaLabel="WhatsApp, SMS, email, VoIP"
          icon={<Phone className="size-4" />}
          tone="success"
        />
      </div>

      {/* ---------------- App shell ---------------- */}
      <div className="fc-card mt-4 flex h-[720px] overflow-hidden">
        {/* -------- Chat list -------- */}
        <div
          className={cn(
            "flex w-full shrink-0 flex-col border-r border-[var(--fc-line)] lg:w-[340px]",
            mobileChat && "hidden lg:flex",
          )}
        >
          <div className="border-b border-[var(--fc-line)] p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
                <input
                  className="field pl-9"
                  placeholder="Search chats"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowNewChat(true)}
                className="btn btn-secondary btn-icon size-9 shrink-0"
                title="New chat"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <div className="mt-2 flex gap-1">
              {(
                [
                  { id: "all", l: "All" },
                  { id: "unread", l: "Unread" },
                  { id: "starred", l: "Pinned" },
                  { id: "archived", l: "Archived" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScope(s.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                    scope === s.id
                      ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                      : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                  )}
                >
                  {s.l}
                  {s.id === "unread" && unreadTotal > 0 && (
                    <span className="ml-1.5 rounded-full bg-[var(--color-brand-500)] px-1.5 text-[10px] text-white">
                      {unreadTotal}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <ul className="fc-scroll-thin flex-1 overflow-y-auto">
            {visible.map((t) => {
              const last = t.messages[t.messages.length - 1];
              return (
                <li key={t.id}>
                  <button
                    onClick={() => {
                      setActiveId(t.id);
                      setMobileChat(true);
                    }}
                    className={cn(
                      "flex w-full gap-3 border-b border-[var(--fc-line)] px-3.5 py-3 text-left transition-colors",
                      activeId === t.id
                        ? "bg-[var(--color-brand-500)]/[0.08]"
                        : "hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar
                        name={t.contactName}
                        hue={t.avatarHue ?? 226}
                        size={44}
                      />
                      {t.isOnline && (
                        <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-[var(--fc-surface)] bg-emerald-500" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {t.pinned && (
                          <Pin className="size-3 shrink-0 text-[var(--color-signal-500)]" />
                        )}
                        <span className="truncate text-[13.5px] font-semibold">
                          {t.contactName}
                        </span>
                        {t.muted && (
                          <BellOff className="size-3 shrink-0 text-[var(--fc-fg-subtle)]" />
                        )}
                        <span className="ml-auto shrink-0 text-[10.5px] text-[var(--fc-fg-subtle)]">
                          {relativeTime(t.updatedAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span className="truncate text-[12px] text-[var(--fc-fg-muted)]">
                          {last
                            ? last.from === "me"
                              ? "You: "
                              : ""
                            : ""}
                          {last
                            ? last.media?.caption ??
                              last.body ??
                              last.media?.name ??
                              "Attachment"
                            : "No messages yet"}
                        </span>
                        {t.unread > 0 && (
                          <span className="ml-auto grid size-[18px] shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)] text-[10px] font-bold text-white">
                            {t.unread}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <span className="rounded bg-[var(--fc-surface-3)] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                          {STATUS_TEXT[t.channel]}
                        </span>
                        {t.labels?.slice(0, 2).map((l) => (
                          <span
                            key={l}
                            className="rounded bg-[var(--color-brand-500)]/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--color-brand-500)]"
                          >
                            {l}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-4 py-16 text-center text-[13px] text-[var(--fc-fg-muted)]">
                No conversations here.
              </li>
            )}
          </ul>
        </div>

        {/* -------- Conversation -------- */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            !mobileChat && "hidden lg:flex",
          )}
        >
          {!active ? (
            <EmptyState
              icon={<Send className="size-6" />}
              title="Pick a conversation"
              description="Choose a chat on the left, or start a new one."
            />
          ) : (
            <>
              {/* Chat header */}
              <header className="flex items-center gap-3 border-b border-[var(--fc-line)] bg-[var(--fc-surface)] px-4 py-2.5">
                <button
                  onClick={() => setMobileChat(false)}
                  className="grid size-8 place-items-center rounded-lg text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)] lg:hidden"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <Avatar
                  name={active.contactName}
                  hue={active.avatarHue ?? 226}
                  size={38}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-semibold">
                      {active.contactName}
                    </span>
                    {active.verified && (
                      <Badge tone="success">verified</Badge>
                    )}
                    {active.pinned && (
                      <Pin className="size-3 text-[var(--color-signal-500)]" />
                    )}
                  </div>
                  <div className="truncate text-[11.5px] text-[var(--fc-fg-subtle)]">
                    {active.isOnline
                      ? "online"
                      : active.lastSeen
                      ? `last seen ${relativeTime(active.lastSeen)}`
                      : active.about}
                  </div>
                </div>

                <button
                  onClick={() => startCall("audio")}
                  className="grid size-9 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)] hover:text-[var(--color-brand-500)]"
                  title="Voice call"
                >
                  <Phone className="size-4" />
                </button>
                <button
                  onClick={() => startCall("video")}
                  className="grid size-9 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)] hover:text-[var(--color-brand-500)]"
                  title="Video call"
                >
                  <Video className="size-4" />
                </button>
                <button
                  onClick={() => setPinnedOpen(true)}
                  className="grid size-9 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)] hover:text-[var(--color-signal-500)]"
                  title="Pinned messages"
                >
                  <Star className="size-4" />
                </button>
                <button
                  onClick={() => setThreadRoot(active.messages[active.messages.length - 1] ?? null)}
                  className="grid size-9 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)] hover:text-[var(--color-brand-500)]"
                  title="Open the last thread"
                >
                  <MessageSquare className="size-4" />
                </button>
                <button
                  onClick={() => setAssistantOpen(true)}
                  className="grid size-9 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)] hover:text-[var(--color-violet-500)]"
                  title="AI assistant"
                >
                  <Sparkles className="size-4" />
                </button>
                <button
                  onClick={() => {
                    toggleGibberThread(active.id);
                    setGibberOpen(true);
                  }}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg transition-colors hover:bg-[var(--fc-surface-2)]",
                    gibberThreads.includes(active.id)
                      ? "text-[var(--color-violet-500)]"
                      : "text-[var(--fc-fg-muted)]",
                  )}
                  title="Gibber channel"
                >
                  <Radio className="size-4" />
                </button>
                <button
                  onClick={() => setShowInfo(true)}
                  className="grid size-9 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)]"
                  title="Details"
                >
                  <MoreVertical className="size-4" />
                </button>
              </header>

              {/* Message search */}
              {showSearch && (
                <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2">
                  <Search className="size-3.5 text-[var(--fc-fg-subtle)]" />
                  <input
                    className="flex-1 bg-transparent text-[12.5px] outline-none"
                    placeholder="Search in this conversation"
                    value={messageQuery}
                    onChange={(e) => setMessageQuery(e.target.value)}
                    autoFocus
                  />
                  <span className="text-[11px] tabular-nums text-[var(--fc-fg-subtle)]">
                    {visibleMessages.length} results
                  </span>
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setMessageQuery("");
                    }}
                  >
                    <X className="size-3.5 text-[var(--fc-fg-subtle)]" />
                  </button>
                </div>
              )}

              {/* Messages */}
              <div
                ref={scrollRef}
                className="fc-scroll-thin relative flex-1 space-y-1 overflow-y-auto px-4 py-4"
              >
                {/* Wallpaper */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.14]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 20%, var(--color-brand-500) 0%, transparent 45%), radial-gradient(circle at 80% 70%, var(--color-accent-500) 0%, transparent 45%)",
                  }}
                />
                <div className="relative">
                  {visibleMessages.length === 0 && (
                    <div className="py-20 text-center">
                      <p className="text-[13px] text-[var(--fc-fg-muted)]">
                        {messageQuery
                          ? "No messages match that search."
                          : "No messages yet — say hello."}
                      </p>
                    </div>
                  )}

                  {visibleMessages.map((m, i) => (
                    <ChatBubble
                      key={m.id}
                      message={m}
                      thread={active}
                      replyTo={
                        m.replyTo
                          ? active.messages.find((x) => x.id === m.replyTo)
                          : undefined
                      }
                      isLast={i === visibleMessages.length - 1}
                      onReply={setReplyTo}
                      onReact={(emoji) => reactToMessage(active.id, m.id, emoji)}
                      onStar={() => toggleMessageStar(active.id, m.id)}
                      onDelete={() => {
                        deleteMessage(active.id, m.id);
                        toast.info("Message deleted", "Removed for everyone.");
                      }}
                      onOpenMedia={() => {
                        if (!m.media) return;
                        if (
                          m.media.kind === "image" ||
                          m.media.kind === "video" ||
                          m.media.kind === "location"
                        ) {
                          const items = active.messages
                            .filter(
                              (x) =>
                                x.media &&
                                (x.media.kind === "image" ||
                                  x.media.kind === "video" ||
                                  x.media.kind === "location"),
                            )
                            .map((x) => x.media!);
                          const idx = items.findIndex(
                            (x) => x.name === m.media!.name,
                          );
                          setViewer({ items, index: Math.max(0, idx) });
                        } else {
                          downloadFile(
                            m.media.name,
                            m.media.caption ?? m.media.name,
                          );
                          toast.success("Downloaded", m.media.name);
                        }
                      }}
                      onVote={(i2) => votePoll(active.id, m.id, i2)}
                      onThread={(mm) => setThreadRoot(mm)}
                      threadCount={(messageThreads[m.id] ?? []).length}
                      onSave={(mm) => {
                        saveMessageItem({
                          threadId: active.id,
                          threadName: active.contactName,
                          author: mm.from === "me" ? "You" : active.contactName,
                          body: mm.media?.caption ?? mm.body ?? mm.media?.name ?? "Attachment",
                          note: "",
                          tag: mm.media ? "attachment" : "important",
                        });
                        toast.success("Saved", "Kept in your saved messages.");
                      }}
                      onTranslate={(mm) => setTranslateTarget(mm)}
                      onReport={(mm) => setReportTarget(mm)}
                    />
                  ))}

                  {active.typing && <TypingIndicator name={active.contactName} />}
                </div>
              </div>

              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-2 border-t border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2">
                  <span className="min-w-0 flex-1 border-l-2 border-[var(--color-brand-500)] pl-2.5">
                    <span className="block text-[11.5px] font-semibold">
                      Replying to {replyTo.from === "me" ? "yourself" : active.contactName}
                    </span>
                    <span className="block truncate text-[11.5px] text-[var(--fc-fg-muted)]">
                      {replyTo.media?.caption ?? replyTo.body}
                    </span>
                  </span>
                  <button onClick={() => setReplyTo(null)}>
                    <X className="size-3.5 text-[var(--fc-fg-subtle)]" />
                  </button>
                </div>
              )}

              {/* Smart replies */}
              {showSmart && !recording && (
                <div className="border-t border-[var(--fc-line)] px-3 pt-2.5">
                  <SmartReplies
                    onPick={(r) => {
                      setDraft((d) => (d ? `${d} ${r.text}` : r.text));
                      setShowSmart(false);
                    }}
                    onDismiss={() => setShowSmart(false)}
                  />
                </div>
              )}

              {/* Sticker keyboard */}
              {showStickers && (
                <div className="border-t border-[var(--fc-line)] px-3 pt-2.5">
                  <StickerKeyboard
                    onPick={(emoji) => {
                      setDraft((d) => d + emoji);
                      setShowStickers(false);
                    }}
                    onClose={() => setShowStickers(false)}
                  />
                </div>
              )}

              {/* Composer */}
              <div className="border-t border-[var(--fc-line)] bg-[var(--fc-surface)] px-3 py-2.5">
                {recording ? (
                  <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-4 py-2.5">
                    <span className="size-2.5 animate-pulse rounded-full bg-rose-500" />
                    <span className="text-[13px] font-semibold tabular-nums">
                      Recording · 0:{String(recordSec).padStart(2, "0")}
                    </span>
                    <div className="flex flex-1 items-center gap-[2px]">
                      {Array.from({ length: 40 }).map((_, i) => {
                        const h = 4 + ((i * 29 + recordSec * 13) % 18);
                        return (
                          <span
                            key={i}
                            className="w-[2px] rounded-full bg-rose-500/70"
                            style={{ height: `${h}px` }}
                          />
                        );
                      })}
                    </div>
                    <button onClick={stopRecording} className="btn btn-primary btn-sm">
                      <Send className="size-3.5" />
                      Send
                    </button>
                    <button
                      onClick={() => {
                        setRecording(false);
                        window.clearInterval(recordTimer.current);
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-1.5">
                    <button
                      onClick={() => setShowAttach((v) => !v)}
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)] hover:text-[var(--color-brand-500)]"
                      title="Attach"
                    >
                      <Paperclip className="size-4" />
                    </button>
                    <button
                      onClick={() => setShowEmoji((v) => !v)}
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)] hover:text-[var(--color-signal-500)]"
                      title="Emoji"
                    >
                      <Smile className="size-4" />
                    </button>
                    <button
                      onClick={() => setShowStickers((v) => !v)}
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg transition-colors hover:bg-[var(--fc-surface-2)]",
                        showStickers
                          ? "text-[var(--color-brand-500)]"
                          : "text-[var(--fc-fg-muted)]",
                      )}
                      title="Stickers"
                    >
                      <StickerIcon className="size-4" />
                    </button>

                    <div className="relative flex-1">
                      <textarea
                        className="field max-h-32 min-h-[38px] resize-y py-2 text-[13.5px]"
                        placeholder={`Message ${active.contactName}`}
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          setThreadTyping(active.id, true);
                        }}
                        onBlur={() => setThreadTyping(active.id, false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                      />
                      {showEmoji && (
                        <div className="absolute bottom-full left-0 z-20 mb-2 grid w-[248px] grid-cols-6 gap-1 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-2 shadow-xl">
                          {EMOJI.map((e) => (
                            <button
                              key={e}
                              onClick={() => {
                                setDraft(draft + e);
                                setShowEmoji(false);
                              }}
                              className="grid size-8 place-items-center rounded-lg text-[18px] transition-transform hover:scale-125"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={startRecording}
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)] hover:text-rose-500"
                      title="Record voice note"
                    >
                      <Mic className="size-4" />
                    </button>
                    <button
                      onClick={generateAiReply}
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-colors hover:bg-[var(--fc-surface-2)] hover:text-[var(--color-violet-500)]"
                      title="Draft with AI"
                    >
                      <Wand2 className="size-4" />
                    </button>
                    <button
                      onClick={send}
                      disabled={!draft.trim()}
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-500)] text-white transition-opacity disabled:opacity-40"
                      title="Send"
                    >
                      <Send className="size-4" />
                    </button>
                  </div>
                )}

                {/* Attach menu */}
                {showAttach && (
                  <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-2 sm:grid-cols-6">
                    {[
                      { l: "Image", i: ImageIcon, k: "image" as const, accept: "image/*" },
                      { l: "Video", i: Video, k: "video" as const, accept: "video/*" },
                      { l: "Document", i: FileText, k: "document" as const, accept: "*/*" },
                      { l: "Audio", i: Mic, k: "audio" as const, accept: "audio/*" },
                    ].map((o) => (
                      <button
                        key={o.l}
                        onClick={() => pickFile(o.accept, o.k)}
                        className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--fc-surface-3)]"
                      >
                        <o.i className="size-4.5 text-[var(--color-brand-500)]" />
                        <span className="text-[11px] font-semibold">{o.l}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowAttach(false);
                        setLocationOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--fc-surface-3)]"
                    >
                      <MapPin className="size-4.5 text-emerald-500" />
                      <span className="text-[11px] font-semibold">Location</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAttach(false);
                        setPollOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--fc-surface-3)]"
                    >
                      <Vote className="size-4.5 text-amber-500" />
                      <span className="text-[11px] font-semibold">Poll</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAttach(false);
                        setContactOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--fc-surface-3)]"
                    >
                      <UserPlus className="size-4.5 text-violet-500" />
                      <span className="text-[11px] font-semibold">Contact</span>
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden" />
              </div>
            </>
          )}
        </div>

        {/* -------- Right rail -------- */}
        <aside className="hidden w-[280px] shrink-0 flex-col border-l border-[var(--fc-line)] bg-[var(--fc-surface)] xl:flex">
          {active && (
            <>
              <div className="border-b border-[var(--fc-line)] p-4">
                <div className="flex flex-col items-center text-center">
                  <Avatar
                    name={active.contactName}
                    hue={active.avatarHue ?? 226}
                    size={72}
                  />
                  <h3 className="mt-2.5 text-[15px] font-semibold">
                    {active.contactName}
                  </h3>
                  <p className="mt-0.5 text-[11.5px] text-[var(--fc-fg-subtle)]">
                    {active.about}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => startCall("audio")}
                      className="btn btn-secondary btn-sm"
                    >
                      <Phone className="size-3.5" />
                      Call
                    </button>
                    <button
                      onClick={() => startCall("video")}
                      className="btn btn-secondary btn-sm"
                    >
                      <Video className="size-3.5" />
                      Video
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 border-b border-[var(--fc-line)] px-3 py-2">
                {(
                  [
                    { id: "details", l: "Details" },
                    { id: "feed", l: "Feed" },
                    { id: "saved", l: "Saved" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setRailTab(t.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                      railTab === t.id
                        ? "bg-[var(--color-brand-500)]/[0.12] text-[var(--color-brand-500)]"
                        : "text-[var(--fc-fg-muted)] hover:bg-[var(--fc-surface-2)]",
                    )}
                  >
                    {t.l}
                    {t.id === "feed" && feedUnread > 0 && (
                      <span className="ml-1.5 rounded-full bg-[var(--color-brand-500)] px-1.5 text-[10px] text-white">
                        {feedUnread}
                      </span>
                    )}
                    {t.id === "saved" && savedMessages.length > 0 && (
                      <span className="ml-1.5 rounded-full bg-[var(--fc-surface-3)] px-1.5 text-[10px]">
                        {savedMessages.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {contact && railTab === "details" && (
                <div className="border-b border-[var(--fc-line)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                      AI marketing CRM
                    </span>
                    <Badge tone="accent">{leadScore}</Badge>
                  </div>
                  <dl className="space-y-1.5 text-[12px]">
                    {[
                      { l: "Stage", v: contact.stage },
                      {
                        l: "Value",
                        v: `£${contact.value.toLocaleString()}`,
                      },
                      { l: "Company", v: contact.company ?? "—" },
                      { l: "Source", v: contact.source },
                      { l: "Last touch", v: relativeTime(contact.lastContact) },
                    ].map((r) => (
                      <div key={r.l} className="flex justify-between gap-3">
                        <dt className="text-[var(--fc-fg-muted)]">{r.l}</dt>
                        <dd className="truncate font-semibold capitalize">{r.v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-2.5">
                    <Progress value={leadScore} tone="accent" />
                    <p className="mt-1.5 text-[10.5px] text-[var(--fc-fg-subtle)]">
                      Lead score — engagement, stage and recency combined.
                    </p>
                  </div>
                  <div className="mt-3 rounded-lg border border-[var(--color-violet-500)]/25 bg-[var(--color-violet-500)]/[0.07] p-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--color-violet-500)]">
                      Next best action
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fc-fg-muted)]">
                      {nextBestAction}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInfo(true)}
                    className="btn btn-ghost btn-sm mt-2 w-full"
                  >
                    Open contact record
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4">
                {railTab === "details" && (
                  <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                    Shared media
                  </span>
                  <button
                    onClick={() => setShowSearch(true)}
                    className="text-[11px] font-semibold text-[var(--color-brand-500)]"
                  >
                    Search
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {sharedMedia.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() =>
                        setViewer({
                          items: sharedMedia.map((x) => x.media!),
                          index: i,
                        })
                      }
                      className="aspect-square overflow-hidden rounded-lg"
                      title={m.media?.name}
                    >
                      <GeneratedArt
                        seed={m.media?.seed ?? m.media?.name ?? "x"}
                        className="h-full w-full"
                        rounded={false}
                      />
                    </button>
                  ))}
                  {sharedMedia.length === 0 && (
                    <p className="col-span-3 py-6 text-center text-[11.5px] text-[var(--fc-fg-subtle)]">
                      No images or video yet.
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                    Channels
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {[
                      { l: "Channel", v: STATUS_TEXT[active.channel] },
                      { l: "Phone", v: active.phone ?? "—" },
                      { l: "Email", v: active.email ?? "—" },
                      { l: "Labels", v: active.labels?.join(", ") ?? "—" },
                    ].map((r) => (
                      <div
                        key={r.l}
                        className="flex justify-between gap-3 text-[12px]"
                      >
                        <span className="text-[var(--fc-fg-muted)]">{r.l}</span>
                        <span className="truncate font-semibold">{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {campaigns.length > 0 && (
                  <div className="mt-5">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                      Campaign touchpoints
                    </span>
                    <ul className="mt-2 space-y-1.5">
                      {campaigns.slice(0, 3).map((c) => (
                        <li
                          key={c.id}
                          className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-2.5 py-2"
                        >
                          <div className="truncate text-[11.5px] font-semibold">
                            {c.name}
                          </div>
                          <div className="text-[10.5px] text-[var(--fc-fg-subtle)]">
                            {c.channel} · {c.sent.toLocaleString()} sent
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                  </>
                )}

                {railTab === "feed" && (
                  <NotificationFeed
                    feed={feed}
                    onOpen={(threadId) => {
                      if (threadId) {
                        setActiveId(threadId);
                        setMobileChat(true);
                      }
                    }}
                    onRead={markFeedRead}
                    onReadAll={markAllFeedRead}
                  />
                )}

                {railTab === "saved" && (
                  <SavedMessagesPanel
                    items={savedMessages}
                    onRemove={removeSavedMessage}
                    onOpen={(threadId) => {
                      setActiveId(threadId);
                      setMobileChat(true);
                    }}
                  />
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ---------------- Media lightbox ---------------- */}
      {viewer && (
        <MediaViewer
          items={viewer.items}
          index={viewer.index}
          onIndex={(i) => setViewer({ ...viewer, index: i })}
          onClose={() => setViewer(null)}
        />
      )}

      {/* ---------------- Real location & contact sharing ---------------- */}
      <LocationShareDialog
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onShare={(loc: SharedLocation) =>
          sendMedia({
            kind: "location",
            name: loc.address ?? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`,
            sizeLabel: `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
            mime: "text/location",
            lat: loc.lat,
            lng: loc.lng,
            address: loc.address,
          })
        }
      />
      <ContactShareDialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        onShare={(card) =>
          sendMedia({
            kind: "contact",
            name: card.name,
            sizeLabel: "vCard",
            mime: "text/vcard",
            contactCard: card,
          })
        }
      />

      {/* Incoming rings and the active call overlay are mounted globally. */}

      {/* ---------------- AI reply modal ---------------- */}
      <Modal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        title="Draft a reply"
        description="Six humanising passes applied to the last thing they said, so it reads like a person wrote it."
        size="lg"
        footer={
          <>
            <button onClick={() => setAiOpen(false)} className="btn btn-ghost btn-sm">
              Discard
            </button>
            <button
              onClick={() => {
                setDraft(aiText);
                setAiOpen(false);
                toast.success("Draft loaded", "Edit it, then send.");
              }}
              className="btn btn-primary btn-sm"
            >
              <Send className="size-3.5" />
              Use this draft
            </button>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <textarea
            className="field min-h-[220px] resize-y text-[13.5px] leading-relaxed"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
          />
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                Human score
              </div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-[26px] font-bold leading-none">
                  {aiScore.after}
                </span>
                <span className="text-[12px] text-[var(--fc-fg-subtle)]">
                  from {aiScore.before}
                </span>
              </div>
              <div className="mt-2">
                <Progress
                  value={aiScore.after}
                  tone={aiScore.after >= 80 ? "success" : "signal"}
                />
              </div>
            </div>
            <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3">
              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                Passes applied
              </div>
              <ul className="space-y-1.5">
                {aiPasses.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-[11.5px]">
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-bold",
                        p.count > 0
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-[var(--fc-surface-3)] text-[var(--fc-fg-subtle)]",
                      )}
                    >
                      {p.count > 0 ? p.count : "–"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Modal>

      {/* ---------------- Poll composer ---------------- */}
      <Modal
        open={pollOpen}
        onClose={() => setPollOpen(false)}
        title="Create a poll"
        description="Options can be changed after it is sent; votes tally live."
        size="md"
        footer={
          <>
            <button
              onClick={() => setPollOpen(false)}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!active || !pollQuestion.trim()) return;
                const options = pollOptions
                  .map((o) => o.trim())
                  .filter(Boolean)
                  .map((label) => ({ label, votes: 0 }));
                if (!options.length) return;
                sendMessage(active.id, pollQuestion.trim(), {
                  kind: "poll",
                  name: "poll",
                  sizeLabel: `${options.length} options`,
                  mime: "text/poll",
                  seed: pollQuestion,
                  poll: {
                    question: pollQuestion.trim(),
                    options,
                    totalVotes: 0,
                  },
                });
                setPollOpen(false);
                toast.success("Poll sent", "Votes will tally as they come in.");
              }}
              className="btn btn-primary btn-sm"
            >
              <Vote className="size-3.5" />
              Send poll
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold">Question</span>
            <input
              className="field"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
            />
          </label>
          <div>
            <span className="mb-1.5 block text-[12px] font-semibold">Options</span>
            <div className="space-y-2">
              {pollOptions.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="field"
                    value={o}
                    onChange={(e) =>
                      setPollOptions((prev) =>
                        prev.map((x, j) => (j === i ? e.target.value : x)),
                      )
                    }
                  />
                  <button
                    onClick={() =>
                      setPollOptions((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--fc-fg-subtle)] hover:text-rose-500"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                setPollOptions((prev) => [...prev, `Option ${prev.length + 1}`])
              }
              className="btn btn-secondary btn-sm mt-2"
            >
              <Plus className="size-3.5" />
              Add option
            </button>
          </div>
        </div>
      </Modal>

      {/* ---------------- New chat modal ---------------- */}
      <Modal
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        title="Start a conversation"
        description="Pick a contact from the CRM, or paste a phone number for SMS and WhatsApp."
        size="md"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fc-fg-subtle)]" />
            <input
              className="field pl-9"
              placeholder="Search people by name or email…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {userQuery.trim().length < 2 ? (
              <li className="px-2 py-6 text-center text-[12.5px] text-[var(--fc-fg-subtle)]">
                Type at least two characters to find registered users.
              </li>
            ) : searching ? (
              <li className="px-2 py-6 text-center text-[12.5px] text-[var(--fc-fg-subtle)]">
                Searching…
              </li>
            ) : userResults.length === 0 ? (
              <li className="px-2 py-6 text-center text-[12.5px] text-[var(--fc-fg-subtle)]">
                No users found for “{userQuery}”.
              </li>
            ) : (
              userResults.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => void startWithUser(u.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--fc-surface-2)]"
                  >
                    <Avatar name={u.displayName} hue={226} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {u.displayName}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--fc-fg-subtle)]">
                        {u.email ?? u.handle ?? "FriendConnect user"}
                      </span>
                    </span>
                    <Badge tone="brand">Message</Badge>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </Modal>

      {/* ---------------- Details modal ---------------- */}
      <Modal
        open={showInfo}
        onClose={() => setShowInfo(false)}
        title={active?.contactName ?? ""}
        description={active?.about}
        size="md"
        footer={
          <button onClick={() => setShowInfo(false)} className="btn btn-ghost btn-sm">
            Close
          </button>
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { l: "Channel", v: STATUS_TEXT[active.channel] },
                { l: "Phone", v: active.phone ?? "—" },
                { l: "Email", v: active.email ?? "—" },
                { l: "Messages", v: String(active.messages.length) },
                { l: "Labels", v: active.labels?.join(", ") ?? "—" },
                { l: "Online", v: active.isOnline ? "yes" : "no" },
              ].map((r) => (
                <div
                  key={r.l}
                  className="rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2"
                >
                  <div className="text-[10.5px] uppercase tracking-wide text-[var(--fc-fg-subtle)]">
                    {r.l}
                  </div>
                  <div className="mt-0.5 text-[13px] font-semibold">{r.v}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleThreadPin(active.id)}
                className="btn btn-secondary btn-sm"
              >
                <Pin className="size-3.5" />
                {active.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => toggleThreadMute(active.id)}
                className="btn btn-secondary btn-sm"
              >
                {active.muted ? (
                  <Bell className="size-3.5" />
                ) : (
                  <BellOff className="size-3.5" />
                )}
                {active.muted ? "Unmute" : "Mute"}
              </button>
              <button
                onClick={() => toggleThreadArchive(active.id)}
                className="btn btn-secondary btn-sm"
              >
                <Archive className="size-3.5" />
                {active.archived ? "Unarchive" : "Archive"}
              </button>
              <button
                onClick={async () => {
                  const ok = await copyToClipboard(active.phone ?? active.email ?? "");
                  toast[ok ? "success" : "error"](ok ? "Copied" : "Copy failed");
                }}
                className="btn btn-secondary btn-sm"
              >
                <Link2 className="size-3.5" />
                Copy contact
              </button>
            </div>

            {contact && (
              <div className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
                  CRM record
                </div>
                <p className="text-[13px] leading-relaxed text-[var(--fc-fg-muted)]">
                  {contact.notes ??
                    `${contact.name} is a ${contact.stage} contact at ${contact.company ?? "an unknown company"}, worth £${contact.value.toLocaleString()}.`}
                </p>
                <button
                  onClick={() => {
                    setShowInfo(false);
                    toast.info("Opened", `${contact.name}'s record in Contacts.`);
                  }}
                  className="btn btn-secondary btn-sm mt-3"
                >
                  Open full record
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ---------------- Thread panel ---------------- */}
      <Modal
        open={!!threadRoot}
        onClose={() => setThreadRoot(null)}
        title="Message thread"
        description="Replies that belong together, kept out of the main conversation."
        size="md"
      >
        {threadRoot && active && (
          <div className="h-[480px]">
            <MessageThreadPanel
              rootBody={threadRoot.media?.caption ?? threadRoot.body}
              replies={messageThreads[threadRoot.id] ?? []}
              onSend={(body) => {
                addThreadReply(
                  active.id,
                  threadRoot.id,
                  body,
                  "me",
                  "You",
                );
                toast.success("Reply added", "Only the people in the thread see it.");
              }}
              onClose={() => setThreadRoot(null)}
            />
          </div>
        )}
      </Modal>

      {/* ---------------- AI assistant ---------------- */}
      <Modal
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        title="AI assistant"
        description="Reads this conversation and helps you answer it. It never posts without you."
        size="md"
      >
        <div className="h-[520px]">
          <AiAssistantPanel
            turns={active ? (assistantChats[active.id] ?? []) : []}
            onAsk={(q) => {
              if (!active) return;
              addAssistantTurn(active.id, { role: "user", body: q });
              addAssistantTurn(active.id, {
                role: "assistant",
                body: assistantAnswerFor(q),
              });
            }}
            onReset={() => {
              if (active) clearAssistantChat(active.id);
            }}
          />
        </div>
      </Modal>

      {/* ---------------- Gibber channel ---------------- */}
      <Modal
        open={gibberOpen}
        onClose={() => setGibberOpen(false)}
        title="Gibber channel"
        description="A denser wire format for agent-to-agent traffic, carried as tone pairs."
        size="md"
      >
        {active && (
          <div className="h-[540px]">
            <GibberChannel
              contactName={active.contactName}
              onSend={(token, text) => {
                sendMessage(active.id, `[${token}] ${text}`);
                toast.success("Sent on the wire", "Framed, checksummed and delivered.");
              }}
              onBack={() => setGibberOpen(false)}
            />
          </div>
        )}
      </Modal>

      {/* ---------------- Kid-safe ---------------- */}
      <Modal
        open={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        title="Kid-safe mode"
        description="The guardian's side of the messenger — who can reach the child, what gets filtered, and what the safety log records."
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto">
          <KidSafePanel
            safety={safety}
            onSetControl={setSafetyControl}
            onToggle={setKidSafe}
            onSetAgeBand={(band) => {
              updateSafety({ ageBand: band });
              setKidSafe(true);
            }}
          />
        </div>
      </Modal>

      {/* ---------------- Pinned messages ---------------- */}
      <Modal
        open={pinnedOpen}
        onClose={() => setPinnedOpen(false)}
        title="Pinned messages"
        description="The messages you starred in this conversation — the ones worth keeping."
        size="md"
      >
        <ul className="space-y-2">
          {active?.messages
            .filter((m) => m.starred)
            .map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] p-3"
              >
                <div className="flex items-center gap-2">
                  <Star className="size-3 fill-[var(--color-signal-500)] text-[var(--color-signal-500)]" />
                  <span className="text-[12px] font-semibold">
                    {m.from === "me" ? "You" : active.contactName}
                  </span>
                  <span className="ml-auto text-[10.5px] text-[var(--fc-fg-subtle)]">
                    {relativeTime(m.at)}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed">
                  {m.media?.caption ?? m.body ?? m.media?.name}
                </p>
              </li>
            ))}
          {(active?.messages.filter((m) => m.starred).length ?? 0) === 0 && (
            <li className="rounded-xl border border-dashed border-[var(--fc-line)] p-6 text-center text-[12.5px] text-[var(--fc-fg-subtle)]">
              Nothing pinned here yet. Star a message to keep it.
            </li>
          )}
        </ul>
        {reports.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-3 py-2 text-[11.5px] text-[var(--fc-fg-muted)]">
            <Flag className="size-3.5 shrink-0" />
            {reports.length} report{reports.length === 1 ? "" : "s"} filed from this
            workspace — the safety team reviews each one.
          </div>
        )}
      </Modal>

      {/* ---------------- Translate ---------------- */}
      <Modal
        open={!!translateTarget}
        onClose={() => setTranslateTarget(null)}
        title="Translate"
        description="The offline translation pack — no request leaves the device."
        size="sm"
      >
        {translateTarget && (
          <TranslateInline
            body={translateTarget.media?.caption ?? translateTarget.body}
            onClose={() => setTranslateTarget(null)}
          />
        )}
      </Modal>

      {/* ---------------- Report ---------------- */}
      <ReportDialog
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        threadName={active?.contactName ?? "the conversation"}
        messageBody={
          reportTarget?.media?.caption ?? reportTarget?.body ?? "Attachment"
        }
        onSubmit={(reason, detail) => {
          if (!active || !reportTarget) return;
          reportMessage({
            threadName: active.contactName,
            messageBody:
              reportTarget.media?.caption ?? reportTarget.body ?? "Attachment",
            reason,
            detail,
            messageId: reportTarget.id,
          } as Parameters<typeof reportMessage>[0]);
          toast.success("Report sent", "The safety team will review it.");
        }}
      />
    </div>
  );
}
