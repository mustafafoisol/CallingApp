# Plan: Message Enhancements

Typing indicators, timestamps, edit/delete, and rich content.

## Phase

**Phase 1** — Medium effort.

## Features

### 1. Message timestamps
- Show relative time on hover or below each bubble
- Group messages by day with date separators

**Files:** `chat-view.tsx` only

### 2. Typing indicators
- Supabase Realtime **Broadcast** channel per conversation (not postgres_changes)
- Sender broadcasts `{ type: "typing", userId }` on input debounce
- Receiver shows "Alex is typing..." below message list
- Auto-clear after 3s idle

**New:** `apps/web/src/lib/chat/typing.ts`

### 3. Edit & delete own messages
- Migration: add `edited_at`, `deleted_at` nullable columns
- Soft delete: set `deleted_at`, render "Message deleted" placeholder
- Edit: update `body`, set `edited_at`
- RLS: UPDATE policy where `sender_id = auth.uid()`

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

1. Timestamps (quick win)
2. Optimistic sends (reliability UX)
3. Typing indicators
4. Edit/delete
5. Image attachments

## Schema changes (edit/delete + images)

```sql
alter table public.messages
  add column edited_at timestamptz,
  add column deleted_at timestamptz,
  add column attachment_url text;

alter table public.messages
  drop constraint messages_type_check,
  add constraint messages_type_check
    check (type in ('text', 'image'));
```

## Acceptance criteria

Per sub-feature:
- [ ] Timestamps visible and correct timezone
- [ ] Typing indicator appears/disappears reliably
- [ ] User can edit/delete only own messages within 15 min (optional rule)
- [ ] Images upload and display inline
- [ ] Optimistic send feels instant; errors recoverable

## Dependencies

- [message-pagination.md](./message-pagination.md) recommended before heavy history features

## Estimated effort

| Sub-feature | Effort |
|-------------|--------|
| Timestamps | 2h |
| Optimistic sends | 4h |
| Typing | 1 day |
| Edit/delete | 1 day |
| Images | 2 days |