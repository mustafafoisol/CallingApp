# Task 06 — Call Session Orchestrator

**Milestone:** M4 · **Depends on:** 05 · **Est.:** 4h

## Goal

Single `CallSession` class that wires signaling + WebRTC for caller and callee roles.

## Checklist

- [x] `CallSession.startAsCaller(callId)` — create offer → write offer_sdp → wait answer → set remote
- [x] `CallSession.startAsCallee(callId, offerSdp)` — set remote → create answer → write answer_sdp
- [x] `CallSession.hangUp()` — endCall + closePeerConnection
- [x] `CallSession.mute()` / `unmute()` — disable audio track
- [x] Events: `onConnected`, `onEnded`, `onError`, `onStateChange`
- [x] Idempotent hang up (safe if already ended)

## Caller sequence

```
createCall → start local audio → createOffer → writeOfferSdp
→ waitForAnswerSdp → setRemoteDescription → onConnected
```

## Callee sequence

```
acceptCall → read offer_sdp → setRemoteDescription → createAnswer
→ writeAnswerSdp → onConnected
```

## Verify

- [x] Two browsers on **different networks** (hotspot test) — audio works
- [x] Hang up on either side ends session for both (via signaling)
- [x] Console shows `iceConnectionState: connected` or `completed`

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/call/call-session.ts` | Create |
| `apps/web/src/lib/call/call-session.test.ts` | Create (mock signaling + pc) |