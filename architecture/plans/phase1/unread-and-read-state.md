# Plan: Unread Counts & Read State

Track which messages have been read and surface unread badges on contacts.

## Phase

**Phase 1** — Medium effort.

## Problem

No indication of unread messages. Users must open each chat to check for new content.

## Scope

### In scope
- Per-user read cursor per conversation
- Unread count on home contact cards
- Mark conversation read when chat is opened
- Optional: "New messages" divider in chat view

### Out of scope
- Per-message read receipts (blue ticks)
- "Seen at" timestamps visible to sender

## Schema

```sql
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

create policy "reads_select_own"
  on public.conversation_reads for select to authenticated
  using (auth.uid() = user_id);

create policy "reads_upsert_own"
  on public.conversation_reads for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Unread count query

For each conversation, count messages where:
- `created_at > last_read_at` (or no read row → all messages from other user)
- `sender_id != current_user`

```sql
select count(*) from messages m
where m.conversation_id = $conv
  and m.sender_id != $me
  and m.created_at > coalesce(
    (select last_read_at from conversation_reads
     where conversation_id = $conv and user_id = $me),
    '1970-01-01'
  );
```

## Implementation

### Mark read

On `ChatView` mount:
```typescript
await supabase.from("conversation_reads").upsert({
  conversation_id: conversationId,
  user_id: currentUserId,
  last_read_at: new Date().toISOString(),
});
```

### Home page

Extend contact query with unread count (batch or subquery).

### Realtime

On new message INSERT while not in chat → increment local unread state on home (or refetch on navigate back).

### UI

- Badge on contact card: `{unreadCount}` if > 0
- Bold contact name when unread > 0

## Acceptance criteria

- [ ] Opening chat clears unread for that conversation
- [ ] Home shows correct unread counts
- [ ] Counts update when receiving messages in background tab
- [ ] RLS prevents reading/writing other users' read state

## Dependencies

- [message-pagination.md](./message-pagination.md) — helpful for accurate "first unread" divider

## Estimated effort

**1–2 days**