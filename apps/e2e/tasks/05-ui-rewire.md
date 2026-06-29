# Task 05 — UI Rewire (Local-First)

## Goal

Chat and contacts UI read from IndexedDB vault, not server plaintext.

## Subtasks

### 5.1 Chat page SSR

- [ ] Remove message `select` from `chat/[id]/page.tsx`
- [ ] Keep: auth check, conversation membership, friend profile
- [ ] Pass: `conversationId`, `friend`, `currentUserId` only

### 5.2 ChatView hydration

- [ ] On mount: open vault, load messages from IndexedDB
- [ ] Show loading skeleton until vault ready
- [ ] Replace `useState(initialMessages)` with vault subscription
- [ ] Wire send through `lib/e2ee/send.ts`
- [ ] Wire Realtime through `lib/e2ee/receive.ts`

### 5.3 Pagination

- [ ] Replace `fetchOlderMessages` Postgres query with vault cursor
- [ ] Keep same UX: "Load older" or infinite scroll

### 5.4 Contacts sidebar

- [ ] Remove `latest_message_previews` and `conversation_unread_counts` from `load-contacts.ts`
- [ ] SSR: friends + conversation IDs + `last_message_at` timestamp only
- [ ] Client: hydrate previews/unread from vault `conversations` store

### 5.5 ContactsProvider

- [ ] Remove `messages` table Realtime subscription
- [ ] Subscribe to vault `conversations` changes
- [ ] On envelope receive: update local preview + unread
- [ ] Notifications: generic "New message" or local preview text

### 5.6 Read state

- [ ] Move `lastReadAt` to vault `conversations` store
- [ ] Remove or make optional server `conversation_reads` writes
- [ ] Unread count: local count of messages after `lastReadAt`

### 5.7 Empty / error states

- [ ] Empty thread (no local messages): "Say hello" state
- [ ] Decrypt failure: "Unable to decrypt" placeholder (not crash)
- [ ] Session replaced: redirect before rendering vault

### 5.8 Remove dead code

- [ ] Deprecate `lib/chat/messages.ts` Postgres paths
- [ ] Remove server link preview for encrypted messages (or client-only)

## Files

| File | Action |
|------|--------|
| `apps/web/src/app/(app)/(messages)/chat/[id]/page.tsx` | Modify |
| `apps/web/src/app/(app)/(messages)/chat/[id]/chat-view.tsx` | Major modify |
| `apps/web/src/lib/chat/messages.ts` | Rewrite (local pagination) |
| `apps/web/src/lib/contacts/load-contacts.ts` | Modify |
| `apps/web/src/contexts/contacts-context.tsx` | Modify |
| `apps/web/src/lib/contacts/mark-conversation-read.ts` | Modify |

## Exit criteria

- [ ] Chat loads from vault on refresh (no SSR messages)
- [ ] Sidebar shows correct preview + unread from local store
- [ ] Send + receive works end-to-end in UI
- [ ] No network requests fetch plaintext message bodies
- [ ] `pnpm build` passes

## Notes

- Expect brief loading skeleton on cold start — acceptable tradeoff
- Cold start with empty vault on new device is expected behavior