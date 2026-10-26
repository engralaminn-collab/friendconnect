"use client";

import * as React from "react";
import {
  Bell,
  Bot,
  Bookmark,
  MessageSquare,
  MessagesSquare,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Avatar, Badge, EmptyState } from "@/components/ui/primitives";
import { ASSISTANT_ANSWERS, ASSISTANT_CHIPS } from "@/lib/data/messagingExtras";
import { cn, relativeTime } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* notification feed                                                    */
/* ------------------------------------------------------------------ */

const FEED_ICON: Record<string, string> = {
  message: "💬",
  call: "📞",
  mention: "👤",
  safety: "🛡️",
  system: "⚙️",
};

export function NotificationFeed({
  feed,
  onOpen,
  onRead,
  onReadAll,
}: {
  feed: {
    id: string;
    at: string;
    kind: "message" | "call" | "mention" | "safety" | "system";
    title: string;
    body: string;
    threadId?: string;
    read: boolean;
    actor?: string;
    hue?: number;
  }[];
  onOpen: (threadId?: string) => void;
  onRead: (id: string) => void;
  onReadAll: () => void;
}) {
  const unread = feed.filter((f) => !f.read).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] font-semibold">Notifications</span>
        {unread > 0 && <Badge tone="danger">{unread} new</Badge>}
        <button
          onClick={onReadAll}
          className="ml-auto text-[11px] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
        >
          mark all read
        </button>
      </div>

      {feed.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="Nothing new"
          description="Calls, mentions and messages land here."
        />
      ) : (
        <ul className="fc-card divide-y divide-[var(--fc-line)] overflow-hidden">
          {feed.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => {
                  onRead(f.id);
                  onOpen(f.threadId);
                }}
                className={cn(
                  "flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[var(--fc-surface-2)]",
                  !f.read && "bg-[var(--color-brand-500)]/[0.05]",
                )}
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{
                    backgroundColor: `hsl(${f.hue ?? 226} 55% 45%)`,
                  }}
                >
                  {f.actor ?? FEED_ICON[f.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[12.5px] font-semibold">
                      {f.title}
                    </span>
                    {!f.read && (
                      <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                    )}
                    <span className="ml-auto shrink-0 text-[10.5px] text-[var(--fc-fg-subtle)]">
                      {relativeTime(f.at)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--fc-fg-muted)]">
                    {f.body}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* saved messages                                                       */
/* ------------------------------------------------------------------ */

export function SavedMessagesPanel({
  items,
  onRemove,
  onOpen,
}: {
  items: {
    id: string;
    threadId: string;
    threadName: string;
    author: string;
    body: string;
    at: string;
    note: string;
    tag: "important" | "reference" | "todo" | "attachment";
  }[];
  onRemove: (id: string) => void;
  onOpen: (threadId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] font-semibold">Saved messages</span>
        <Badge>{items.length}</Badge>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-5" />}
          title="Nothing saved yet"
          description="Save a message to keep it here with a note."
        />
      ) : (
        <ul className="fc-card divide-y divide-[var(--fc-line)] overflow-hidden">
          {items.map((s) => (
            <li key={s.id} className="group px-3.5 py-3">
              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    s.tag === "important"
                      ? "danger"
                      : s.tag === "todo"
                      ? "signal"
                      : s.tag === "attachment"
                      ? "violet"
                      : "accent"
                  }
                >
                  {s.tag}
                </Badge>
                <span className="text-[11.5px] font-semibold">{s.author}</span>
                <span className="text-[11px] text-[var(--fc-fg-subtle)]">
                  in {s.threadName}
                </span>
                <span className="ml-auto text-[10.5px] text-[var(--fc-fg-subtle)]">
                  {relativeTime(s.at)}
                </span>
                <button
                  onClick={() => onRemove(s.id)}
                  className="grid size-6 place-items-center rounded-md text-[var(--fc-fg-subtle)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed">{s.body}</p>
              {s.note && (
                <p className="mt-1 rounded-lg bg-[var(--fc-surface-2)] px-2 py-1 text-[11.5px] italic text-[var(--fc-fg-muted)]">
                  {s.note}
                </p>
              )}
              <button
                onClick={() => onOpen(s.threadId)}
                className="mt-1.5 text-[11px] font-semibold text-[var(--color-brand-500)]"
              >
                jump to the conversation
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* message thread                                                       */
/* ------------------------------------------------------------------ */

export function MessageThreadPanel({
  rootBody,
  replies,
  onSend,
  onClose,
}: {
  rootBody: string;
  replies: { id: string; from: "me" | "them"; author: string; body: string; at: string }[];
  onSend: (body: string) => void;
  onClose: () => void;
}) {
  const [body, setBody] = React.useState("");

  return (
    <div className="fc-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
        <MessageSquare className="size-3.5 text-[var(--color-brand-500)]" />
        <span className="text-[12.5px] font-semibold">Thread</span>
        <Badge>{replies.length}</Badge>
        <button
          onClick={onClose}
          className="ml-auto grid size-6 place-items-center rounded-md text-[var(--fc-fg-subtle)] hover:bg-[var(--fc-surface-3)] hover:text-[var(--fc-fg)]"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="border-b border-[var(--fc-line)] px-4 py-3">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
          Original
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed">{rootBody}</p>
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto p-4">
        {replies.length === 0 && (
          <li className="rounded-xl border border-dashed border-[var(--fc-line)] p-4 text-center text-[12px] text-[var(--fc-fg-subtle)]">
            No replies yet. Replies live here, out of the main conversation.
          </li>
        )}
        {replies.map((r) => (
          <li
            key={r.id}
            className={cn(
              "rounded-xl border px-3 py-2",
              r.from === "me"
                ? "ml-6 border-[var(--color-brand-500)]/25 bg-[var(--color-brand-500)]/[0.06]"
                : "mr-6 border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-semibold">{r.author}</span>
              <span className="text-[10.5px] text-[var(--fc-fg-subtle)]">
                {relativeTime(r.at)}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed">{r.body}</p>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const b = body.trim();
          if (!b) return;
          onSend(b);
          setBody("");
        }}
        className="flex gap-2 border-t border-[var(--fc-line)] p-3"
      >
        <input
          className="field h-9 flex-1 text-[12.5px]"
          placeholder="Reply in this thread…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI assistant                                                         */
/* ------------------------------------------------------------------ */

export function AiAssistantPanel({
  turns,
  onAsk,
  onReset,
}: {
  turns: { id: string; role: "user" | "assistant"; body: string; at: string }[];
  onAsk: (question: string) => void;
  onReset: () => void;
}) {
  const [question, setQuestion] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns.length]);

  return (
    <div className="fc-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--fc-line)] bg-[var(--fc-surface-2)] px-4 py-2.5">
        <Bot className="size-3.5 text-[var(--color-violet-500)]" />
        <span className="text-[12.5px] font-semibold">AI assistant</span>
        <span className="text-[10.5px] text-[var(--fc-fg-subtle)]">
          reads this thread only
        </span>
        <button
          onClick={onReset}
          className="ml-auto grid size-6 place-items-center rounded-md text-[var(--fc-fg-subtle)] hover:bg-[var(--fc-surface-3)] hover:text-[var(--fc-fg)]"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--fc-line)] p-4">
            <p className="text-[12.5px] leading-relaxed text-[var(--fc-fg-muted)]">
              Ask about this conversation. The assistant sees the thread, the
              attachments and the contact record — nothing else.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ASSISTANT_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => onAsk(c)}
                  className="chip text-[11px] transition-colors hover:bg-[var(--color-brand-500)]/[0.12]"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              t.role === "user"
                ? "ml-8 border-[var(--color-brand-500)]/25 bg-[var(--color-brand-500)]/[0.06]"
                : "mr-8 border-[var(--fc-line)] bg-[var(--fc-surface-2)]",
            )}
          >
            <div className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-[var(--fc-fg-subtle)]">
              {t.role === "user" ? "You" : "Assistant"}
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed">{t.body}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = question.trim();
          if (!q) return;
          onAsk(q);
          setQuestion("");
        }}
        className="flex gap-2 border-t border-[var(--fc-line)] p-3"
      >
        <input
          className="field h-9 flex-1 text-[12.5px]"
          placeholder="Ask about this thread…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm">
          <MessagesSquare className="size-3.5" />
        </button>
      </form>
    </div>
  );
}

/** Maps a chip or question onto the canned answer, with a sensible fallback. */
export function assistantAnswerFor(question: string): string {
  const key = question.trim().toLowerCase();
  if (ASSISTANT_ANSWERS[key]) return ASSISTANT_ANSWERS[key];
  for (const [k, v] of Object.entries(ASSISTANT_ANSWERS)) {
    if (key.includes(k)) return v;
  }
  return "I read the thread. The open items are the English-test booking, the bank letter and the deposit date — everything else is already agreed.";
}
