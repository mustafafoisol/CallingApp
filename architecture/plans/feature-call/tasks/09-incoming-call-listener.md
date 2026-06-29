# Task 09 — Incoming Call Listener

**Milestone:** M6 · **Depends on:** 04, 08 · **Est.:** 4h

## Goal

Global listener: any page shows incoming ring UI when callee receives a call.

## Checklist

- [x] `IncomingCallListener` in `(app)` layout (alongside `SessionGuard`)
- [x] Subscribe to `calls` INSERT where `callee_id = me` and `status=ringing`
- [x] `IncomingCallBanner` — Accept / Decline buttons
- [x] Accept → `CallSession.startAsCallee` + show `CallOverlay`
- [x] Decline → `rejectCall`
- [x] Only one incoming UI at a time
- [x] Ignore calls from self / stale rows

## Realtime filter

```
table: calls
event: INSERT
filter: callee_id=eq.{currentUserId}
```

Post-handler: verify `status === 'ringing'`.

## Verify

- [x] Callee on `/home` → caller rings from chat → banner appears
- [x] Accept → both hear audio, overlay on callee
- [x] Decline → caller sees rejected (task 11 polishes message)

## Files

| File | Action |
|------|--------|
| `apps/web/src/components/call/incoming-call-listener.tsx` | Create |
| `apps/web/src/components/call/incoming-call-banner.tsx` | Create |
| `apps/web/src/app/(app)/layout.tsx` | Mount listener |