# Contacts Home

The home screen lists accepted friends as contacts, sorted by most recent chat activity.

## User flow

```mermaid
flowchart LR
  A[/home] --> B[Load accepted friendships]
  B --> C[For each friend: find conversation]
  C --> D[Sort by last_message_at desc]
  D --> E[Render contact cards]
  E --> F[Tap → /chat/:conversationId]
```

## Behavior

| State | UI |
|-------|-----|
| No accepted friends | Empty state with link to `/friends/add` |
| Friend with conversation | Card links to `/chat/{conversationId}` |
| Friend without conversation | Card links to `/friends/add` (edge case — should not happen if trigger ran) |

Each contact card shows:
- Friend `display_name`
- Friend `public_id`
- Message icon

## File map

| File | Role |
|------|------|
| `apps/web/src/app/(app)/home/page.tsx` | Server component: query + sort + render |
| `packages/core/src/conversation.ts` | `canonicalizeParticipants()` for conversation lookup |
| `apps/web/src/components/app-shell.tsx` | Page chrome with "Contacts" title |

## Data loading (server-side)

1. Query `friendships` where `status = 'accepted'` and user is requester or addressee.
2. Join `profiles` for both sides via FK aliases.
3. For each friendship, resolve the "friend" profile (the other user).
4. Call `canonicalizeParticipants(user.id, friend.id)` to get ordered pair.
5. Query `conversations` by `(user_a_id, user_b_id)`.
6. Build contact object: `{ friendshipId, friend, conversationId, lastMessageAt }`.
7. Sort contacts by `lastMessageAt` descending (nulls last).

## Sorting logic

```typescript
contacts.sort((a, b) => {
  const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
  const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
  return bTime - aTime;
});
```

Friends never messaged appear at the bottom (timestamp 0).

## Performance note

Current implementation runs N+1 queries (one conversation lookup per friend). Acceptable for small friend lists; optimize with a single joined query if scaling.

**Suggested optimization:**
```sql
SELECT c.* FROM conversations c
WHERE (c.user_a_id = $me OR c.user_b_id = $me)
```

Then map in memory by canonical pair.

## Extension hooks

| Future need | Approach |
|-------------|----------|
| Last message preview | Join latest message per conversation |
| Unread badge | See [unread-and-read-state.md](../plans/phase1/unread-and-read-state.md) |
| Online indicator | See [avatars-and-presence.md](../plans/phase2/avatars-and-presence.md) |
| Search contacts | Client-side filter on display_name / public_id |