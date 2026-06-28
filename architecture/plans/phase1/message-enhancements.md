# Plan: Message Enhancements

Timestamps, edit/delete, image attachments, and optimistic sends. (Typing indicators moved to [Phase 3](../phase3/typing-indicators.md).)

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
- Migration: add `edited_at` nullable column
- Edit: update `body`, set `edited_at`
- RLS: UPDATE policy where `sender_id = auth.uid()`
- **Delete:** see [message-deletion.md](./message-deletion.md) — hard delete, no `deleted_at` placeholder

### 4. Image attachments
- Migration: extend `messages.type` to include `'image'`
- Add `attachment_url` column
- Supabase Storage bucket `chat-media`
- Upload flow: select image → upload → insert message with URL
- Render image bubble in chat

### 5. Optimistic sends
- On send: append pending message with temp ID
- On INSERT confirm (realtime or response): replace temp ID
- On error: show retry + remove pending

## Recommended order

1. Timestamps (quick win) — done
2. Optimistic sends (reliability UX) — done
3. Image attachments — **next**
4. Edit (optional v1.1)

**Related:** [emoji-support.md](./emoji-support.md) (picker, no schema), [message-deletion.md](./message-deletion.md) (hard delete, v1.1)

## Schema changes (edit + images)

```sql
alter table public.messages
  add column edited_at timestamptz,
  add column attachment_url text;

alter table public.messages
  drop constraint messages_type_check,
  add constraint messages_type_check
    check (type in ('text', 'image'));
```

## Acceptance criteria

Per sub-feature:
- [x] Timestamps visible and correct timezone
- Typing indicator — deferred to [Phase 3](../phase3/typing-indicators.md)
- [ ] User can edit only own messages within 15 min (optional rule)
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
| Edit | 0.5 day |
| Delete | See [message-deletion.md](./message-deletion.md) (~1 day) |
| Images | 2 days |