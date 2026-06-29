# Task 00 — Purge Legacy Data + New Schema

## Goal

Remove all server-stored plaintext chat history and add the E2EE schema. No migration, no import.

## Subtasks

### 0.1 Migration: `user_crypto_keys`

- [ ] Create `user_crypto_keys` table (pubkey only)
- [ ] RLS: users can read all pubkeys; users can upsert own row only
- [ ] Index on `key_generation` for change detection

### 0.2 Migration: `message_envelopes`

- [ ] Create `message_envelopes` table (ciphertext relay)
- [ ] RLS: sender can insert; recipient can select + delete (ACK)
- [ ] Index on `(recipient_id, created_at)` for pending fetch
- [ ] Index on `expires_at` for cleanup cron
- [ ] Add to `supabase_realtime` publication

### 0.3 Migration: `message_attachments`

- [ ] Create `message_attachments` table
- [ ] RLS: participants can select metadata; inserts via service role API only
- [ ] Index on `expires_at`

### 0.4 Migration: single-device session columns

- [ ] Add `session_version`, `active_device_id`, `active_session_at` to `profiles`
- [ ] Enable Realtime on `profiles` (if not already) for session listener

### 0.5 Migration: private storage bucket

- [ ] Create `chat-media-private` bucket (public: false)
- [ ] No direct client storage policies — API-only access

### 0.6 Legacy purge migration

- [ ] `DELETE FROM messages`
- [ ] `DELETE FROM message_hides` (if messages gone)
- [ ] SQL or script note to empty `chat-media` bucket via dashboard/cron
- [ ] Deprecate `latest_message_previews` RPC (drop or return empty)

## Files

| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDD_e2ee_schema.sql` | Create |
| `supabase/migrations/YYYYMMDD_e2ee_purge_legacy.sql` | Create |

## Exit criteria

- [ ] Migrations apply cleanly on fresh and existing DBs
- [ ] `messages` table empty after purge migration
- [ ] New tables have RLS enabled
- [ ] `message_envelopes` publishes to Realtime

## Notes

- Keep `conversations`, `friendships`, `profiles` unchanged (social graph stays server-side)
- Design `user_crypto_keys` so v2 can become `user_devices` without breaking v1 clients