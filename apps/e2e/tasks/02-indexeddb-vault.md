# Task 02 — IndexedDB Vault

## Goal

Local encrypted-at-rest-by-obscurity vault holding decrypted messages, keys, and sidebar state. Wiped on logout.

## Subtasks

### 2.1 Dexie schema

- [ ] Database: `callingapp-vault-{userId}`
- [ ] Stores: `device_identity`, `crypto_material`, `trusted_pubkeys`, `messages`, `conversations`, `outbox`, `attachments_cache`, `message_hides`
- [ ] Indexes: `messages[conversationId+createdAt]`, `messages[conversationId+id]`

### 2.2 Vault API

- [ ] `openVault(userId)` / `closeVault()` / `wipeVault()`
- [ ] `storeIdentityKey(pair)` / `getIdentityKey()`
- [ ] `storeConversationKey(conversationId, generation, ck)`
- [ ] `getConversationKey(conversationId, senderKeyGeneration)`
- [ ] `insertMessage(msg)` / `getMessages(conversationId, cursor, limit)`
- [ ] `updateConversation(meta)` / `getConversations()`
- [ ] `addToOutbox(envelope)` / `removeFromOutbox(clientId)`

### 2.3 Live queries

- [ ] `subscribeMessages(conversationId, callback)` for React integration
- [ ] `subscribeConversations(callback)` for sidebar
- [ ] Multi-tab: `BroadcastChannel` or Dexie `liveQuery`

### 2.4 TOFU pubkey pins

- [ ] `pinPeerPubkey(userId, pubkey, generation)`
- [ ] `getPeerPubkey(userId)` — throws if not pinned
- [ ] `detectKeyChange(userId, newPubkey, newGeneration)` → boolean

### 2.5 Login integration stub

- [ ] On first vault open: generate IK if missing, upload pubkey to `user_crypto_keys`
- [ ] On vault open after friendship: derive CK for each conversation

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/vault/schema.ts` | Create |
| `apps/web/src/lib/vault/store.ts` | Create |
| `apps/web/src/lib/vault/wipe.ts` | Create |
| `apps/web/src/lib/vault/index.ts` | Create |
| `apps/web/package.json` | Add `dexie` dependency |

## Exit criteria

- [ ] Vault opens per userId; isolated databases
- [ ] `wipeVault()` deletes entire database
- [ ] Message insert + cursor pagination works
- [ ] Unit tests for vault CRUD (fake-indexeddb or Dexie test harness)

## Notes

- Vault holds **decrypted** data — device security depends on session + single-device enforcement
- No export or backup in v1