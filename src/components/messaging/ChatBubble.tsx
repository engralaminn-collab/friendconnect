"use client";

import * as React from "react";
import {
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  MapPin,
  Mic,
  Phone,
  PhoneOff,
  Play,
  Plus,
  Reply,
  Star,
  Trash2,
  Bookmark,
  Languages,
  MessageSquare,
  Flag,
  User2,
  Vote,
} from "lucide-react";
import { GeneratedArt } from "@/components/studio/GeneratedArt";
import { Badge, type BadgeTone } from "@/components/ui/primitives";
import { cn, formatDuration } from "@/lib/utils";
import type { Message, Thread } from "@/lib/types";

const EMOJI_SETS = ["👍", "❤️", "😂", "🙏", "🔥", "🎉"];

function docIcon(mime: string) {
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return FileSpreadsheet;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  return FileText;
}

export function ChatBubble({
  message,
  thread,
  replyTo,
  onReply,
  onReact,
  onStar,
  onDelete,
  onOpenMedia,
  onVote,
  isLast,
  onThread,
  onSave,
  onTranslate,
  onReport,
  threadCount = 0,
}: {
  message: Message;
  thread: Thread;
  replyTo?: Message;
  onReply: (m: Message) => void;
  onReact: (emoji: string) => void;
  onStar: () => void;
  onDelete: () => void;
  onOpenMedia: (m: Message) => void;
  onVote: (optionIndex: number) => void;
  isLast: boolean;
  onThread?: (m: Message) => void;
  onSave?: (m: Message) => void;
  onTranslate?: (m: Message) => void;
  onReport?: (m: Message) => void;
  threadCount?: number;
}) {
  const mine = message.from === "me";
  const [showReactions, setShowReactions] = React.useState(false);
  const [showActions, setShowActions] = React.useState(false);

  /* ---------------- system message ---------------- */
  if (message.kind === "system") {
    const Icon =
      message.systemKind === "call"
        ? Phone
        : message.systemKind === "media"
        ? FileImage
        : message.systemKind === "security"
        ? Clock
        : null;
    return (
      <div className="my-2 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--fc-line)] bg-[var(--fc-surface)]/85 px-3 py-1 text-[11.5px] text-[var(--fc-fg-muted)] backdrop-blur">
          {Icon && <Icon className="size-3" />}
          {message.body}
        </span>
      </div>
    );
  }

  /* ---------------- media body ---------------- */
  const renderMedia = () => {
    const m = message.media;
    if (!m) return null;

    switch (m.kind) {
      case "image":
        return (
          <button
            onClick={() => onOpenMedia(message)}
            className="group relative block w-full overflow-hidden rounded-xl"
          >
            <GeneratedArt
              seed={m.seed ?? m.name}
              className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03]"
              label={m.caption ?? m.name}
            />
            <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              {m.sizeLabel}
            </span>
          </button>
        );

      case "video": {
        const Doc = docIcon(m.mime);
        return (
          <button
            onClick={() => onOpenMedia(message)}
            className="group relative block w-full overflow-hidden rounded-xl"
          >
            <GeneratedArt
              seed={m.seed ?? m.name}
              className="aspect-video w-full transition-transform duration-500 group-hover:scale-[1.03]"
              label={m.caption ?? m.name}
            />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-12 place-items-center rounded-full bg-black/45 backdrop-blur transition-transform group-hover:scale-110">
                <Play className="size-5 fill-white text-white" />
              </span>
            </span>
            <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              {formatDuration(m.durationSec ?? 0)} · {m.resolution ?? "HD"}
            </span>
          </button>
        );
      }

      case "voice":
      case "audio": {
        const Doc = docIcon(m.mime);
        return (
          <div className="flex min-w-[190px] items-center gap-3 rounded-xl bg-[var(--fc-surface-3)] px-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)] text-white">
              <Mic className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex h-6 items-end gap-[2px]">
                {Array.from({ length: 28 }).map((_, i) => {
                  const seed = (i * 37 + (m.seed?.length ?? 0) * 7) % 100;
                  const h = 4 + (seed % 18);
                  return (
                    <span
                      key={i}
                      className="w-[2px] rounded-full bg-[var(--color-brand-500)]/70"
                      style={{ height: `${h}px` }}
                    />
                  );
                })}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[var(--fc-fg-subtle)]">
                <span>{formatDuration(m.durationSec ?? 0)}</span>
                <span>·</span>
                <span>{m.sizeLabel}</span>
              </div>
            </div>
            <button
              onClick={() => onOpenMedia(message)}
              className="shrink-0 text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
            >
              <Download className="size-3.5" />
            </button>
            <Doc className="hidden" />
          </div>
        );
      }

      case "document": {
        const Icon = docIcon(m.mime);
        return (
          <button
            onClick={() => onOpenMedia(message)}
            className="flex min-w-[220px] items-center gap-3 rounded-xl bg-[var(--fc-surface-3)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--fc-surface-2)]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-500)]/12 text-[var(--color-brand-500)]">
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">
                {m.name}
              </span>
              <span className="block text-[11px] text-[var(--fc-fg-subtle)]">
                {m.sizeLabel} · {m.mime.split("/")[1]?.toUpperCase() ?? "FILE"}
              </span>
            </span>
            <Download className="size-4 shrink-0 text-[var(--fc-fg-subtle)]" />
          </button>
        );
      }

      case "location":
        return (
          <button
            onClick={() => onOpenMedia(message)}
            className="block w-full overflow-hidden rounded-xl text-left"
          >
            <span className="relative block aspect-[16/10] w-full bg-[linear-gradient(135deg,#1e293b,#0f172a)]">
              <span className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.35)_1px,transparent_1px)] [background-size:28px_28px]" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="grid size-10 place-items-center rounded-full bg-[var(--color-brand-500)] shadow-lg">
                  <MapPin className="size-5 text-white" />
                </span>
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <span className="block text-[13px] font-semibold text-white">
                  {m.name}
                </span>
                <span className="block text-[11px] text-white/70">
                  {m.address}
                </span>
              </span>
            </span>
          </button>
        );

      case "contact":
        return (
          <div className="flex min-w-[220px] items-center gap-3 rounded-xl bg-[var(--fc-surface-3)] px-3 py-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--color-brand-500)]/15 text-[var(--color-brand-500)]">
              <User2 className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold">
                {m.contactCard?.name}
              </span>
              <span className="block text-[11.5px] text-[var(--fc-fg-subtle)]">
                {m.contactCard?.company}
              </span>
              <span className="block text-[11.5px] text-[var(--fc-fg-subtle)]">
                {m.contactCard?.phone}
              </span>
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPoll = () => {
    const poll = message.media?.poll;
    if (!poll) return null;
    const max = Math.max(1, ...poll.options.map((o) => o.votes));
    return (
      <div className="min-w-[240px]">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <Vote className="size-3.5 text-[var(--color-brand-500)]" />
          {poll.question}
        </div>
        <div className="mt-2.5 space-y-1.5">
          {poll.options.map((o, i) => {
            const pct = Math.round((o.votes / max) * 100);
            const mine = poll.myOption === i;
            return (
              <button
                key={o.label}
                onClick={() => onVote(i)}
                className="relative block w-full overflow-hidden rounded-lg border border-[var(--fc-line)] px-3 py-2 text-left"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 transition-[width] duration-500",
                    mine ? "bg-[var(--color-brand-500)]/22" : "bg-[var(--fc-surface-3)]",
                  )}
                  style={{ width: `${pct}%` }}
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="text-[12.5px] font-medium">{o.label}</span>
                  <span className="text-[11.5px] tabular-nums text-[var(--fc-fg-muted)]">
                    {o.votes}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] text-[var(--fc-fg-subtle)]">
          {poll.totalVotes} votes
          {poll.myOption !== undefined ? " · you voted" : ""}
        </div>
      </div>
    );
  };

  const Tick =
    message.status === "read" ? CheckCheck : message.status === "sent" ? Check : null;

  return (
    <div
      className={cn(
        "group relative flex w-full gap-2",
        mine ? "justify-end" : "justify-start",
        !isLast && "mb-1",
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Hover toolbar */}
      {!mine && (
        <div
          className={cn(
            "flex items-center self-end transition-opacity",
            showActions ? "opacity-100" : "opacity-0",
          )}
        >
          <button
            onClick={() => onReply(message)}
            className="grid size-7 place-items-center rounded-lg border border-[var(--fc-line)] bg-[var(--fc-surface)] text-[var(--fc-fg-subtle)] hover:text-[var(--fc-fg)]"
            title="Reply"
          >
            <Reply className="size-3.5" />
          </button>
        </div>
      )}

      <div className={cn("max-w-[78%] sm:max-w-[70%]", mine && "flex flex-col items-end")}>
        {/* Reply quote */}
        {replyTo && (
          <div
            className={cn(
              "mb-0.5 rounded-lg border-l-2 px-2.5 py-1 text-[11.5px]",
              mine
                ? "border-[var(--color-brand-300)] bg-black/15 text-white/80"
                : "border-[var(--color-brand-500)] bg-[var(--fc-surface-3)] text-[var(--fc-fg-muted)]",
            )}
          >
            <span className="block font-semibold">
              {replyTo.from === "me" ? "You" : thread.contactName}
            </span>
            <span className="line-clamp-1">
              {replyTo.media?.caption ?? replyTo.body ?? "Attachment"}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-3.5 py-2.5 shadow-sm",
            mine
              ? "rounded-br-md bg-[var(--color-brand-500)] text-white"
              : "rounded-bl-md border border-[var(--fc-line)] bg-[var(--fc-surface)] text-[var(--fc-fg)]",
          )}
        >
          {message.media && message.media.kind !== "location" && (
            <div className={cn(message.media.caption && "mb-2")}>{renderMedia()}</div>
          )}

          {message.media?.kind === "location" && (
            <div className="mb-2">{renderMedia()}</div>
          )}

          {message.media?.poll ? renderPoll() : null}

          {message.body && (
            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
              {message.deleted ? (
                <span className="italic opacity-70">This message was deleted</span>
              ) : (
                message.body
              )}
            </p>
          )}

          {message.media?.caption && (
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed opacity-90">
              {message.media.caption}
            </p>
          )}

          {/* Meta */}
          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-1.5 text-[10.5px]",
              mine ? "text-white/70" : "text-[var(--fc-fg-subtle)]",
            )}
          >
            {message.edited && <span>edited</span>}
            {message.starred && <Star className="size-2.5 fill-current" />}
            <span>
              {new Date(message.at).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {mine && Tick && <Tick className="size-3" />}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div
              className={cn(
                "absolute -bottom-3 flex gap-1",
                mine ? "right-2" : "left-2",
              )}
            >
              {message.reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => onReact(r.emoji)}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] shadow-sm",
                    r.mine
                      ? "border-[var(--color-brand-400)] bg-[var(--color-brand-500)] text-white"
                      : "border-[var(--fc-line)] bg-[var(--fc-surface)] text-[var(--fc-fg-muted)]",
                  )}
                >
                  {r.emoji}
                  <span className="tabular-nums">{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div
            className={cn(
              "absolute -top-9 z-10 flex gap-0.5 rounded-xl border border-[var(--fc-line)] bg-[var(--fc-surface)] p-1 shadow-lg",
              mine ? "right-2" : "left-2",
            )}
          >
            {EMOJI_SETS.map((e) => (
              <button
                key={e}
                onClick={() => onReact(e)}
                className="grid size-7 place-items-center rounded-lg text-[15px] transition-transform hover:scale-125"
              >
                {e}
              </button>
            ))}
            <button
              onClick={() => onStar()}
              className="grid size-7 place-items-center rounded-lg text-[var(--color-signal-500)] transition-transform hover:scale-125"
              title="Star"
            >
              <Star className="size-3.5" />
            </button>
            {onThread && (
              <button
                onClick={() => onThread(message)}
                className="relative grid size-7 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-transform hover:scale-125"
                title="Reply in a thread"
              >
                <MessageSquare className="size-3.5" />
                {threadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-[var(--color-brand-500)] text-[8px] font-bold text-white">
                    {threadCount}
                  </span>
                )}
              </button>
            )}
            {onSave && (
              <button
                onClick={() => onSave(message)}
                className="grid size-7 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-transform hover:scale-125"
                title="Save"
              >
                <Bookmark className="size-3.5" />
              </button>
            )}
            {onTranslate && (
              <button
                onClick={() => onTranslate(message)}
                className="grid size-7 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-transform hover:scale-125"
                title="Translate"
              >
                <Languages className="size-3.5" />
              </button>
            )}
            {onReport && (
              <button
                onClick={() => onReport(message)}
                className="grid size-7 place-items-center rounded-lg text-[var(--fc-fg-muted)] transition-transform hover:scale-125 hover:text-rose-500"
                title="Report"
              >
                <Flag className="size-3.5" />
              </button>
            )}
            {mine && (
              <button
                onClick={() => onDelete()}
                className="grid size-7 place-items-center rounded-lg text-rose-500 transition-transform hover:scale-125"
                title="Delete"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Tap to open reactions on touch */}
        <button
          onClick={() => setShowReactions((v) => !v)}
          className="absolute -right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full border border-[var(--fc-line)] bg-[var(--fc-surface)] text-[var(--fc-fg-subtle)] shadow-sm sm:hidden"
          aria-label="React to message"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

export function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="rounded-2xl rounded-bl-md border border-[var(--fc-line)] bg-[var(--fc-surface)] px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-[var(--fc-fg-subtle)]"
              style={{
                animation: `typing 1.2s ${i * 0.18}s infinite ease-in-out`,
              }}
            />
          ))}
        </div>
      </div>
      <span className="pb-1 text-[11px] text-[var(--fc-fg-subtle)]">
        {name} is typing…
      </span>
    </div>
  );
}

export function CallOutcomeIcon({ kind }: { kind: "missed" | "declined" | "completed" }) {
  if (kind === "completed") return <Phone className="size-3" />;
  return <PhoneOff className="size-3" />;
}

export function ChannelPill({ channel }: { channel: Thread["channel"] }) {
  const map: Record<
    Thread["channel"],
    { label: string; tone: BadgeTone }
  > = {
    whatsapp: { label: "WhatsApp", tone: "success" },
    sms: { label: "SMS", tone: "neutral" },
    email: { label: "Email", tone: "brand" },
    voip: { label: "VoIP", tone: "violet" },
  };
  const m = map[channel];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
