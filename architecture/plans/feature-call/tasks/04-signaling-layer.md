# Task 04 — Signaling Layer

**Milestone:** M3 · **Depends on:** 01, 02 · **Est.:** 4h

## Goal

Client library to create calls, subscribe to events, and exchange SDP via Postgres.

## Checklist

- [ ] `createCall({ conversationId, calleeId, kind })` → INSERT `calls` status `ringing`
- [ ] `subscribeToCall(callId, handlers)` — Realtime on `calls` row + broadcast channel `call:{id}`
- [ ] `acceptCall(callId)` — callee UPDATE `status=accepted`, `started_at=now()`
- [ ] `rejectCall(callId)` — callee UPDATE `status=rejected`
- [ ] `endCall(callId)` — UPDATE `status=ended`, `ended_at=now()`
- [ ] `writeOfferSdp(callId, sdp)` / `writeAnswerSdp(callId, sdp)` — UPDATE columns
- [ ] `waitForAnswerSdp(callId)` — poll or Realtime until `answer_sdp` set
- [ ] Guard transitions with `canTransition` from core

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