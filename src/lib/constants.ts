// WebRTC ICE configuration. Direct P2P first, STUN discovery, TURN fallback.
// Supports multiple STUN/TURN servers (comma-separated in env).
export const STUN_SERVERS = (process.env.STUN_SERVERS || process.env.STUN_SERVER || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
  .split(',').map(s => s.trim()).filter(Boolean)
export const TURN_SERVERS = (process.env.TURN_SERVERS || process.env.TURN_SERVER || '')
  .split(',').map(s => s.trim()).filter(Boolean)
export const TURN_USERNAME = process.env.TURN_USERNAME || ''
export const TURN_PASSWORD = process.env.TURN_PASSWORD || ''
export const TURN_SECRET = process.env.TURN_SECRET || '' // for time-limited credentials
export const TURN_REALM = process.env.TURN_REALM || 'friendconnect'

// ICE servers for RTCPeerConnection configuration.
// If TURN_SECRET is set, generates time-limited credentials (more secure).
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = STUN_SERVERS.map(urls => ({ urls }))
  if (TURN_SERVERS.length > 0 && (TURN_USERNAME || TURN_SECRET)) {
    const { username, credential } = turnCredentials()
    for (const urls of TURN_SERVERS) {
      servers.push({ urls, username, credential })
    }
  }
  return servers
}

// Generate TURN credentials. If TURN_SECRET is set, uses time-limited HMAC credentials.
// Otherwise uses static TURN_USERNAME/TURN_PASSWORD.
export function turnCredentials(): { username: string; credential: string } {
  if (TURN_SECRET) {
    // Time-limited credentials per RFC 5389 + Coturn REST API
    // username = "timestamp:userId", credential = HMAC-SHA1(secret, username)
     
    const { createHmac } = (eval('require')('crypto'))
    const expires = Math.floor(Date.now() / 1000) + 3600 // 1 hour
    const username = `${expires}:friendconnect`
    const credential = createHmac('sha1', TURN_SECRET).update(username).digest('base64')
    return { username, credential }
  }
  return { username: TURN_USERNAME, credential: TURN_PASSWORD }
}

export function isTurnConfigured(): boolean {
  return TURN_SERVERS.length > 0 && !!(TURN_USERNAME || TURN_SECRET)
}

// Client-safe ICE config (no secrets exposed — uses the credential endpoint)
export function clientIceConfig() {
  return {
    stunServers: STUN_SERVERS,
    turnConfigured: isTurnConfigured(),
    // Don't send TURN credentials in this response — fetched separately via /api/webrtc/config
  }
}

// Realtime event names shared between client and the socket.io mini-service
export const RT = {
  // client -> server
  AUTH: 'auth',
  MESSAGE_SEND: 'message:send',
  MESSAGE_SEEN: 'message:seen',
  TYPING: 'typing',
  // Call signaling (hardened round 13)
  CALL_INVITE: 'call:invite',       // caller → server: initiate a call
  CALL_RINGING: 'call:ringing',     // receiver → server: phone is ringing
  CALL_ACCEPTED: 'call:accepted',   // receiver → server: accepted the call
  CALL_REJECTED: 'call:rejected',   // receiver → server: rejected the call
  CALL_BUSY: 'call:busy',           // receiver → server: already in a call
  CALL_OFFER: 'call:offer',         // caller → server: SDP offer
  CALL_ANSWER: 'call:answer',       // receiver → server: SDP answer
  CALL_ICE: 'call:ice',             // both → server: ICE candidate
  CALL_CONNECTED: 'call:connected', // caller/receiver → server: ICE connected
  CALL_RECONNECTING: 'call:reconnecting', // either → server: ICE reconnecting
  CALL_RECONNECTED: 'call:reconnected',   // either → server: ICE reconnected
  CALL_FAILED: 'call:failed',       // either → server: ICE failed
  CALL_ENDED: 'call:ended',         // either → server: call ended normally
  CALL_CANCELLED: 'call:cancelled', // caller → server: cancelled before answer
  CALL_TIMEOUT: 'call:timeout',     // server → both: no answer in 30s
  // Legacy events (preserved for backward compat — still used by existing CallOverlay)
  CALL_END: 'call:end',
  CALL_REJECT: 'call:reject',
  // Group + other
  GROUP_MESSAGE_SEND: 'group:message:send',
  REACTION_ADD: 'reaction:add',
  REACTION_REMOVE: 'reaction:remove',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_FORWARD: 'message:forward',
  MESSAGE_EDIT: 'message:edit',
  GROUP_TYPING: 'group:typing',
  // server -> client
  MESSAGE_NEW: 'message:new',
  MESSAGE_STATUS: 'message:status',
  MESSAGE_DELETED: 'message:deleted',
  MESSAGE_EDITED: 'message:edited',
  GROUP_TYPING_INDICATOR: 'group:typing:indicator',
  TYPING_INDICATOR: 'typing:indicator',
  PRESENCE: 'presence',
  NOTIFICATION: 'notification',
  // Call events (server → client)
  CALL_INCOMING: 'call:incoming',         // server → receiver: incoming call
  CALL_SDP: 'call:sdp',                   // server → peer: SDP answer
  CALL_ICE_CANDIDATE: 'call:ice-candidate', // server → peer: ICE candidate
  CALL_ENDED_EVENT: 'call:ended',         // server → peer: call ended (legacy + new)
  CALL_UNAVAILABLE: 'call:unavailable',    // server → caller: receiver offline/busy
  CALL_ERROR: 'call:error',                // server → client: signaling error
  GROUP_MESSAGE_NEW: 'group:message:new',
  REACTION_UPDATE: 'reaction:update',
  AUTH_OK: 'auth:ok',
  AUTH_ERROR: 'auth:error',
} as const

export const REALTIME_PORT = 3003
