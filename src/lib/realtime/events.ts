"use client";

/** Shared realtime event names — must match src/server/realtime/publisher.ts. */
export const REALTIME_EVENTS = {
  messageNew: "message:new",
  messageUpdate: "message:update",
  messageDelete: "message:delete",
  messageReceipt: "message:receipt",
  reactionUpdate: "message:reaction",
  pollUpdate: "poll:update",
  typing: "typing",
  conversationUpdate: "conversation:update",
  conversationNew: "conversation:new",
  presence: "presence",
  notification: "notification:new",
  callIncoming: "call:incoming",
  callAccept: "call:accept",
  callReject: "call:reject",
  callSdp: "call:sdp",
  callIce: "call:ice",
  callState: "call:state",
  callHangup: "call:hangup",
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
