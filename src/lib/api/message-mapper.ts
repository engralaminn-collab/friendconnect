"use client";

import type { ConversationDto, MessageDto } from "./types";
import type { MediaAttachment, Message, Thread } from "@/lib/types";

function hueFromString(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

function attachmentToMedia(dto: MessageDto["attachments"][number]): MediaAttachment {
  const m = dto.media;
  const base = {
    kind: (m.kind === "voice" ? "voice" : m.kind) as MediaAttachment["kind"],
    name: m.filename,
    sizeLabel: `${Math.max(1, Math.round(Number(m.sizeBytes) / 1024))} KB`,
    mime: m.mime,
    durationSec: m.durationSec ?? undefined,
    width: m.width ?? undefined,
    height: m.height ?? undefined,
    caption: dto.caption ?? undefined,
  };
  return {
    ...base,
    // Real private URL; the browser fetches with the session cookie.
    seed: m.url,
  } as MediaAttachment;
}

function metadataToMedia(dto: MessageDto): MediaAttachment | undefined {
  const loc = dto.metadata?.location;
  if (loc) {
    return {
      kind: "location",
      name: loc.address ?? `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`,
      sizeLabel: `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
      mime: "text/location",
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address,
    } as MediaAttachment;
  }
  const card = dto.metadata?.contactCard;
  if (card) {
    return {
      kind: "contact",
      name: card.name,
      sizeLabel: "vCard",
      mime: "text/vcard",
      contactCard: { name: card.name, phone: card.phone, company: card.company },
    } as MediaAttachment;
  }
  return undefined;
}

function pollToMedia(dto: MessageDto): MediaAttachment | undefined {
  if (!dto.poll) return undefined;
  const media = {
    kind: "poll" as const,
    name: dto.poll.question,
    sizeLabel: `${dto.poll.totalVotes} votes`,
    mime: "application/x-poll",
    poll: {
      question: dto.poll.question,
      totalVotes: dto.poll.totalVotes,
      myOption: dto.poll.options.findIndex((o) => o.mine),
      options: dto.poll.options.map((o) => ({ label: o.label, votes: o.votes })),
    },
    // Server option ids, retained for submitting votes.
    optionIds: dto.poll.options.map((o) => o.id),
  };
  return media as unknown as MediaAttachment;
}

export function messageToLegacy(dto: MessageDto, currentUserId: string): Message {
  const mine = dto.senderId === currentUserId;
  const attachment = dto.attachments[0] ? attachmentToMedia(dto.attachments[0]) : undefined;
  const poll = pollToMedia(dto);
  const structured = metadataToMedia(dto);
  const status: Message["status"] = mine
    ? dto.receiptSummary.readBy.length > 0
      ? "read"
      : dto.receiptSummary.deliveredTo.length > 0
        ? "delivered"
        : "sent"
    : undefined;
  return {
    id: dto.id,
    from: mine ? "me" : "them",
    body: dto.body,
    at: dto.createdAt,
    status,
    kind: dto.deleted ? "system" : (dto.kind as Message["kind"]),
    media: attachment ?? poll ?? structured,
    replyTo: dto.replyToId ?? undefined,
    reactions: dto.reactions.map((r) => ({ emoji: r.emoji, count: r.count, mine: r.mine })),
    edited: dto.edited,
    forwarded: dto.forwarded,
    deleted: dto.deleted,
    systemKind: dto.systemKind as Message["systemKind"],
  };
}

export function conversationToThread(
  dto: ConversationDto,
  currentUserId: string,
  online: Set<string>,
  typingMap: Map<string, Set<string>>,
): Thread {
  const peer = dto.members.find((m) => m.userId !== currentUserId);
  const messages = (dto.lastMessage ? [dto.lastMessage] : []).map((m) =>
    messageToLegacy(m, currentUserId),
  );
  const mutedUntil = dto.memberState.mutedUntil ? new Date(dto.memberState.mutedUntil) : null;
  return {
    id: dto.id,
    channel: "voip",
    type: dto.type === "group" ? "group" : "direct",
    contactName: dto.title ?? peer?.displayName ?? "Conversation",
    contactId: peer?.userId,
    // Full messages are hydrated separately; lastMessage keeps the list preview alive.
    messages,
    unread: dto.unreadCount,
    updatedAt: dto.lastMessageAt ?? dto.updatedAt,
    status: "open",
    avatarHue: hueFromString(dto.id),
    about: peer?.email,
    email: peer?.email,
    pinned: dto.memberState.pinned,
    archived: dto.memberState.archived,
    muted: Boolean(mutedUntil && mutedUntil.getTime() > Date.now()),
    isOnline: peer ? online.has(peer.userId) : false,
    typing: typingMap.has(dto.id),
    wallpaper: dto.wallpaper ?? undefined,
    verified: true,
  };
}
