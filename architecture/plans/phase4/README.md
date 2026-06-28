# Phase 4 — Voice & Video Calling

**Status:** Deferred  
**Goal:** Re-introduce 1-on-1 voice and video calls if product direction changes.

## Documents

| Doc | Purpose |
|-----|---------|
| [voice-video-calling.md](./voice-video-calling.md) | WebRTC architecture and rebuild plan |

## Depends on

- [Phase 3](../phase3/README.md) — notifications critical for incoming calls
- [Phase 1](../phase1/database-cleanup.md) — **do not drop `calls` table** if this phase is imminent; otherwise cleanup proceeds in Phase 1

## Exit criteria

See [voice-video-calling.md](./voice-video-calling.md) acceptance criteria.

## Note

Calling was intentionally removed to focus on chat. This phase is optional and should only start after explicit product approval.