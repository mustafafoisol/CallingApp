# Task 07 — Outgoing Call Flow

**Milestone:** M5 · **Depends on:** 06 · **Est.:** 3h

## Goal

Wire caller path from chat: initiate call, show ringing state, connect audio.

## Checklist

- [ ] `useOutgoingCall()` hook or `startOutgoingCall(conversationId, friendId)`
- [ ] Resolve `calleeId` from conversation participant
- [ ] Block if friendship not `accepted` or already in a call
- [ ] INSERT call `kind=voice`, `status=ringing`
- [ ] Instantiate `CallSession` as caller after callee accepts (Realtime status watch)
- [ ] Cleanup on unmount / navigation away

## Verify

- [ ] From chat, programmatic start (temporary button OK) → DB row `ringing`
- [ ] When callee accepts (manual SQL OK for now), caller session connects
- [ ] Caller hears callee audio

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/call/outgoing.ts` | Create |
| `apps/web/src/lib/call/use-call-session.ts` | Create (optional shared hook) |