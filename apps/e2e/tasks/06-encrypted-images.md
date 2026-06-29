# Task 06 — Encrypted Images + 24h Cron

## Goal

Client-encrypted image upload, private storage, daily cleanup. Server never has decryption keys.

## Subtasks

### 6.1 Client encrypt + upload

- [ ] Reuse `compress-image.ts` for size limit
- [ ] Generate random `AK`; encrypt image bytes with AES-GCM
- [ ] `POST /api/chat/attachments` with ciphertext + metadata
- [ ] Return `{ attachmentId, expiresAt }`

### 6.2 Upload API

- [ ] Auth + conversation participant check
- [ ] Store ciphertext in `chat-media-private` bucket via service role
- [ ] Insert `message_attachments` row with `expires_at = now() + 1 day`
- [ ] No public URL — return attachment ID only

### 6.3 Download API

- [ ] `GET /api/chat/attachments/[id]`
- [ ] Auth + participant check
- [ ] Reject if `expires_at < now()` → 410 Gone
- [ ] Return ciphertext bytes (client decrypts) OR decrypt server-side is **not** E2EE — client must decrypt
- [ ] Correct approach: return ciphertext; client decrypts with `AK` from message payload

### 6.4 Send image message

- [ ] Encrypt `{ ak, attachmentId, mime }` inside message envelope ciphertext
- [ ] Optimistic local preview via `URL.createObjectURL` on decrypted blob
- [ ] Cache decrypted blob in `attachments_cache`

### 6.5 Receive image message

- [ ] Decrypt message → extract `ak`, `attachmentId`
- [ ] Fetch ciphertext from download API
- [ ] Decrypt image → cache in `attachments_cache`
- [ ] Render from local cache

### 6.6 Expired image UX

- [ ] If download returns 410: show "Image expired" placeholder
- [ ] If local cache exists: show from cache (until logout)
- [ ] Label images as ephemeral in compose UI (optional)

### 6.7 Cron cleanup

- [ ] `GET /api/cron/cleanup-attachments` with `CRON_SECRET` auth
- [ ] Batch delete expired `message_attachments` rows + storage objects
- [ ] Add to `vercel.json`: `"schedule": "0 3 * * *"`

### 6.8 Remove legacy upload

- [ ] Deprecate `upload-image.ts` direct public bucket upload
- [ ] Remove public `chat-media` usage from send path

## Files

| File | Action |
|------|--------|
| `apps/web/src/app/api/chat/attachments/route.ts` | Create |
| `apps/web/src/app/api/chat/attachments/[id]/route.ts` | Create |
| `apps/web/src/app/api/cron/cleanup-attachments/route.ts` | Create |
| `apps/web/src/lib/e2ee/attachment.ts` | Create |
| `apps/web/vercel.json` | Add cron |
| `apps/web/src/lib/chat/upload-image.ts` | Replace |

## Exit criteria

- [ ] Image send/receive works with client-side encryption
- [ ] Server storage object deleted within 24h of upload
- [ ] No public image URLs in message data
- [ ] Expired server blob shows graceful UI fallback
- [ ] Cron runs without timeout on reasonable batch sizes

## Notes

- Server-side decrypt in download API would break E2EE — return raw ciphertext
- Text history is permanent local; images are ephemeral server-side by design