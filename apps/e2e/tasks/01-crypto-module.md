# Task 01 — Crypto Module (ECDH + AES-GCM)

## Goal

Implement X25519 Diffie-Hellman key agreement and message encryption in `packages/core`.

## Subtasks

### 1.1 Identity key generation

- [ ] `generateIdentityKeyPair()` → `{ publicKey, privateKey }` (X25519)
- [ ] Serialize pubkey as `bytea`-compatible `Uint8Array`
- [ ] Store/load helpers for Web Crypto `CryptoKey` objects

### 1.2 ECDH + CK derivation

- [ ] `deriveSharedSecret(myPrivate, peerPublic)` via X25519
- [ ] `deriveConversationKey(shared, conversationId, peerKeyGeneration)` via HKDF-SHA256
- [ ] Deterministic test vectors (unit tests)

### 1.3 Message encrypt/decrypt

- [ ] `encryptMessage(ck, plaintext, aad)` → `{ ciphertext, nonce }`
- [ ] `decryptMessage(ck, ciphertext, nonce, aad)` → plaintext
- [ ] AAD format: `conversationId || senderId || messageId || type || senderKeyGeneration`
- [ ] Reject decrypt on auth tag failure (no silent corruption)

### 1.4 Peer key lookup abstraction

- [ ] `PeerKeyProvider` interface: `getPeerPublicKeys(userId): Promise<PeerKey[]>`
- [ ] v1 implementation returns single key from `user_crypto_keys`
- [ ] v2-ready: interface supports multiple keys per user

### 1.5 Types

- [ ] `EncryptedEnvelope`, `IdentityKeyPair`, `ConversationKeyMaterial` in `packages/core/src/types.ts`

## Files

| File | Action |
|------|--------|
| `packages/core/src/crypto/identity.ts` | Create |
| `packages/core/src/crypto/conversation-key.ts` | Create |
| `packages/core/src/crypto/message.ts` | Create |
| `packages/core/src/crypto/index.ts` | Create |
| `packages/core/src/crypto/*.test.ts` | Create |
| `packages/core/src/index.ts` | Export crypto module |

## Exit criteria

- [ ] Unit tests pass for encrypt/decrypt roundtrip
- [ ] Unit tests pass for CK derivation determinism
- [ ] No private keys in any server-facing code paths
- [ ] `pnpm test` passes in `packages/core`

## Notes

- Use Web Crypto API; add `@noble/curves` only if X25519 unavailable in target browsers
- Never derive `IK` from OAuth tokens