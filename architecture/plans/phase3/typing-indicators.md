# Plan: Typing Indicators

Show "Alex is typing…" in 1-on-1 chat while the other participant is composing.

## Phase

**Phase 3** — Small effort; deferred from Phase 1 (not core to chat MVP).

## Problem

Users have no signal that the other person is composing a reply.

## Scope

### In scope

- Supabase Realtime **Broadcast** channel per conversation (not `postgres_changes`)
- Sender broadcasts `{ type: "typing", userId }` on input debounce
- Receiver shows "Alex is typing…" below message list
- Auto-clear after 3s idle

### Out of scope

- Typing in group threads (see [group-chat.md](../phase2/group-chat.md) when groups ship)
- "Seen typing" receipts

## Implementation

**New:** `apps/web/src/lib/chat/typing.ts`

**Touch:** `apps/web/src/components/chat/compose-bar.tsx`, `apps/web/src/app/(app)/chat/[id]/chat-view.tsx`

## Acceptance criteria

- [ ] Typing indicator appears when friend types
- [ ] Indicator clears after 3s idle or on send
- [ ] No indicator for own typing
- [ ] `pnpm build` and `pnpm test` pass

## Dependencies

- Phase 1 chat send/receive shipped

## Estimated effort

**~1 day**