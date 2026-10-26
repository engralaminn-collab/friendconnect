/**
 * Map normalized database rows into stable API DTOs. DTOs are the contract the
 * web client adapts to; database internals never leak past this layer.
 */
import type {
  MediaRow,
  MessageRow,
  ConversationRow,
  ConversationMemberRow,
} from "../db/schema";

export interface AttachmentDto {
  id: string;
  mediaId: string;
  caption: string | null;
  media: {
    id: string;
    mime: string;
    kind: string;
    filename: string;
    sizeBytes: string;
    width: number | null;
    height: number | null;
    durationSec: number | null;
    url: string;
  };
}

export interface ReactionDto {
  emoji: string;
  count: number;
  userIds: string[];
  mine: boolean;
}

export interface PollOptionDto {
  id: string;
  label: string;
  position: number;
  votes: number;
  mine: boolean;
}

export interface PollDto {
  id: string;
  question: string;
  options: PollOptionDto[];
  totalVotes: number;
  myOption: string | null;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string | null;
  kind: string;
  body: string;
  replyToId: string | null;
  forwarded: boolean;
  edited: boolean;
  deleted: boolean;
  systemKind: string | null;
  createdAt: string;
  attachments: AttachmentDto[];
  reactions: ReactionDto[];
  poll: PollDto | null;
  /** Current user's receipt state for this message (as recipient). */
  myReceipt: "delivered" | "read" | null;
}

export interface ConversationMemberDto {
  userId: string;
  displayName: string;
  handle: string | null;
  email: string;
  role: string;
  avatarMediaId: string | null;
  lastReadAt: string | null;
}

export interface ConversationDto {
  id: string;
  type: string;
  title: string | null;
  createdBy: string;
  lastMessageAt: string | null;
  disappearingSec: number;
  wallpaper: string | null;
  createdAt: string;
  updatedAt: string;
  members: ConversationMemberDto[];
  memberState: {
    archived: boolean;
    mutedUntil: string | null;
    pinned: boolean;
    lastReadAt: string | null;
  };
  unreadCount: number;
  lastMessage: MessageDto | null;
}

export function attachmentDto(
  attachmentId: string,
  mediaId: string,
  caption: string | null,
  media: MediaRow,
): AttachmentDto {
  return {
    id: attachmentId,
    mediaId,
    caption,
    media: {
      id: media.id,
      mime: media.mime,
      kind: media.kind,
      filename: media.filename,
      sizeBytes: media.sizeBytes.toString(),
      width: media.width,
      height: media.height,
      durationSec: media.durationSec,
      url: `/api/media/${media.id}`,
    },
  };
}

export function baseMessageDto(row: MessageRow): Omit<
  MessageDto,
  "attachments" | "reactions" | "poll" | "myReceipt"
> {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    kind: row.deletedAt ? "system" : row.kind,
    body: row.deletedAt ? "" : row.body,
    replyToId: row.replyToId,
    forwarded: row.forwarded,
    edited: Boolean(row.editedAt),
    deleted: Boolean(row.deletedAt),
    systemKind: row.systemKind,
    createdAt: row.createdAt.toISOString(),
  };
}

export function memberStateDto(member: ConversationMemberRow) {
  return {
    archived: Boolean(member.archivedAt),
    mutedUntil: member.mutedUntil ? member.mutedUntil.toISOString() : null,
    pinned: Boolean(member.pinnedAt),
    lastReadAt: member.lastReadAt ? member.lastReadAt.toISOString() : null,
  };
}

export function conversationSummaryDto(
  row: ConversationRow,
): Pick<ConversationDto, "id" | "type" | "title" | "createdBy" | "lastMessageAt" | "disappearingSec" | "wallpaper" | "createdAt" | "updatedAt"> {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    createdBy: row.createdBy,
    lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
    disappearingSec: row.disappearingSec,
    wallpaper: row.wallpaper,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
