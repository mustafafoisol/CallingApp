# E2EE Manual Testing Guide

Step-by-step manual tests for end-to-end encrypted local chat. Run with **two browsers** (or one normal window + one incognito).

**Prerequisites:** Tasks 04 (relay) and 05 (UI rewire) must be wired before most cases pass end-to-end. Cases marked **(libs only)** can be verified via unit tests or direct API calls today.

---

## Setup (do once per session)

### 1. Apply schema (not in this guide — ops)

Ensure migrations `20250628150001_e2ee_schema.sql` and `20250628150002_e2ee_purge_legacy.sql` are applied. Empty legacy `chat-media` bucket via Supabase dashboard if upgrading an existing project.

### 2. Start the app

```bash
pnpm dev
```

Open http://localhost:3000

### 3. Create User A and User B

| Step | Action | Expected |
|------|--------|----------|
| 1 | Browser 1 → Google login → onboard as `Alice` | Public ID shown |
| 2 | Browser 2 → Google login → onboard as `Bob` | Public ID shown |
| 3 | Alice adds Bob; Bob accepts | Both appear in contacts |

---

## P0 — Core messaging

### TC-01 Send and receive text (E2EE)

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Open chat with Bob → send `Hello E2EE` | Message appears in Alice's thread |
| 2 | Bob | Chat with Alice (already open or open now) | Same message appears decrypted |
| 3 | Ops | Inspect `message_envelopes` in Supabase | Row deleted after Bob ACKs (or empty while online) |
| 4 | Ops | Inspect `messages` table | **No new plaintext rows** |

### TC-02 Offline catch-up

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Bob | Close browser / go offline | — |
| 2 | Alice | Send `While you were away` | Envelope remains until Bob returns |
| 3 | Bob | Reopen app within 7 days | Message decrypted into vault; envelope deleted |

### TC-03 Refresh preserves local history

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Send several messages | Visible in thread |
| 2 | Alice | Hard refresh `/chat/:id` | Same messages load from IndexedDB (brief skeleton OK) |
| 3 | Ops | Network tab | **No** fetch of plaintext message bodies from Postgres |

---

## P0 — Session and vault lifecycle

### TC-04 Logout wipes vault

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Send messages in a thread | History visible |
| 2 | Alice | Settings → Log out | Redirect to login |
| 3 | Alice | DevTools → Application → IndexedDB | `callingapp-vault-{userId}` **gone** |
| 4 | Alice | Log in again → open same chat | Empty thread (no server history) |

### TC-05 New device replaces old device

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Logged in on Browser 1 with messages | Vault populated |
| 2 | Alice | Log in on Browser 2 (incognito) | Login succeeds |
| 3 | Browser 1 | Within seconds | Redirect to login (`session_replaced`); vault wiped |
| 4 | Browser 2 | Open chat | Empty vault; new `key_generation` on server |
| 5 | Bob | Send message to Alice | Decrypts on Browser 2 with new CK |

### TC-06 Same device, multiple tabs

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Open `/home` in two tabs | Both stay logged in |
| 2 | Alice | Send from tab 1 | Tab 2 sidebar/thread updates (vault sync) |

---

## P1 — Crypto and trust

### TC-07 Security code changed (key rotation)

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Log in on new device (bumps `key_generation`) | — |
| 2 | Bob | Open chat with Alice | Banner: peer security code changed |
| 3 | Bob | Send message | Uses new CK; old envelopes with prior generation still decrypt if cached |

### TC-08 Decrypt failure placeholder

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Ops | Corrupt one envelope ciphertext in DB | — |
| 2 | Recipient | Receive envelope | UI shows "Unable to decrypt" — app does not crash |

### TC-09 Duplicate Realtime events

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Bob | Receive same envelope INSERT twice | Single message in vault (dedupe by `message.id`) |

---

## P1 — Images (when task 06 ships)

### TC-10 Send and receive encrypted image

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Attach image → send | Optimistic preview; Bob receives decrypted image |
| 2 | Ops | Storage `chat-media-private` | Ciphertext only — no public URL in message data |
| 3 | Ops | `message_attachments.expires_at` | ~24h from upload |

### TC-11 Image expired on server

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Ops | Set `expires_at` in past or wait 24h+ | — |
| 2 | Bob | Open chat (no local cache) | "Image expired" placeholder |
| 3 | Bob | Had cached blob from earlier view | Still shows from `attachments_cache` until logout |

---

## P2 — Edge cases

### TC-12 Envelope TTL exceeded

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Ops | Envelope with `expires_at` in past | Skipped on catch-up; not inserted into vault |
| 2 | Recipient | — | Message never delivered (acceptable v1 loss) |

### TC-13 Failed send retry (outbox)

| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Alice | Go offline → send message | Pending state; row in vault `outbox` |
| 2 | Alice | Back online | Retry inserts envelope; outbox cleared |

---

## Unit test fallback (current milestone)

Until UI is wired, verify library layers:

```bash
pnpm test
```

| Area | Test file |
|------|-----------|
| Crypto roundtrip | `packages/core/src/crypto/crypto.test.ts` |
| Vault CRUD | `apps/web/src/lib/vault/store.test.ts` |

---

## Sign-off checklist

- [ ] TC-01 Send/receive
- [ ] TC-02 Offline catch-up
- [ ] TC-04 Logout wipe
- [ ] TC-05 Session replace
- [ ] TC-06 Multi-tab same device
- [ ] TC-10 Image roundtrip (when shipped)
- [ ] TC-11 Image expiry (when shipped)