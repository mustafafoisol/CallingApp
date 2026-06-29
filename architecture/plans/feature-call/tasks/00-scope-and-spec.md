# Task 00 — Scope and Spec

**Milestone:** M0 · **Depends on:** — · **Est.:** 1h

## Goal

Lock v1 voice-call boundaries so later tasks do not scope-creep.

## Deliverables

- [ ] Confirm **voice-only** for v1 (video → M10 later)
- [ ] Confirm entry point: call button on chat header (`chat-header.tsx`)
- [ ] Confirm access: accepted friendship + conversation participant (reuse chat RLS pattern)
- [ ] Confirm signaling: Postgres `calls` + Realtime (not custom WebSocket server)
- [ ] Document non-goals: E2EE media, call recording, group calls, PSTN

## Acceptance criteria (v1)

| # | Criterion |
|---|-----------|
| 1 | Caller taps phone icon in chat → callee rings (in-app) |
| 2 | Callee accepts → both hear audio within ~5s |
| 3 | Either side hangs up → call ends, UI dismisses |
| 4 | Callee rejects → caller sees rejected state |
| 5 | No answer in 45s → missed |
| 6 | Works when callee on different network (TURN) |

## Out of scope (v1)

- Video / screen share
- Push notifications when app closed
- Call history UI in sidebar
- E2EE double-ratchet for media

## Verify

- [ ] Team agrees on table above (no open questions on voice vs video)
- [ ] TURN provider chosen (Metered.ca API key or coturn URL)

## Files

None (decision task). Reference: [../README.md](../README.md)