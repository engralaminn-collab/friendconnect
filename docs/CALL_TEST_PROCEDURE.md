# FriendConnect — Real Phone Call Testing Procedure

This document describes how to verify that FriendConnect audio/video calls work between **two real devices on different networks** (not LAN/localhost).

## Prerequisites

1. FriendConnect deployed on a public server with HTTPS (Caddy)
2. TURN server configured (see `coturn/README.md`) — **REQUIRED** for cross-network calls
3. Two real devices (phones or laptops) on **different networks**
4. Two FriendConnect accounts (register or use seeded demo accounts)

## Test Setup

### Device A
- **Type**: Android phone (Chrome) OR laptop (any browser)
- **Network**: Mobile data (4G/5G) — NOT WiFi
- **Account**: `aria@friendconnect.app` / `password123`

### Device B
- **Type**: iPhone (Safari) OR laptop (different browser)
- **Network**: Home WiFi (different ISP than Device A)
- **Account**: `bilal@friendconnect.app` / `password123`

### Network Combinations to Test
1. WiFi → WiFi (different ISPs)
2. WiFi → Mobile Data
3. Mobile Data → WiFi
4. Mobile Data → Mobile Data (different carriers)
5. Different country (if possible)

## Test Procedure

### Step 1: Pre-flight Checks
On both devices, open the FriendConnect URL and verify:
- [ ] Login works
- [ ] Both users appear online to each other (green dot)
- [ ] They are friends (if not, send + accept a friend request)

### Step 2: Verify TURN is Configured
Open on Device A: `https://your-domain.com/api/webrtc/health`
- [ ] `signaling: ok`
- [ ] `stun: ok`
- [ ] `turn: ok` (if `unconfigured`, calls may fail on strict NATs — configure TURN first)

### Step 3: Audio Call Test (Device A → Device B)
1. On Device A: open the Chats tab → tap Bilal's chat → tap the phone icon
2. On Device B: should show an incoming call screen with "Aria Ahmed is calling"
3. On Device B: tap **Accept**
4. Verify on BOTH devices:
   - [ ] Call status shows "Connected"
   - [ ] Aria speaks → Bilal hears (and vice versa)
   - [ ] Mute button works (tap → other can't hear, tap again → can hear)
   - [ ] Speaker toggle works
   - [ ] Call timer is counting
5. On Device A: tap **End Call**
6. Verify on BOTH devices: call overlay closes
7. Check Call History: both should see the call in the Calls tab with correct duration

### Step 4: Video Call Test (Device B → Device A)
1. On Device B: open the Chats tab → tap Aria's chat → tap the video icon
2. On Device A: should show an incoming video call
3. On Device A: tap **Accept**
4. Verify on BOTH devices:
   - [ ] Local video preview shows (selfie camera)
   - [ ] Remote video shows (the other person)
   - [ ] Audio works both ways
   - [ ] Camera off button works (tap → video freezes, tap again → resumes)
   - [ ] Switch camera button works (front ↔ back on mobile)
   - [ ] Mute button works
5. On Device B: tap **End Call**

### Step 5: Rejection Test
1. Device A calls Device B
2. Device B taps **Reject**
3. Verify: Device A shows "Call declined" → overlay closes

### Step 6: Busy Test
1. Device A calls Device B (Device B accepts — call is active)
2. Device C (or a third session) calls Device B
3. Verify: Device C gets "busy" response immediately

### Step 7: Network Switch Test
1. Start a video call between Device A (WiFi) and Device B (WiFi)
2. On Device A: switch from WiFi to Mobile Data (turn off WiFi)
3. Verify:
   - [ ] Call shows "Reconnecting..." briefly
   - [ ] Call reconnects within 5-10 seconds (audio/video resumes)
   - [ ] If it doesn't reconnect → "Call failed" + ends gracefully

### Step 8: Diagnostics
On either device, open: `https://your-domain.com/api/webrtc/diagnostics` (must be logged in)
- [ ] `signaling.status: ok`
- [ ] `stun.configured: true`
- [ ] `turn.configured: true`
- [ ] Recent calls show correct `connectionType` (p2p/turn/stun)

## Common Issues

### "Call failed" immediately
- Check `/api/webrtc/health` — is TURN configured?
- Check browser console for ICE errors
- Verify firewall allows TURN ports (3478 UDP/TCP, 5349 TCP, 49152-65535 UDP)

### No audio/video
- Check browser permissions (camera/microphone)
- Verify HTTPS (browsers block camera/mic on non-secure origins)
- Check if the device has a camera/mic

### Call connects but no media
- ICE may have failed to find a usable path
- TURN is required for strict NATs
- Check `connectionType` in diagnostics — if `null`, ICE didn't complete

### Call freezes on network switch
- ICE restart may have failed
- The implementation attempts `restartIce()` once; if that fails, the call ends
- This is expected behavior — user should call back

## Acceptance Criteria

A cross-network call is **successful** only when:
- [ ] Device A (mobile data) calls Device B (WiFi, different ISP)
- [ ] Device B rings and can accept
- [ ] Real audio flows both ways (A speaks → B hears; B speaks → A hears)
- [ ] Real video flows both ways (A sees B; B sees A)
- [ ] Mute/camera-off/switch-camera all work
- [ ] Call ends cleanly from either side
- [ ] Call history records the call with correct duration

**Do NOT mark the call system as production-ready until this test passes on real devices across real networks.**
