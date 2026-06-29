# Task 11 — Edge Cases and Hardening

**Milestone:** M8 · **Depends on:** 10 · **Est.:** 4h

## Goal

Production-safe behavior for failure and concurrency paths.

## Checklist

- [ ] **Ring timeout:** 45s no answer → callee `missed`, caller UI "No answer"
- [ ] **Reject:** callee decline → caller "Declined"
- [ ] **Busy:** callee already in call → new INSERT gets `busy` or reject second ring
- [ ] **Caller cancel** while ringing → `ended` or `rejected`, callee banner dismisses
- [ ] **Session replaced** mid-call → hang up + close overlay (`SessionGuard` integration)
- [ ] **Tab close** — `beforeunload` attempts `endCall` (best effort)
- [ ] **Mic lost** — show warning if track ends
- [ ] **Realtime disconnect** during call — banner + auto end after grace period
- [ ] Prevent double-accept race (idempotent updates)

## Verify (manual matrix)

| Scenario | Expected |
|----------|----------|
| Callee ignores 45s | Caller: missed; DB `missed` |
| Callee rejects | Caller: declined |
| Second call while in call | Second: busy or auto-reject |
| Caller cancels while ringing | Callee banner gone |
| Login on second device mid-call | First device ends call |

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/call/timeouts.ts` | Create |
| `apps/web/src/lib/call/incoming-call-listener.tsx` | Harden |
| `apps/web/src/components/session/session-guard.tsx` | End active call on kick |