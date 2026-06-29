# Task 04 — Signaling Layer

**Milestone:** M3 · **Depends on:** 01, 02 · **Est.:** 4h

## Goal

Client library to create calls, subscribe to events, and exchange SDP via Postgres.

## Checklist

- [x] `createCall({ conversationId, calleeId, kind })` → INSERT `calls` status `ringing`
- [x] `subscribeToCall(callId, handlers)` — Realtime on `calls` row + broadcast channel `call:{id}`
- [x] `acceptCall(callId)` — callee UPDATE `status=accepted`, `started_at=now()`
- [x] `rejectCall(callId)` — callee UPDATE `status=rejected`
- [x] `endCall(callId)` — UPDATE `status=ended`, `ended_at=now()`
- [x] `writeOfferSdp(callId, sdp)` / `writeAnswerSdp(callId, sdp)` — UPDATE columns
- [x] `waitForAnswerSdp(callId)` — poll or Realtime until `answer_sdp` set
- [x] Guard transitions with `canTransition` from core

## Realtime strategy

| Event | Transport |
|-------|-----------|
| Ring / accept / reject / end | `postgres_changes` on `calls` + optional broadcast |
| offer_sdp / answer_sdp | Postgres columns (too large for broadcast) |

Filter: `id=eq.{callId}` on `calls` table.

## Verify (two browsers, no WebRTC yet)

- [ ] Browser A inserts call → Browser B receives Realtime INSERT
- [ ] B accepts → A sees status `accepted`
- [ ] A writes fake `offer_sdp` → B reads it
- [ ] B writes `answer_sdp` → A reads it

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/call/signaling.ts` | Create |
| `apps/web/src/lib/call/signaling.test.ts` | Create (mock Supabase) |