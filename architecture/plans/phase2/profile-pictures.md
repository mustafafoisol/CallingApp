# Plan: Profile Pictures

Upload and display user profile photos with a **100 KB** size cap. Larger files are rejected with a clear message.

## Phase

**Phase 2** — Medium effort; `profiles.avatar_url` column already exists.

## Product rules

- Users may upload **one** profile picture (replace on re-upload).
- **Maximum file size: 100 KB.** Files over 100 KB are rejected — do not upload, show: *"Please upload a smaller file (max 100 KB)."*
- Allowed types: **JPEG**, **PNG**, **WebP** (validate MIME + magic bytes server-side).
- Fallback when no picture: initials avatar (existing `ChatAvatar` behavior).

## Storage architecture

### Where files live: Supabase Storage

| Setting | Value |
|---------|-------|
| Bucket name | `avatars` |
| Path pattern | `{user_id}/avatar.{ext}` |
| Public read | ✅ Yes (public bucket or signed URLs with long TTL — prefer **public bucket** for simple `<img src>`) |
| Write | Authenticated user only, own folder |
| Max object size | **102400 bytes (100 KB)** — enforced in bucket policy + API |
| Overwrite | Upsert on same path |

```text
supabase storage
└── avatars/
    └── {user_id}/
        └── avatar.webp   (or .jpg / .png)
```

### Why Supabase Storage (not DB blob)

- `profiles.avatar_url` stores only a **text URL** — keeps Postgres rows small and cache-friendly.
- CDN-backed delivery; images served without hitting app servers.
- RLS-style storage policies restrict writes to `{user_id}/*`.

### Bucket policies (migration or dashboard)

```sql
-- Create bucket (via Supabase SQL or dashboard)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  102400,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Authenticated users upload only to their folder
create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read
create policy "avatars_select_public"
  on storage.objects for select to public
  using (bucket_id = 'avatars');
```

## Database

### Column (already exists)

| Column | Type | Purpose |
|--------|------|---------|
| `profiles.avatar_url` | `text` nullable | Public URL to current avatar in Storage |

No separate `avatars` table for v1 — one URL per profile is enough.

### Optional future columns (out of scope v1)

| Column | Purpose |
|--------|---------|
| `avatar_updated_at` | Cache busting |
| `avatar_storage_path` | Internal path if switching to signed URLs |

### Save flow

1. Client picks file → validate size ≤ 100 KB and type locally.
2. `POST /api/profile/avatar` (multipart) or client uploads via Supabase client then `PATCH /api/profile`.
3. Server re-validates size, type, dimensions (optional max 512×512).
4. Upload to `avatars/{user_id}/avatar.{ext}`.
5. `UPDATE profiles SET avatar_url = :public_url WHERE id = auth.uid()`.
6. Return `{ "avatarUrl": "https://..." }`.

On delete avatar: remove storage object + set `avatar_url = null`.

## API

### `POST /api/profile/avatar`

**Auth:** Required  
**Body:** `multipart/form-data`, field `file`

**Validation:**

| Check | Error |
|-------|-------|
| Missing file | 400 |
| `file.size > 102400` | 400 `"Please upload a smaller file (max 100 KB)."` |
| Invalid MIME | 400 `"Unsupported image type."` |

**Response (200):**
```json
{ "avatarUrl": "https://<project>.supabase.co/storage/v1/object/public/avatars/<user_id>/avatar.webp" }
```

### `DELETE /api/profile/avatar`

Removes storage object and clears `profiles.avatar_url`.

### Extend `PATCH /api/profile`

Allow `{ "displayName": "...", "avatarUrl": null }` to clear avatar without delete endpoint (optional).

## Client implementation

### Settings upload UI

`apps/web/src/app/(app)/settings/settings-form.tsx`:

- Avatar preview (image or initials)
- "Change photo" → hidden `<input type="file" accept="image/jpeg,image/png,image/webp" />`
- Client-side size check **before** upload:

```typescript
const MAX_AVATAR_BYTES = 100 * 1024;

if (file.size > MAX_AVATAR_BYTES) {
  setError("Please upload a smaller file (max 100 KB).");
  return;
}
```

- Optional: client-side resize/compress to help users stay under 100 KB (nice-to-have, not required for v1).

### Display surfaces

| Surface | Change |
|---------|--------|
| `ChatAvatar` | Accept `imageUrl?: string \| null`; render `<img>` when set |
| Home `ContactRow` | Pass `friend.avatar_url` |
| Chat header | Friend's `avatar_url` |
| Friend lookup | Show avatar on preview card |
| Settings | Own avatar |

### New / updated files

| File | Purpose |
|------|---------|
| `apps/web/src/app/api/profile/avatar/route.ts` | Upload + validate + storage |
| `apps/web/src/components/avatar.tsx` | Shared avatar (image + initials fallback) — may merge with `chat/avatar.tsx` |
| `apps/web/src/lib/avatar-upload.ts` | Client validation constants + helpers |
| `supabase/migrations/YYYYMMDD_avatars_bucket.sql` | Bucket + policies |

## Image handling notes

- Prefer storing **WebP** after server conversion for smaller size under 100 KB cap (optional optimization).
- If conversion is skipped, store original format when ≤ 100 KB.
- Recommended max dimensions: **256×256** or **512×512** — downscale server-side if larger (keeps quality while respecting size cap).

## Acceptance criteria

- [ ] User can upload JPEG/PNG/WebP ≤ 100 KB from Settings
- [ ] Upload > 100 KB shows: "Please upload a smaller file (max 100 KB)." — no storage write
- [ ] `profiles.avatar_url` updated after successful upload
- [ ] Avatar displays on contacts, chat header, lookup, settings
- [ ] No avatar → initials fallback unchanged
- [ ] User cannot upload to another user's storage path (policy + API)
- [ ] User can remove avatar and revert to initials

## Dependencies

None. Independent of remove/block and presence.

## Estimated effort

**2–3 days**