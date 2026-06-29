# Task 04 — Encrypted Relay (Send / Receive)

## Goal

Replace plaintext `messages` INSERT with encrypted `message_envelopes` relay. Peers decrypt and store locally.

## Subtasks

### 4.1 Publish identity key on login

- [ ] After vault init: upsert `user_crypto_keys` with `IK_pub`, `key_generation`
- [ ] On new device (no local IK): generate new pair, increment `key_generation`

### 4.2 Key exchange on friendship

- [ ] Hook after friendship accept: fetch peer pubkey, derive CK, pin TOFU
- [ ] Hook on app load: derive CK for all accepted friends with conversations
- [ ] Block send (or queue) until CK ready for conversation

### 4.3 Send path

- [ ] Optimistic local insert (plaintext in vault)
- [ ] Encrypt message with CK
- [ ] INSERT `message_envelopes` (ciphertext, nonce, sender_key_generation)
- [ ] On confirm: mark message confirmed in vault
- [ ] On failure: mark failed in vault (reuse `optimistic.ts` patterns)

### 4.4 Receive path

- [ ] Realtime `INSERT` on `message_envelopes` where `recipient_id = me`
- [ ] Lookup CK by `sender_key_generation`
- [ ] Decrypt → insert into vault
- [ ] DELETE envelope (ACK) after successful decrypt
- [ ] Dedupe by `message.id`

### 4.5 Offline catch-up

- [ ] On app open: `SELECT` pending envelopes for `recipient_id = me`
- [ ] Process same as receive path
- [ ] Skip envelopes past `expires_at`

### 4.6 Outbox retry

- [ ] Failed sends stay in `outbox` store
- [ ] Retry on reconnect with same `message.id` (idempotent)

### 4.7 Key rotation handling

- [ ] On peer `key_generation` bump (Realtime `user_crypto_keys`): derive new CK, keep old
- [ ] Show "security code changed" banner
- [ ] Decrypt failure → refetch pubkey → retry with correct CK

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/e2ee/send.ts` | Create |
| `apps/web/src/lib/e2ee/receive.ts` | Create |
| `apps/web/src/lib/e2ee/key-exchange.ts` | Create |
| `apps/web/src/lib/e2ee/envelope.ts` | Create |
| `apps/web/src/lib/e2ee/outbox.ts` | Create |

## Exit criteria

- [ ] Text message roundtrip: sender encrypts, recipient decrypts, both have local copy
- [ ] Server `message_envelopes` row deleted after ACK
- [ ] No plaintext in envelope table
- [ ] Offline recipient receives messages on next open (within TTL)
- [ ] Duplicate Realtime events do not create duplicate messages

## Notes

- Do not write to `messages.body` for new traffic
- `conversations.last_message_at` may still update via trigger on envelope insert (timestamp only) or client-local only