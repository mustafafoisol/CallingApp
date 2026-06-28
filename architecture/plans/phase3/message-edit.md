# Plan: Edit Own Messages

Allow users to edit the text body of messages they sent. **Deferred from Phase 1** — ship after core send/receive, images, and message remove/hide are stable.

## Phase

**Phase 3** — Small–medium effort. Can run in parallel with [typing-indicators.md](./typing-indicators.md).

## Scope

### In scope

- Edit **own text messages** only
- Update `body`, set `edited_at`
- RLS: UPDATE policy where `sender_id = auth.uid()` and user is conversation participant
- UI: edit action on own bubbles; inline or modal editor; show subtle "edited" indicator
- Realtime UPDATE subscription so recipient sees edited text without refresh

### Out of scope

- Edit image messages or attachment metadata
- Edit history / version log
- Edit after arbitrary time window enforcement at DB level (UI-only 15 min rule optional)
- Group message edit (until [group-chat.md](../phase2/group-chat.md) extends policies)

## Schema changes

**New migration:** `supabase/migrations/YYYYMMDDHHMMSS_message_edit.sql`

```sql
alter table public.messages
  add column if not exists edited_at timestamptz;

create policy "messages_update_own"
  on public.messages for update to authenticated
  using (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  )
  with check (auth.uid() = sender_id);
```

`messages` may need `replica identity full` if not already set by [message-deletion.md](../phase1/message-deletion.md).

## Implementation steps

1. Migration + RLS UPDATE policy
2. `apps/web/src/lib/chat/edit-message.ts` — `updateMessage(id, body)`
3. Extend `chat-view.tsx` realtime handler for `UPDATE` on `messages`
4. Reuse or extend `message-actions-menu.tsx` (from delete plan) with Edit
5. `MessageBubble` — optional `editedAt` display
6. Update [realtime-chat.md](../../features/realtime-chat.md)

## Acceptance criteria

- [ ] User can edit own text message body from `/chat/[id]`
- [ ] Recipient sees updated text via realtime without refresh
- [ ] User cannot edit another user's message (UI + RLS)
- [ ] Edited messages show `edited_at` indicator (subtle)
- [ ] `pnpm build` passes; two-user manual test documented

## Dependencies

| Dependency | Reason |
|------------|--------|
| [Phase 1](../phase1/README.md) chat MVP | Shipped baseline |
| [message-deletion.md](../phase1/message-deletion.md) | Recommended first — shares message actions menu + `replica identity full` |

## Estimated effort

~0.5 day