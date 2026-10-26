import { describe, it, expect } from "vitest";
import { messageToLegacy, conversationToThread } from "@/lib/api/message-mapper";
import type { ConversationDto, MessageDto } from "@/lib/api/types";

const USER = "11111111-1111-1111-1111-111111111111";
const PEER = "22222222-2222-2222-2222-222222222222";

function baseMessage(overrides: Partial<MessageDto> = {}): MessageDto {
  return {
    id: "m1",
    conversationId: "c1",
    senderId: USER,
    kind: "text",
    body: "hello",
    replyToId: null,
    forwarded: false,
    edited: false,
    deleted: false,
    systemKind: null,
    createdAt: "2026-10-26T10:00:00.000Z",
    metadata: null,
    attachments: [],
    reactions: [{ emoji: "👍", count: 2, userIds: [USER, PEER], mine: true }],
    poll: null,
    myReceipt: null,
    receiptSummary: { deliveredTo: [PEER], readBy: [] },
    ...overrides,
  };
}

describe("08 · DTO → legacy message/thread mapping", () => {
  it("marks own messages with from=me and recipient messages with from=them", () => {
    const mine = messageToLegacy(baseMessage(), USER);
    expect(mine.from).toBe("me");
    const theirs = messageToLegacy(baseMessage({ senderId: PEER }), USER);
    expect(theirs.from).toBe("them");
  });

  it("derives sent/delivered/read ticks from the receipt summary", () => {
    const sent = messageToLegacy(baseMessage(), USER);
    expect(sent.status).toBe("delivered");
    const read = messageToLegacy(
      baseMessage({ receiptSummary: { deliveredTo: [PEER], readBy: [PEER] } }),
      USER,
    );
    expect(read.status).toBe("read");
    const none = messageToLegacy(
      baseMessage({ receiptSummary: { deliveredTo: [], readBy: [] } }),
      USER,
    );
    expect(none.status).toBe("sent");
  });

  it("maps location and contact metadata into the legacy media attachment shape", () => {
    const loc = messageToLegacy(
      baseMessage({
        kind: "location",
        metadata: { location: { lat: 23.81, lng: 90.41, address: "Dhaka" } },
      }),
      USER,
    );
    expect(loc.media?.kind).toBe("location");
    expect(loc.media?.lat).toBe(23.81);
    const card = messageToLegacy(
      baseMessage({
        kind: "contact",
        metadata: { contactCard: { name: "Bob", phone: "+8801700000000" } },
      }),
      USER,
    );
    expect(card.media?.kind).toBe("contact");
    expect(card.media?.contactCard?.phone).toBe("+8801700000000");
  });

  it("maps deleted-message DTOs (body already redacted server-side) to system placeholders", () => {
    const deleted = messageToLegacy(
      baseMessage({ deleted: true, body: "", kind: "system", systemKind: "changed" }),
      USER,
    );
    expect(deleted.deleted).toBe(true);
    expect(deleted.body).toBe("");
    expect(deleted.kind).toBe("system");
  });

  it("maps a conversation DTO into a thread with the peer identity", () => {
    const dto: ConversationDto = {
      id: "c1",
      type: "direct",
      title: null,
      createdBy: USER,
      lastMessageAt: "2026-10-26T10:00:00.000Z",
      disappearingSec: 0,
      wallpaper: null,
      createdAt: "2026-10-26T09:00:00.000Z",
      updatedAt: "2026-10-26T10:00:00.000Z",
      members: [
        { userId: USER, displayName: "Me", handle: "me", email: "me@example.com", role: "owner", avatarMediaId: null, lastReadAt: null },
        { userId: PEER, displayName: "Bob", handle: "bob", email: "bob@example.com", role: "member", avatarMediaId: null, lastReadAt: null },
      ],
      memberState: { archived: false, mutedUntil: null, pinned: true, lastReadAt: null },
      unreadCount: 2,
      lastMessage: null,
    };
    const thread = conversationToThread(dto, USER, new Set(), new Map());
    expect(thread.contactId).toBe(PEER);
    expect(thread.contactName).toBe("Bob");
    expect(thread.pinned).toBe(true);
    expect(thread.unread).toBe(2);
    expect(thread.type).toBe("direct");
  });
});
