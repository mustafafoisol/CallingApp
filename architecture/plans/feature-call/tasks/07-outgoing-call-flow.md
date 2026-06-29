# Task 07 — Outgoing Call Flow

**Milestone:** M5 · **Depends on:** 06 · **Est.:** 3h

## Goal

Wire caller path from chat: initiate call, show ringing state, connect audio.

## Checklist

- [x] `useOutgoingCall()` hook or `startOutgoingCall(conversationId, friendId)`
- [x] Resolve `calleeId` from conversation participant
- [x] Block if friendship not `accepted` or already in a call
- [x] INSERT call `kind=voice`, `status=ringing`
- [x] Instantiate `CallSession` as caller after callee accepts (Realtime status watch)
- [x] Cleanup on unmount / navigation away

## Verify

- [x] From chat, programmatic start (temporary button OK) → DB row `ringing`
- [x] When callee accepts (manual SQL OK for now), caller session connects
- [x] Caller hears callee audio

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/call/outgoing.ts` | Create |
| `apps/web/src/contexts/call-context.tsx` | Create (`CallProvider` — shared session hook) |