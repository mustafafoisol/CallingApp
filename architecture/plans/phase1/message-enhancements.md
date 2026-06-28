# Plan: Message Enhancements

Timestamps, image attachments, and optimistic sends for Phase 1. (Typing indicators → [Phase 3](../phase3/typing-indicators.md). Edit → [Phase 3 message-edit](../phase3/message-edit.md). Forward → [Phase 3 message-forward](../phase3/message-forward.md).)

## Phase

**Phase 1** — Medium effort.

## Features

### 1. Message timestamps
- Show relative time on hover or below each bubble
- Group messages by day with date separators

**Files:** `chat-view.tsx` only

### 2. Typing indicators

**Deferred to Phase 3** — see [typing-indicators.md](../phase3/typing-indicators.md).

### 3. Edit own messages

**Deferred to Phase 3** — see [message-edit.md](../phase3/message-edit.md).

### 4. Forward message

**Deferred to Phase 3** — see [message-forward.md](../phase3/message-forward.md).

### 5. Image attachments
- Migration: extend `messages.type` to include `'image'`
- Add `attachment_url` column
- Supabase Storage bucket `chat-media`
- Upload flow: select image → upload → insert message with URL
- Render image bubble in chat

### 6. Optimistic sends
- On send: append pending message with temp ID
- On INSERT confirm (realtime or response): replace temp ID
- On error: show retry + remove pending

**Delete:** see [message-deletion.md](./message-deletion.md) — soft remove ("Message removed") + per-user hide, Phase 1 v1.1 stretch.

## Recommended order

1. Timestamps (quick win) — done
2. Optimistic sends (reliability UX) — done
3. Image attachments — **next**
4. Message remove / hide — [message-deletion.md](./message-deletion.md) (v1.1 stretch)

## Schema changes (images only — Phase 1)

```sql
alter table public.messages
  add column attachment_url text;

alter table public.messages
  drop constraint messages_type_check,
  add constraint messages_type_check
    check (type in ('text', 'image'));
```

`edited_at` and UPDATE policy → [message-edit.md](../phase3/message-edit.md).

## Acceptance criteria

Per sub-feature:
- [x] Timestamps visible and correct timezone
- Typing indicator — deferred to [Phase 3](../phase3/typing-indicators.md)
- Edit — deferred to [message-edit.md](../phase3/message-edit.md)
- Forward — deferred to [message-forward.md](../phase3/message-forward.md)
- [ ] Delete: see [message-deletion.md](./message-deletion.md) acceptance criteria
- [ ] Images upload and display inline
- [x] Optimistic send feels instant; errors recoverable

## Dependencies

- [message-pagination.md](./message-pagination.md) recommended before heavy history features

## Estimated effort

| Sub-feature | Effort |
|-------------|--------|
| Timestamps | 2h |
| Optimistic sends | 4h |
| Typing | See [Phase 3](../phase3/typing-indicators.md) |
| Edit | See [Phase 3 message-edit](../phase3/message-edit.md) |
| Forward | See [Phase 3 message-forward](../phase3/message-forward.md) |
| Delete | See [message-deletion.md](./message-deletion.md) (~1 day) |
| Images | 2 days |