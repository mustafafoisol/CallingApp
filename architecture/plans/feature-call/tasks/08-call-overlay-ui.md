# Task 08 — Call Overlay UI

**Milestone:** M5 · **Depends on:** 07 · **Est.:** 4h

## Goal

Full-screen (or modal) call UI for active and outgoing calls.

## Checklist

- [x] `CallOverlay` component — states: `outgoing`, `connected`, `ended`
- [x] Show friend name + avatar (reuse `ChatAvatar`)
- [x] Elapsed timer when connected
- [x] Phone icon button in `ChatHeader` → starts outgoing call
- [x] Disable call button when `!canMessage` or mic unavailable
- [x] Match existing chat design tokens (`--chat-surface`, coral accent)
- [x] `aria-live` region for status ("Ringing…", "Connected")

## States UI

| State | Caller sees | Callee sees (task 09 adds incoming) |
|-------|-------------|-------------------------------------|
| ringing | "Calling {name}…" + cancel | — |
| accepted | "Connected" + timer | — |
| ended | Brief "Call ended" → dismiss | — |

## Verify

- [x] Tap phone in chat → overlay appears
- [x] Cancel while ringing → call `ended` or `rejected`, overlay closes
- [x] Connected state shows timer incrementing

## Files

| File | Action |
|------|--------|
| `apps/web/src/components/call/call-overlay.tsx` | Create |
| `apps/web/src/components/chat/chat-header.tsx` | Add call button |