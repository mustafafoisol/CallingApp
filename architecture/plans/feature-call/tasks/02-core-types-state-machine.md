# Task 02 — Core Types and State Machine

**Milestone:** M2 · **Depends on:** 01 · **Est.:** 3h

## Goal

Pure call types and transition rules in `@calling-app/core` (no React, no WebRTC).

## Checklist

- [ ] `CallKind`: `'voice' | 'video'`
- [ ] `CallStatus`: `'ringing' | 'accepted' | 'ended' | 'missed' | 'rejected' | 'busy'`
- [ ] `CallRecord` interface matching DB row
- [ ] `CallRole`: `'caller' | 'callee'`
- [ ] `canTransition(from, to, role)` — valid status changes
- [ ] `isTerminal(status)` — ended, missed, rejected, busy
- [ ] Unit tests for all valid/invalid transitions

## State diagram

```mermaid
stateDiagram-v2
  [*] --> ringing: caller inserts
  ringing --> accepted: callee accepts
  ringing --> rejected: callee rejects
  ringing --> missed: timeout
  ringing --> busy: callee in another call
  accepted --> ended: either hangs up
  rejected --> [*]
  missed --> [*]
  busy --> [*]
  ended --> [*]
```

## Verify

```bash
pnpm --filter @calling-app/core test
```

- [ ] Invalid transitions return false (e.g. `ended → ringing`)
- [ ] Caller cannot accept; callee cannot insert

## Files

| File | Action |
|------|--------|
| `packages/core/src/types.ts` | Extend |
| `packages/core/src/call/state-machine.ts` | Create |
| `packages/core/src/call/state-machine.test.ts` | Create |
| `packages/core/src/index.ts` | Export |