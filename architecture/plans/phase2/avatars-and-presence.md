# Plan: Avatars & Presence

Profile photos and online/last-seen indicators.

## Phase

**Phase 2** — Medium effort; schema partially ready.

## Current state

- `profiles.avatar_url` column exists
- `profiles.last_seen_at` column exists
- Neither is read or written by application code

## Scope

### Avatars
- Supabase Storage bucket `avatars` (public read, authenticated write own)
- Upload flow in Settings: pick image → crop (optional) → upload → save URL to profile
- Display avatar on contacts list, chat header, friend lookup
- Fallback: initials circle from `display_name`

### Presence
- Update `last_seen_at` on app focus / periodic heartbeat (every 60s while active)
- Middleware or client hook: `PATCH` profile timestamp
- Home contacts: show "Online" if `last_seen_at` within 5 minutes, else relative time

### Out of scope
- Real-time presence via Supabase Presence API (can add later)
- Avatar moderation

## Implementation

### Migration

```sql
-- Storage policies (via Supabase dashboard or migration)
-- Bucket: avatars, path: {user_id}/avatar.webp

-- Optional: index for presence queries
create index profiles_last_seen_idx on public.profiles (last_seen_at desc);
```

### API

`PATCH /api/profile` — extend body:
```json
{ "displayName": "Alex", "avatarUrl": "https://..." }
```

Or dedicated `POST /api/profile/avatar` for upload handling.

### New files

| File | Purpose |
|------|---------|
| `apps/web/src/components/avatar.tsx` | Reusable avatar with fallback |
| `apps/web/src/lib/presence.ts` | Heartbeat hook |
| `apps/web/src/app/api/profile/avatar/route.ts` | Upload handler (optional) |

### Touch existing

| File | Change |
|------|--------|
| `settings-form.tsx` | Avatar upload UI |
| `home/page.tsx` | Show avatar + last seen |
| `chat/[id]/page.tsx` | Avatar in header |

## Acceptance criteria

- [ ] User can upload and change avatar
- [ ] Avatar displays on contacts and chat
- [ ] `last_seen_at` updates while app is active
- [ ] Contacts show online/offline indicator
- [ ] RLS prevents uploading to another user's path

## Dependencies

None.

## Estimated effort

**2–3 days**