# Realtime Chat

1-on-1 text messaging between accepted friends with live delivery via Supabase Realtime.

## User flow

```mermaid
sequenceDiagram
  actor A as User A
  actor B as User B
  participant ChatA as ChatView A
  participant DB as Postgres
  participant RT as Realtime
  participant ChatB as ChatView B

  A->>ChatA: Open /chat/:id
  ChatA->>DB: SELECT last 50 messages (SSR)
  ChatA->>RT: Subscribe messages:conversationId
  A->>ChatA: Type + Send
  ChatA->>DB: INSERT message (RLS checks friendship)
  DB->>RT: postgres_changes INSERT
  RT->>ChatB: New message event
  ChatB->>ChatB: Append to state, scroll down
```

## Access control

Messaging requires **all** of:

1. User is a participant in the conversation (`user_a_id` or `user_b_id`).
2. An `accepted` friendship exists between the two participants.
3. `sender_id` equals `auth.uid()` on insert.

Enforced by RLS policy `messages_insert_participant` — see [data-model-and-security.md](./data-model-and-security.md).

## Message constraints

| Field | Constraint |
|-------|------------|
| `body` | 1–4000 characters |
| `type` | `"text"` only (enum in schema) |
| `conversation_id` | Must reference existing conversation |
| `sender_id` | Must be current user |

## File map

| File | Role |
|------|------|
| `apps/web/src/app/(app)/chat/[id]/page.tsx` | SSR: load conversation, verify participant, fetch last 50 messages |
| `apps/web/src/app/(app)/chat/[id]/chat-view.tsx` | Client: realtime subscription, pagination, send form, bubble UI |
| `apps/web/src/lib/chat/messages.ts` | `fetchOlderMessages()` cursor pagination helper |
| `apps/web/src/lib/chat/remove-message.ts` | Global soft remove (own messages) |
| `apps/web/src/lib/chat/hide-message.ts` | Per-user hide (others' messages) |
| `apps/web/src/lib/chat/message-hides.ts` | Load hidden message IDs for a conversation |
| `apps/web/src/components/chat/message-actions-menu.tsx` | Delete / hide action on bubbles |
| `apps/web/src/lib/chat/optimistic.ts` | Pending/confirmed message state helpers |
| `apps/web/src/components/chat/compose-bar.tsx` | Compose bar with emoji picker |
| `apps/web/src/components/chat/emoji-picker-popover.tsx` | Emoji picker popover |
| `packages/core/src/types.ts` | `Message`, `MessageType` interfaces |
| `supabase/migrations/20250625000001_initial_schema.sql` | `messages` table, RLS, realtime publication |

## Page: `/chat/[id]`

**Server-side checks:**
1. User authenticated (redirect `/login`).
2. Conversation exists and user is participant (else redirect `/home`).
3. Resolve friend profile for header title.
4. Fetch up to **50** most recent messages (descending query, reversed for display).

**Renders:** `AppShell` + `ChatView` with `initialMessages`.

## ChatView component

**State:**
- `messages` — initialized from SSR, prepended via pagination, appended via realtime
- `hasMore` / `loadingOlder` — cursor pagination for older history
- `body` — compose input text

**Realtime subscription:**
```typescript
supabase.channel(`messages:${conversationId}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "messages",
    filter: `conversation_id=eq.${conversationId}`,
  }, handler)
  .on("postgres_changes", { event: "UPDATE", ... }, handler)  // removed_at sync
```

**Deduplication:** Before appending, checks `prev.some(m => m.id === row.id)`.

**Remove / hide:**
- Any participant can act on any message via `⋯` menu.
- **Own message:** `UPDATE` sets `removed_at` + clears `body`; both users see muted **"Message removed"** bubble (realtime UPDATE).
- **Other's message:** `INSERT message_hides`; hidden only for the actor (filtered on SSR load and pagination).

**Send (optimistic):** On submit, appends a pending bubble immediately and clears the compose input. Background `INSERT` with `.select().single()` replaces the pending row with the confirmed message. Realtime INSERT reconciles the same way if it arrives first. Failed sends show "Failed to send · Retry" on the bubble; compose-level error for first failure.

**Realtime:** Subscribes after `getSession()`; logs channel status; banner if not `SUBSCRIBED`.

**Pagination:** "Load older messages" at top fetches 30 more via `fetchOlderMessages()` using `(created_at, id)` cursor. Scroll position preserved when prepending. `hasMore` is false when a page returns fewer than 30 rows.

**UI:**
- Mine: right-aligned coral bubble with timestamp below
- Theirs: left-aligned surface bubble with timestamp below
- Day separators between message groups
- Emoji picker in compose bar (UTF-8 in `body`, no schema change)
- Auto-scroll to bottom on new messages only (not when loading older)

## Conversation metadata

Trigger `handle_new_message()` updates `conversations.last_message_at` on every INSERT. Used by [contacts-home.md](./contacts-home.md) for sorting.

## Realtime publication

`messages` table is in `supabase_realtime` publication (migration 001).

## Known limitations

| Limitation | Plan |
|------------|------|
| No typing indicators | [typing-indicators.md](../plans/phase3/typing-indicators.md) (Phase 3) |
| No unread badges / read state | [unread-and-read-state.md](../plans/phase3/unread-and-read-state.md) (Phase 3) |
| No attachments | [message-enhancements.md](../plans/phase1/message-enhancements.md) |
| No edit / forward | [message-edit.md](../plans/phase3/message-edit.md), [message-forward.md](../plans/phase3/message-forward.md) |
| Realtime-only delivery (fixed) | Sender now appends from INSERT response — see [troubleshooting.md](../feature-tests/chat/troubleshooting.md) |

## Testing

Manual test guide and scenario plan: [feature-tests/chat/](../feature-tests/chat/).

## Troubleshooting

If messages do not appear: [feature-tests/chat/troubleshooting.md](../feature-tests/chat/troubleshooting.md)

## Extension pattern for new message types

1. Extend `messages.type` CHECK constraint in migration.
2. Add type to `MessageType` in `packages/core`.
3. Update `ChatView` render switch for new bubble formats.
4. Add RLS if new types need different insert rules.