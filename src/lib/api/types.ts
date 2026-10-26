/** Client mirrors of the server DTOs produced by src/server/services/serializers. */

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  handle: string | null;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  profile?: {
    userId: string;
    bio: string | null;
    avatarMediaId: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
    headline: string | null;
  } | null;
}

export interface AttachmentMedia {
  id: string;
  mime: string;
  kind: string;
  filename: string;
  sizeBytes: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  url: string;
}

export interface AttachmentDto {
  id: string;
  mediaId: string;
  caption: string | null;
  media: AttachmentMedia;
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
  myReceipt: "delivered" | "read" | null;
  receiptSummary: { deliveredTo: string[]; readBy: string[] };
  metadata: {
    location?: { lat: number; lng: number; address?: string };
    contactCard?: { name: string; phone: string; company?: string };
  } | null;
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

export interface ContactDto {
  id: string;
  ownerId: string;
  contactUserId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  starred: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDto {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string | null;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface CallParticipantDto {
  id: string;
  callId: string;
  userId: string;
  state: string;
  joinedAt: string | null;
  leftAt: string | null;
  muted: boolean;
  cameraOn: boolean;
  sharing: boolean;
}

export interface CallDto {
  call: {
    id: string;
    conversationId: string | null;
    createdBy: string;
    kind: "audio" | "video";
    state: string;
    startedAt: string;
    answeredAt: string | null;
    endedAt: string | null;
    durationSec: number;
    recording: boolean;
    endReason: string | null;
  };
  participants: CallParticipantDto[];
}

export interface SavedMessageRowDto {
  id: string;
  userId: string;
  messageId: string | null;
  conversationId: string | null;
  threadName: string | null;
  author: string | null;
  body: string | null;
  note: string | null;
  tag: string;
  createdAt: string;
}

export interface IceConfig {
  iceServers: RTCIceServer[];
  sfu: { url: string; configured: boolean } | null;
}
