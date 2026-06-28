# Phase 1 — End-to-End Chat

**Status:** Active  
**Goal:** Ship a polished 1-on-1 chat experience from contacts list through real-time text and image messaging.

## Documents

| Doc | Purpose |
|-----|---------|
| [end-to-end-chat.md](./end-to-end-chat.md) | **Start here** — umbrella spec and refinement doc |
| [database-cleanup.md](./database-cleanup.md) | Remove legacy `calls` schema |
| [message-pagination.md](./message-pagination.md) | Load older message history |
| [message-enhancements.md](./message-enhancements.md) | Timestamps, typing, optimistic sends, images |
| [unread-and-read-state.md](./unread-and-read-state.md) | Unread badges and read cursors |

## Execution order

```mermaid
flowchart TD
  A[database-cleanup] --> B[message-pagination]
  B --> C[timestamps + day separators]
  C --> D[optimistic sends]
  D --> E[typing indicators]
  E --> F[image attachments]
  F --> G[unread counts + home preview]
  G --> H["edit/delete (optional v1.1)"]
```

1. [database-cleanup.md](./database-cleanup.md)
2. [message-pagination.md](./message-pagination.md)
3. [message-enhancements.md](./message-enhancements.md) — timestamps → optimistic → typing → images → edit/delete (stretch)
4. [unread-and-read-state.md](./unread-and-read-state.md)

## Depends on

Phase 0 (shipped): auth, friends, basic realtime chat — see [../../features/](../../features/).

## Exit criteria

Phase 1 is complete when:

- [ ] User can scroll/load full message history
- [ ] Chat UI is polished (bubbles, timestamps, day groups, compose bar)
- [ ] Text sends feel instant (optimistic) with error recovery
- [ ] Typing indicator works between two users
- [ ] Image attachments send and display inline
- [ ] Home contacts show unread count and last message preview
- [ ] Opening a chat clears unread state
- [ ] Legacy `calls` table removed from database

## Next phase

[Phase 2 — Social & Identity](../phase2/README.md)