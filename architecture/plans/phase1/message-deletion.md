# Plan: Message Deletion (Hard Delete)

Allow users to permanently delete their own messages. Deleted messages are **removed from the database and UI entirely** — no "Message deleted" placeholder, no soft-delete column.

## Phase

**Phase 1 v1.1** — Medium effort. Recommended after image attachments. Home preview staleness after delete is a Phase 3 concern ([message-notifications.md](../phase3/message-notifications.md)).

## Problem

Users cannot remove messages they sent by mistake. [message-enhancements.md](./message-enhancements.md) previously proposed **soft delete** (`deleted_at` + placeholder). Product requirement is **hard delete**: the message block disappears completely for both participants.

Current gaps:

- No DELETE RLS policy on `messages`
- Realtime subscribes to **INSERT only** in `chat-view.tsx`
- `last_message_at` is updated only on INSERT (`handle_new_message` trigger) — deleting the latest message leaves stale metadata on home

## Scope

### In scope

- **Hard delete:** `DELETE` row from `public.messages`
- Delete **own messages only**, within an accepted-friend 1-on-1 conversation
- UI: delete action on own message bubbles (context menu or long-press / overflow)
- Optional confirmation dialog before delete
- Optimistic UI removal on sender; realtime DELETE sync for recipient
- Recalculate `conversations.last_message_at` when the deleted row was the latest message
- Client state: remove message from `messages` array — **no placeholder node**

### Out of scope

- Soft delete / `deleted_at` / "Message deleted" placeholder
- Delete for the other participant's messages
- Admin/moderation delete
- Bulk delete / "clear conversation"
- Message edit (remains in [message-enhancements.md](./message-enhancements.md) if pursued separately)
- Undo / trash retention window
- Deleting image attachment blobs from Storage (text-only v1)

## Schema changes

**New migration:** `supabase/migrations/YYYYMMDDHHMMSS_message_hard_delete.sql`

### 1. Realtime DELETE payloads

Postgres default replica identity sends only PK on DELETE. Filtering realtime by `conversation_id` needs the old row's `conversation_id`:

```sql
alter table public.messages replica identity full;
```

### 2. RLS — DELETE own messages

```sql
create policy "messages_delete_own"
  on public.messages for delete to authenticated
  using (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  );
```

No `deleted_at` column. No UPDATE policy required for delete-only feature.

### 3. Trigger — refresh `last_message_at` on DELETE

```sql
create or replace function public.handle_message_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = (
    select max(m.created_at)
    from public.messages m
    where m.conversation_id = old.conversation_id
  )
  where id = old.conversation_id;
  return old;
end;
$$;

create trigger on_message_deleted
  after delete on public.messages
  for each row execute function public.handle_message_deleted();
```

When the thread is empty, `last_message_at` becomes `NULL`.

### 4. Optional time window

Enforce "delete within 15 minutes" in UI only for v1.1; DB policy stays "own messages anytime" unless product decides otherwise.

**Explicitly NOT in migration:**

```sql
-- DO NOT ADD:
-- add column deleted_at timestamptz;
```

## Implementation steps

### 1. Apply migration

Document in [data-model-and-security.md](../../features/data-model-and-security.md): DELETE policy, `replica identity full`, delete trigger.

### 2. Delete API helper

**New file:** `apps/web/src/lib/chat/delete-message.ts`

```typescript
export async function deleteMessage(messageId: string): Promise<{ error: Error | null }>
```

- `supabase.from("messages").delete().eq("id", messageId)`
- Map RLS errors to user-friendly strings

### 3. Realtime DELETE subscription

**File:** `apps/web/src/app/(app)/chat/[id]/chat-view.tsx`

Add handler alongside INSERT:

```typescript
.on(
  "postgres_changes",
  {
    event: "DELETE",
    schema: "public",
    table: "messages",
    filter: `conversation_id=eq.${conversationId}`,
  },
  (payload) => {
    const id = (payload.old as { id: string }).id;
    setMessages((prev) => prev.filter((m) => m.id !== id));
  },
)
```

### 4. Delete action UI on own bubbles

**File:** `apps/web/src/components/chat/message-bubble.tsx`

Extend props: `messageId`, `mine`, `onDelete?: (messageId: string) => void`

- Desktop: hover reveals "⋯" menu with Delete
- Mobile: long-press opens action sheet
- **New (optional):** `apps/web/src/components/chat/message-actions-menu.tsx`

### 5. Wire delete in ChatView

**File:** `apps/web/src/app/(app)/chat/[id]/chat-view.tsx`

- Optimistic remove before DELETE call
- Rollback on error (keep snapshot or refetch)
- Pass `onDelete` only for own bubbles

### 6. Home list / last message preview

**File:** `apps/web/src/app/(app)/home/page.tsx`

- After delete trigger, `last_message_at` updates
- Preview may be stale until home refetch — acceptable v1.1
- Stretch: subscribe to `conversations` UPDATE on home or refetch on focus

### 7. Feature docs and tests

- Update [realtime-chat.md](../../features/realtime-chat.md): DELETE subscription, hard delete behavior
- Manual test: delete own message, verify gone for both users, no placeholder gap

## Realtime considerations

| Event | Today | After this plan |
|-------|--------|-----------------|
| INSERT | Subscribed | Unchanged |
| DELETE | Not subscribed | **Subscribe** with `conversation_id` filter |
| UPDATE | Not subscribed | Out of scope (edit is separate) |

**Requirements:**

1. `messages` already in `supabase_realtime` publication — no change
2. `replica identity full` on `messages` — **required** for filter + `payload.old`
3. Sender: optimistic remove + DELETE; realtime DELETE is idempotent
4. Recipient: only realtime DELETE

## RLS policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `messages_select_participant` | SELECT | Existing — unchanged |
| `messages_insert_participant` | INSERT | Existing — unchanged |
| `messages_delete_own` | DELETE | **New** — `sender_id = auth.uid()` and conversation participant |

## UI/UX details

| Behavior | Spec |
|----------|------|
| Visibility | Delete control **only on own** bubbles |
| After delete | Message row **gone** — no placeholder, no collapsed stub |
| Layout | Remaining messages reflow; day separators remain correct |
| Empty thread | Show existing empty state: "No messages yet. Say hello!" |
| Errors | Inline alert + rollback on failure |
| Confirmation | "Delete this message?" — Cancel / Delete (destructive) |

**Explicit anti-patterns:**

- ❌ `deleted_at` column
- ❌ "Message deleted" italic placeholder
- ❌ Greyed-out bubble shell retaining height

## Acceptance criteria

- [ ] User can delete their own text message from `/chat/[id]`
- [ ] After delete, message **does not appear** for sender or recipient (no placeholder)
- [ ] Realtime: recipient sees message disappear without refresh
- [ ] Deleted message **not** returned by SSR or "load older" queries
- [ ] Deleting the latest message updates `conversations.last_message_at` (or NULL if thread empty)
- [ ] User **cannot** delete another user's message (UI + RLS)
- [ ] Failed delete shows error and message reappears (rollback)
- [ ] `pnpm build` passes; manual two-user test documented

## Dependencies

| Dependency | Reason |
|------------|--------|
| Phase 0 chat (send/receive) | Shipped |
| [message-pagination.md](./message-pagination.md) | Recommended — delete on older loaded rows |
| [message-notifications.md](../phase3/message-notifications.md) | Soft dependency — preview staleness after delete (Phase 3) |

## Estimated effort

| Task | Effort |
|------|--------|
| Migration (RLS, replica identity, trigger) | 2h |
| `delete-message.ts` + ChatView DELETE realtime | 3h |
| Message actions UI + confirm | 3h |
| Optimistic rollback + error handling | 2h |
| Docs + manual QA (two browsers) | 2h |
| **Total** | **~1–1.5 days** |

## Relationship to `message-enhancements.md`

This plan **replaces** the delete portion of section "3. Edit & delete own messages" in [message-enhancements.md](./message-enhancements.md).

| Aspect | `message-enhancements.md` (old) | This plan |
|--------|----------------------------------|-----------|
| Delete model | Soft: `deleted_at`, show placeholder | **Hard:** `DELETE` row, UI removed |
| Schema | `deleted_at timestamptz` | **No** `deleted_at`; DELETE policy + trigger |
| Realtime | UPDATE events | **DELETE** `postgres_changes` |
| Edit | `edited_at` + UPDATE | **Unchanged** — keep edit in enhancements doc |

## Group chat extension

When [group-chat.md](../phase2/group-chat.md) ships, extend DELETE policy to use `is_conversation_member()` instead of `user_a_id`/`user_b_id` pair check. Same hard-delete UX for all members.