# Issue: Conversation list does not show last message

**Type:** Bug  
**Area:** Contacts sidebar / home list  
**Priority:** High (core chat UX)

## Summary

The contacts sidebar and `/home` conversation list do not show the latest message preview or update `lastMessageAt` after E2EE text messages are sent/received. Cards show "Start a conversation" even when the chat has messages.

## Steps to reproduce

1. Log in as UserA and UserB (accepted friends).
2. Open a 1-on-1 chat and exchange several encrypted text messages.
3. Return to `/home` or view the contacts sidebar on `/chat/[id]`.

## Expected

- Each contact card shows the **last message preview** (plaintext snippet or "Photo"/"Message removed").
- **Timestamp** reflects the most recent message.
- List is **sorted** by most recent activity.
- Preview **updates live** when a new message arrives (without full page refresh).

## Actual

- Preview stays **"Start a conversation"** or empty.
- `lastMessageAt` is often **null** or stale.
- Sorting does not reflect recent chats.
- Live updates do not fire for new encrypted text messages.

## Root cause

E2EE rewire is partial. The contacts list still uses the **legacy plaintext server path**, while text messages now live in the **local IndexedDB vault** and transit via **`message_envelopes`** (ephemeral ciphertext).

| Layer | Legacy (contacts expect) | E2EE today |
|-------|--------------------------|------------|
| Message storage | `messages` table (plaintext) | `vault.messages` (local plaintext) |
| Server relay | N/A | `message_envelopes` (deleted after ACK) |
| Preview RPC | `latest_message_previews()` | **Stub — returns zero rows** |
| `last_message_at` | Trigger on `messages` INSERT | **Not updated** for envelope-only traffic |
| Realtime | `ContactsProvider` listens to `messages` INSERT | Text sends **do not** INSERT into `messages` |

### Evidence in repo

- `supabase/migrations/20250628150002_e2ee_purge_legacy.sql` — deprecates `latest_message_previews` to empty result.
- `apps/web/src/lib/contacts/load-contacts.ts` — still calls `latest_message_previews` RPC.
- `apps/web/src/contexts/contacts-context.tsx` — Realtime on `messages` INSERT only.
- `apps/e2e/tasks/05-ui-rewire.md` §5.4–5.5 — planned fix not implemented.

## Proposed fix

Complete **Task 05 — UI Rewire** contacts portion:

1. **Hydrate sidebar from vault** `conversations` store (preview, `previewAt`, `unreadCount`).
2. **On send/receive** (`send.ts` / `receive.ts`): update vault conversation metadata.
3. **Remove** dependency on `latest_message_previews` RPC for text (keep image path if still server-backed).
4. **Replace** `ContactsProvider` `messages` Realtime with vault live-query or envelope-side effects.
5. Optionally bump `conversations.last_message_at` from client on envelope ACK (timestamp-only, no body) for SSR sort fallback.

## Acceptance criteria

- [x] After sending/receiving text, sidebar shows correct preview without refresh.
- [x] `lastMessageAt` ordering matches actual chat activity.
- [x] Unread badge increments for incoming messages when chat is not active.
- [x] Works after page reload (hydrate from vault, not empty RPC).
- [x] No regression for image messages (if still using `messages` table).

## Resolution (2026-06-29)

- Added `vault-contact-sync.ts` — vault conversation metadata (preview, `previewAt`, `unreadCount`) merged into contacts on hydrate and patch.
- `ContactsProvider` subscribes to `message_envelopes` INSERT (E2EE text) plus `messages` INSERT for non-text (images); hydrates from vault on mount and refresh.
- `processEnvelope` records incoming vault metadata; `sendEncryptedText` records outgoing; `chat-view` calls `notifyLocalMessage` for immediate sender sidebar update.
- Vault unread cleared on mark-read (active chat).

## Files likely involved

- `apps/web/src/lib/contacts/load-contacts.ts`
- `apps/web/src/contexts/contacts-context.tsx`
- `apps/web/src/lib/e2ee/send.ts`
- `apps/web/src/lib/e2ee/receive.ts`
- `apps/web/src/lib/vault/store.ts`
- `apps/e2e/tasks/05-ui-rewire.md`

## Related docs

- [architecture/features/contacts-home.md](../features/contacts-home.md)
- [architecture/features/e2ee-local-chat.md](../features/e2ee-local-chat.md)
- [apps/e2e/tasks/05-ui-rewire.md](../../apps/e2e/tasks/05-ui-rewire.md)