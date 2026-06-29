# Task 05 — WebRTC Audio Session

**Milestone:** M4 · **Depends on:** 03, 04 · **Est.:** 5h

## Goal

Low-level WebRTC wrapper: mic capture, peer connection, audio playback.

## Checklist

- [ ] `fetchIceServers()` — calls `/api/turn`
- [ ] `createPeerConnection(iceServers)` with `bundlePolicy: max-bundle`
- [ ] `attachLocalAudio(stream)` — `getUserMedia({ audio: true, video: false })`
- [ ] `playRemoteAudio(pc)` — `ontrack` → `<audio autoplay>`
- [ ] `createOffer()` / `createAnswer(remoteOffer)` — **full SDP** (no trickle ICE v1)
- [ ] `setRemoteDescription(sdp)`
- [ ] `closePeerConnection()` — stop tracks, close pc
- [ ] Handle `getUserMedia` permission denied with typed error

## Design notes

- v1: gather all ICE candidates before emitting SDP (simpler signaling)
- No video transceivers in v1
- Log ICE connection state changes to console in dev

## Verify

- [ ] Same-machine: two tabs, manual SDP paste — audio flows (smoke test)
- [ ] Permission denied shows clear error string
- [ ] `closePeerConnection` releases mic (browser indicator off)

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/call/peer-connection.ts` | Create |
| `apps/web/src/lib/call/media.ts` | Create |
| `apps/web/src/lib/call/peer-connection.test.ts` | Create (mock RTCPeerConnection where possible) |