# Current Chat Architecture

How two accepted friends exchange text messages in CallingApp today.

## Summary

Chat is **1-on-1 only**. **Text** messages are end-to-end encrypted: plaintext lives in **IndexedDB**, the server relays ciphertext via `message_envelopes`, and delivery uses **Supabase Realtime** (`postgres_changes` on that table). **Images** still use legacy plaintext `messages` + `chat-media`. There is no custom WebSocket server — the browser talks directly to Supabase using the anon key, with **Row Level Security (RLS)** enforcing who can read and write.

Full crypto detail: [../../features/e2ee-local-chat.md](../../features/e2ee-local-chat.md).

## End-to-end flow

```mermaid
flowchart TB
  subgraph prereq [Prerequisites]
    Auth[Both users authenticated]
    Friends[Friendship status = accepted]
    Convo[Conversation row exists]
  end

  subgraph entry [Entry to chat]
    Home["/home — contacts list"]
    ChatPage["/chat/:conversationId — SSR page"]
  end

  subgraph server [Server render — page.tsx]
    Verify[Verify user is conversation participant]
    Render[Pass conversation + friend to ChatView]
  end

  subgraph client [Client — chat-view.tsx]
    VaultInit[openVault + ensureConversationKey + catchUp]
    LoadVault[loadVaultMessages — last 50 from IndexedDB]
    Subscribe["Realtime subscribe envelopes:conversationId"]
    Display[Render bubbles mine vs theirs]
    SendText[sendEncryptedText — encrypt + INSERT envelope]
    SendImg[Legacy image INSERT messages]
    Dedupe[Deduplicate by message id]
    Scroll[Auto-scroll to bottom]
  end

  subgraph local [Device]
    Vault[(IndexedDB vault)]
    Crypto[AES-GCM + ECDH/HKDF]
  end

  subgraph backend [Supabase]
    Pubkeys[user_crypto_keys]
    Envelopes[(message_envelopes)]
    Messages[(messages — images only)]
    RLS[RLS policies]
    RT[Realtime publication]
  end

  Auth --> Friends --> Convo
  Home --> ChatPage
  ChatPage --> Verify --> Render
  Render --> VaultInit --> LoadVault --> Display
  VaultInit --> Vault
  VaultInit --> Crypto
  Crypto --> Pubkeys
  Display --> Subscribe
  Subscribe --> RT
  SendText --> Crypto --> Envelopes
  SendText --> Vault
  SendImg --> Messages
  Envelopes --> RT
  RT --> Subscribe
  Subscribe --> Dedupe --> Display --> Scroll
```

## Sequence: User A sends text, User B receives (E2EE)

```mermaid
sequenceDiagram
  participant A as UserA Browser
  participant PageA as chat page SSR
  participant ViewA as ChatView A
  participant VaultA as IndexedDB A
  participant SB as Supabase
  participant ViewB as ChatView B
  participant VaultB as IndexedDB B
  participant B as UserB Browser

  A->>PageA: GET /chat/:id
  PageA->>SB: getUser + SELECT conversation
  PageA->>ViewA: conversationId, friendId
  ViewA->>VaultA: initVault + loadVaultMessages
  ViewA->>SB: subscribe message_envelopes INSERT

  B->>ViewB: Already on same /chat/:id
  ViewB->>VaultB: initVault + load history
  ViewB->>SB: subscribe message_envelopes INSERT

  A->>ViewA: Type message + Send
  ViewA->>ViewA: optimistic pending bubble
  ViewA->>SB: SELECT peer IK_pub from user_crypto_keys
  ViewA->>ViewA: ECDH + HKDF → CK; buildAad; AES-GCM encrypt
  ViewA->>SB: INSERT message_envelopes ciphertext + nonce
  ViewA->>VaultA: store plaintext
  SB-->>ViewB: Realtime INSERT envelope
  ViewB->>ViewB: processEnvelope → decrypt
  ViewB->>VaultB: store plaintext
  ViewB->>SB: DELETE envelope
  ViewB->>ViewB: Append message if id not seen
  ViewB->>B: Bubble appears + scroll
```

## Prerequisites chain

Two people can only chat when **all** of the following are true:

| Step | Mechanism | Result |
|------|-----------|--------|
| 1. Sign in | Google OAuth + Supabase session | `auth.users` + stub `profiles` row |
| 2. Onboarding | `POST /api/profile/onboarding` | `display_name` + `public_id` set |
| 3. Add friend | Lookup by public ID + `POST /api/friends/request` | `friendships` row `pending` |
| 4. Accept | `POST /api/friends/respond` action=accept | `friendships` status `accepted` |
| 5. Conversation | DB trigger `handle_friendship_accepted` | `conversations` row with canonical user pair |
| 6. Open chat | `/home` → tap contact → `/chat/:id` | Both users use same `conversation.id` |

If friendship is `pending` or `blocked`, RLS **blocks** message INSERT even if a conversation row exists.

## Component responsibilities

### [`page.tsx`](../../../apps/web/src/app/(app)/chat/[id]/page.tsx) — Server

| Responsibility | Detail |
|----------------|--------|
| Auth gate | Redirect to `/login` if no session |
| Participant check | Redirect to `/home` if user not in `user_a_id` / `user_b_id` |
| Friend resolution | Load other participant's profile for header title |
| History load | Client loads from IndexedDB via `loadVaultMessages` after `initVault` |
| Hydration | Pass `conversationId`, `friendId`, `currentUserId` to `ChatView` |

### [`chat-view.tsx`](../../../apps/web/src/app/(app)/chat/[id]/chat-view.tsx) — Client

| Responsibility | Detail |
|----------------|--------|
| State | `messages` from vault; `vaultReady` gate; `body` for compose input |
| Realtime | Channel `envelopes:{conversationId}`, table `message_envelopes`, event `INSERT` |
| Send text | `sendEncryptedText` — encrypt, INSERT envelope, save plaintext to vault |
| Send image | Legacy `INSERT` into `messages` + `chat-media` upload |
| Dedup | Skip append if `message.id` already in state |
| UI | Right bubble = mine (`sender_id === currentUserId`), left = theirs |
| Scroll | `scrollIntoView` on bottom ref when `messages` changes |
| Error handling | Inline `sendError` on INSERT failure; banner if Realtime not subscribed |
| Realtime | Subscribe after `getSession()`; status logged to console |

## Data model (chat-relevant)

### `conversations`

- One row per accepted friend pair
- `user_a_id < user_b_id` (canonical ordering)
- `last_message_at` updated by trigger on each message

### `messages`

| Column | Constraint |
|--------|------------|
| `conversation_id` | FK to conversations |
| `sender_id` | Must equal `auth.uid()` on insert |
| `body` | 1–4000 characters |
| `type` | `'text'` only |
| `created_at` | Auto |

### RLS: who can message?

**SELECT** — user is participant in parent conversation.

**INSERT** — all required:
1. `auth.uid() = sender_id`
2. User is conversation participant
3. `friendships.status = 'accepted'` between the two users

## Realtime design

| Property | Value |
|----------|-------|
| Channel name | `messages:{conversationId}` |
| Event type | `postgres_changes` |
| Table | `public.messages` |
| Filter | `conversation_id=eq.{uuid}` |
| Events listened | `INSERT` only |
| Cleanup | `removeChannel` on unmount |

**Not used today:** Broadcast channels, presence, typing, read receipts.

## Navigation path

```
/home (contacts, sorted by last_message_at)
  └── Link → /chat/{conversationId}
        └── AppShell title = friend display_name
        └── ChatView
```

Contact without `conversationId` links to `/friends/add` (edge case if trigger failed).

## Known gaps affecting “seamless” chat

| Gap | Impact |
|-----|--------|
| 50-message cap | Older history invisible |
| Sender UI | Fixed — bubble from INSERT response (see [troubleshooting.md](./troubleshooting.md)) |
| Receiver Realtime | Still depends on Realtime; verify publication if receiver stale |
| No reconnect handling | Subscription drop not explicitly recovered |
| No duplicate-send guard | Double-click Send can insert twice |
| No empty-message feedback | Whitespace-only submit silently ignored |
| Sender sees own message via realtime | INSERT triggers realtime to sender too; dedup prevents double if same id |

## Related docs

- Feature spec: [../../features/realtime-chat.md](../../features/realtime-chat.md)
- Data model: [../../features/data-model-and-security.md](../../features/data-model-and-security.md)
- Phase 1 improvements: [../../plans/phase1/end-to-end-chat.md](../../plans/phase1/end-to-end-chat.md)