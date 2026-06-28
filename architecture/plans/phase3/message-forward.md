# Plan: Forward Message

Allow users to forward a message to another accepted friend's conversation. **Added to roadmap** — deferred from Phase 1.

## Phase

**Phase 3** — Medium effort. After Phase 1 images (forwarded images need attachment support).

## Scope

### In scope

- Forward **text** messages to another 1-on-1 conversation (accepted friendship)
- Forward **image** messages once [message-enhancements.md](../phase1/message-enhancements.md) images ship (copy `attachment_url` + `type`)
- UI: message actions menu → **Forward** → contact picker (accepted friends only, exclude current thread optional)
- Insert a **new** message in the target conversation (not a move)
- Optional v1: prefix body with lightweight attribution, e.g. `Forwarded from Alex:\n…`

### Out of scope

- Forward to multiple recipients at once
- Forward to groups ([group-chat.md](../phase2/group-chat.md))
- Forward with nested quote chains / rich embed cards
- Forward system events or deleted-source messages

## Schema changes (optional v1.1)

**v1 (no migration):** INSERT new row with copied `body` / `attachment_url`; attribution in text only.

**v1.1 (optional migration):**

```sql
alter table public.messages
  add column forwarded_from_message_id uuid references public.messages(id) on delete set null;
```

Enables UI label "Forwarded" without parsing body prefix. Not required for initial ship.

## Implementation steps

### 1. Forward helper

**New file:** `apps/web/src/lib/chat/forward-message.ts`

```typescript
export async function forwardMessage(opts: {
  sourceMessage: MessageRow;
  targetConversationId: string;
  currentUserId: string;
}): Promise<{ error: Error | null }>
```

- Resolve or create target conversation (canonical pair — conversation should exist after accepted friendship)
- INSERT into `messages` with `sender_id = currentUserId`, copied content
- Reuse existing INSERT RLS

### 2. Contact picker modal

**New file:** `apps/web/src/components/chat/forward-message-dialog.tsx`

- List accepted friends (reuse `loadContacts` or lightweight client fetch)
- Tap friend → forward → close → optional navigate to target chat
- Loading / error states

### 3. Message actions UI

**File:** `apps/web/src/components/chat/message-actions-menu.tsx` (shared with delete/edit)

- Add **Forward** on all visible messages (own and received) — product choice: both allowed
- Disable forward for `pending` / `failed` optimistic rows

### 4. Wire in ChatView

- `onForward(message)` opens picker with `sourceMessage` in state
- On success: toast or navigate; no change to source thread

### 5. Home preview

- Forwarded message updates target `last_message_at` via existing INSERT trigger — no new trigger
- Home preview staleness until Phase 3 [message-notifications.md](./message-notifications.md) — acceptable

## Acceptance criteria

- [ ] User can forward a text message to another friend's chat
- [ ] Target chat shows new message from current user with forwarded content
- [ ] Source message remains unchanged in original thread
- [ ] Cannot forward to non-friend or blocked user (RLS blocks INSERT)
- [ ] Image forward works after image attachments ship
- [ ] `pnpm build` passes; two-user manual test documented

## Dependencies

| Dependency | Reason |
|------------|--------|
| [Phase 1](../phase1/README.md) images | Image forward content |
| Accepted friendships + conversations | Target thread must exist |
| [message-deletion.md](../phase1/message-deletion.md) | Shared message actions menu (recommended); do not forward removed/hidden messages |

## Estimated effort

| Task | Effort |
|------|--------|
| `forward-message.ts` + INSERT flow | 3h |
| Contact picker modal | 4h |
| Actions menu + ChatView wire | 2h |
| Image forward + docs + QA | 3h |
| **Total** | **~1–1.5 days** |