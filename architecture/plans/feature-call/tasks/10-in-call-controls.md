# Task 10 — In-Call Controls

**Milestone:** M7 · **Depends on:** 08, 09 · **Est.:** 3h

## Goal

Mute and hang-up controls for both caller and callee during connected call.

## Checklist

- [x] Mute toggle — disables local audio track (not remote)
- [x] Hang up button — `CallSession.hangUp()` + `endCall`
- [x] Visual mute state (icon + label)
- [x] Keyboard: Escape hangs up (optional)
- [x] Remote hang up detected via Realtime status `ended` → dismiss overlay

## Verify

- [x] Mute on A → B no longer hears A; A still hears B
- [x] Unmute restores audio
- [x] Hang up on either side closes overlay on both within ~2s
- [x] Timer stops on end

## Files

| File | Action |
|------|--------|
| `apps/web/src/components/call/call-controls.tsx` | Create |
| `apps/web/src/components/call/call-overlay.tsx` | Wire controls |