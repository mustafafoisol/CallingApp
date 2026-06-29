# Task 10 — In-Call Controls

**Milestone:** M7 · **Depends on:** 08, 09 · **Est.:** 3h

## Goal

Mute and hang-up controls for both caller and callee during connected call.

## Checklist

- [ ] Mute toggle — disables local audio track (not remote)
- [ ] Hang up button — `CallSession.hangUp()` + `endCall`
- [ ] Visual mute state (icon + label)
- [ ] Keyboard: Escape hangs up (optional)
- [ ] Remote hang up detected via Realtime status `ended` → dismiss overlay

## Verify

- [ ] Mute on A → B no longer hears A; A still hears B
- [ ] Unmute restores audio
- [ ] Hang up on either side closes overlay on both within ~2s
- [ ] Timer stops on end

## Files

| File | Action |
|------|--------|
| `apps/web/src/components/call/call-controls.tsx` | Create |
| `apps/web/src/components/call/call-overlay.tsx` | Wire controls |