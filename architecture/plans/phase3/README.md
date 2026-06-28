# Phase 3 — Platform & Reach

**Status:** Planned  
**Goal:** Make CallingApp installable and alert users when they're not in the app.

## Documents

| Doc | Purpose |
|-----|---------|
| [pwa.md](./pwa.md) | Service worker, installability |
| [notifications.md](./notifications.md) | Web push for messages and friend requests |

## Execution order

1. [pwa.md](./pwa.md) — service worker foundation
2. [notifications.md](./notifications.md) — push subscriptions + send pipeline

## Depends on

[Phase 2](../phase2/README.md) recommended (avatars improve notification richness).

## Exit criteria

- [ ] App passes Lighthouse installability checks
- [ ] User can add to home screen
- [ ] Push notifications for new messages (when not in that chat)
- [ ] Push notifications for friend requests
- [ ] User can disable notifications in settings

## Next phase

[Phase 4 — Voice & Video](../phase4/README.md) (deferred)