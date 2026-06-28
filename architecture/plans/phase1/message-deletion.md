# Plan: Message Deletion (Soft Remove + Per-User Hide)

Allow any chat participant to remove messages with **two behaviors**:

1. **Own message** — soft-delete for **both** users: body replaced with **"Message removed"** (message row kept).
2. **Someone else's message** — **hide for viewer only**: disappears from the deleter's thread; the other participant still sees the original.

**Not hard delete** — rows stay in `messages`; no `DELETE` from UI for v1.

## Phase

**Phase 1 v1.1** — Medium effort. Recommended after image attachments.

## Problem

Users cannot remove messages they regret sending, or hide messages they don't want to see locally. Current gaps:

- No `removed_at` / soft-remove on `messages`
- No per-user hide store
- No UPDATE RLS on `messages`
- Realtime subscribes to **INSERT only** in `chat-view.tsx`
- Delete action not exposed in message UI

## Scope

### In scope

| Action | Who can trigger | DB effect | What each user sees |
|--------|-----------------|-----------|---------------------|
| Remove **own** message | Message `sender_id` | `UPDATE messages` set `removed_at`, redact `body` | **Both** see muted bubble: **"Message removed"** |
| Hide **other's** message | Any participant | `INSERT message_hides` | **Deleter only:** message gone. **Other user:** unchanged |

- Delete control on **any** message in the thread (context menu / long-press)
- Optional confirmation before remove/hide
- Realtime **UPDATE** for global remove (both users)
- Optimistic UI for both paths
- Fetch `message_hides` for current user when loading chat

### Out of scope

- Hard `DELETE` of message rows
- Admin/moderation remove for all users
- Bulk delete / "clear conversation"
- Undo / trash retention window
- Storage cleanup for removed image attachments (v1)
- Message edit — [message-edit.md](../phase3/message-edit.md)

## Schema changes

**New migration:** `supabase/migrations/YYYYMMDDHHMMSS_message_soft_remove.sql`

### 1. Global soft remove (own messages)

```sql
alter table public.messages
  add column removed_at timestamptz;

comment on column public.messages.removed_at is
  'Set when sender removes message for both participants; UI shows Message removed';
```

When removing own message:

```sql
update public.messages
set removed_at = now(), body = ''
where id = $1 and sender_id = auth.uid();
```

UI always renders display text **"Message removed"** when `removed_at` is set (do not show stored `body`).

### 2. Per-user hide (other people's messages)

```sql
create table public.message_hides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

alter table public.message_hides enable row level security;

create policy "message_hides_select_own"
  on public.message_hides for select to authenticated
  using (user_id = auth.uid());

create policy "message_hides_insert_own"
  on public.message_hides for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id
        and m.sender_id <> auth.uid()
        and m.removed_at is null
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  );
```

### 3. RLS — UPDATE own messages (global remove)

```sql
create policy "messages_update_remove_own"
  on public.messages for update to authenticated
  using (
    auth.uid() = sender_id
    and removed_at is null
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  )
  with check (auth.uid() = sender_id);
```

### 4. Realtime UPDATE payloads

```sql
alter table public.messages replica identity full;
```

Required so `postgres_changes` UPDATE events include `conversation_id` for filtering.

**No** DELETE policy. **No** delete trigger on `messages` — row persists; `last_message_at` unchanged on remove (message still exists in thread).

## Implementation steps

### 1. Apply migration

Document in [data-model-and-security.md](../../features/data-model-and-security.md): `removed_at`, `message_hides`, UPDATE policy.

### 2. Chat helpers

**New files:**

- `apps/web/src/lib/chat/remove-message.ts` — global remove (own): UPDATE `removed_at` + clear `body`
- `apps/web/src/lib/chat/hide-message.ts` — per-user hide: INSERT `message_hides`
- `apps/web/src/lib/chat/message-hides.ts` — load hide set for conversation + current user

### 3. Server load — include hides

**File:** `apps/web/src/app/(app)/chat/[id]/page.tsx`

- Query `message_hides` for `user_id = me` and messages in this conversation
- Pass `hiddenMessageIds: Set<string>` to `ChatView`
- Filter SSR messages: omit hidden IDs; map `removed_at` → display state

### 4. Realtime UPDATE subscription

**File:** `apps/web/src/app/(app)/chat/[id]/chat-view.tsx`

```typescript
.on(
  "postgres_changes",
  {
    event: "UPDATE",
    schema: "public",
    table: "messages",
    filter: `conversation_id=eq.${conversationId}`,
  },
  (payload) => {
    const row = payload.new as MessageRow;
    if (row.removed_at) {
      // Both users: show "Message removed"
      setMessages((prev) =>
        prev.map((m) => (m.id === row.id ? { ...m, ...row, body: "" } : m)),
      );
    }
  },
)
```

Hide path: optimistic filter locally; no realtime event for the other user.

### 5. Message actions UI

**New:** `apps/web/src/components/chat/message-actions-menu.tsx`

- **Delete** on every message bubble
- Branch in `ChatView`:
  - `message.sender_id === currentUserId` → `removeMessage(id)`
  - else → `hideMessage(id)` + remove from local state

**File:** `apps/web/src/components/chat/message-bubble.tsx`

- Prop `removed?: boolean` — muted bubble, text **"Message removed"**, no actions on removed rows (optional)

### 6. Home list / preview

- Globally removed messages still have `created_at` — preview may show **"Message removed"** or prior message (product: show "Message removed" if latest)
- Hidden messages only affect deleter's sidebar after refetch — Phase 3 live home updates

### 7. Feature docs and tests

- Update [realtime-chat.md](../../features/realtime-chat.md)
- Manual test matrix (two browsers):

| Step | Actor | Action | Expected |
|------|-------|--------|----------|
| 1 | A | Remove own message | A and B see "Message removed" |
| 2 | A | Hide B's message | A: gone; B: still sees original |
| 3 | B | Refresh chat | B still sees message from step 2 |

## Realtime considerations

| Event | Purpose |
|-------|---------|
| INSERT | Unchanged |
| UPDATE | Global remove — sync `removed_at` to both clients |
| DELETE | **Not used** |

## UI/UX details

| Behavior | Spec |
|----------|------|
| Own message removed | Muted bubble, text **"Message removed"**, visible to both |
| Other's message hidden | **No row** in deleter's list — no placeholder |
| Delete control | Available on **any** message (not removed) |
| Removed bubble | No edit/forward; delete hidden or disabled |
| Confirmation | Optional: "Remove for everyone?" vs "Hide this message?" |
| Errors | Rollback optimistic state + inline alert |

## Acceptance criteria

- [ ] User can remove **own** text message; **both** participants see **"Message removed"**
- [ ] User can hide **another user's** message; hidden **only** for that user
- [ ] Realtime: recipient sees **"Message removed"** on other's global remove without refresh
- [ ] Hidden messages excluded from deleter's SSR load and pagination
- [ ] Removed messages still appear as placeholder row (not blank gap) for both users
- [ ] User cannot hard-delete rows via app (no DELETE policy)
- [ ] Failed remove/hide rolls back optimistic UI
- [ ] `pnpm build` passes; two-user manual test documented

## Dependencies

| Dependency | Reason |
|------------|--------|
| Phase 0 chat | Shipped |
| [message-pagination.md](./message-pagination.md) | Hide/remove on paginated rows |
| [message-notifications.md](../phase3/message-notifications.md) | Home preview refresh (Phase 3) |

## Estimated effort

| Task | Effort |
|------|--------|
| Migration (`removed_at`, `message_hides`, RLS, replica identity) | 3h |
| remove/hide helpers + page load hides | 3h |
| ChatView UPDATE realtime + optimistic paths | 4h |
| Message actions UI + bubble removed state | 3h |
| Docs + manual QA | 2h |
| **Total** | **~1.5–2 days** |

## Group chat extension

When [group-chat.md](../phase2/group-chat.md) ships:

- Global remove: still sender-only UPDATE
- Hide: extend `message_hides` INSERT policy with `is_conversation_member()`
- Same UX per member