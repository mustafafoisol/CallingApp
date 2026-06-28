# Plan: Message Pagination

Load older messages on scroll instead of a fixed 50-message window.

## Phase

**Phase 1** — Small effort, high UX impact for active chats.

## Problem

`/chat/[id]` loads only the 50 most recent messages at SSR time. Long conversations lose history with no way to retrieve older messages.

## Scope

### In scope
- Cursor-based pagination using `created_at` + `id`
- "Load older messages" button or infinite scroll at top of chat
- Preserve scroll position when prepending older messages
- Update SSR initial load to remain at 50 (or reduce to 30 for faster paint)

### Out of scope
- Full-text search across messages
- Server-side message caching

## Implementation

### 1. API or client query

Option A — direct Supabase client (preferred, RLS sufficient):

```typescript
const { data } = await supabase
  .from("messages")
  .select("id, sender_id, body, created_at")
  .eq("conversation_id", conversationId)
  .lt("created_at", cursorCreatedAt)
  .order("created_at", { ascending: false })
  .limit(30);
```

Reverse before prepending to maintain ascending display order.

Option B — API route if adding server-side caching later.

### 2. ChatView changes

`apps/web/src/app/(app)/chat/[id]/chat-view.tsx`:

- Add `hasMore` state (true if initial fetch returned limit count)
- Add `loadingOlder` state
- On load older: prepend messages, maintain scroll anchor via `scrollHeight` delta
- Show "Load older" when `hasMore`

### 3. Deduplication

Keep existing `prev.some(m => m.id === row.id)` guard for realtime + pagination overlap.

## Acceptance criteria

- [ ] User can load messages beyond initial 50
- [ ] Scroll position stable when prepending
- [ ] Realtime new messages still append at bottom
- [ ] No duplicate messages in list
- [ ] Works when fewer than page size messages exist (`hasMore = false`)

## Dependencies

None.

## Estimated effort

**4–6 hours**