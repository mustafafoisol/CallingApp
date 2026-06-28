# Onboarding & Profiles

First-time setup: choose a display name and receive a unique shareable public ID.

## User flow

```mermaid
flowchart LR
  A[Google sign-in] --> B{Profile complete?}
  B -->|No public_id or display_name| C[/onboarding]
  C --> D[Enter display name]
  D --> E[POST /api/profile/onboarding]
  E --> F[Show generated public ID]
  F --> G[/home]
  B -->|Complete| G
```

## Profile model

| Field | Set when | Mutable | Notes |
|-------|----------|---------|-------|
| `id` | Signup (trigger) | No | FK to `auth.users` |
| `display_name` | Onboarding | Yes (settings) | 2–32 characters |
| `public_id` | Onboarding | No (currently) | 8-char alphanumeric, unique |
| `avatar_url` | — | — | Column exists; no UI yet |
| `last_seen_at` | — | — | Column exists; **intentionally unused** — [disable-presence.md](../plans/phase2/disable-presence.md) |
| `created_at` | Signup | No | Auto |

## Public ID generation

Algorithm lives in `packages/core/src/public-id.ts`:

- **Charset:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes ambiguous `0`, `O`, `I`, `1`)
- **Default length:** 8 characters
- **Validation:** 6–12 chars, uppercase alphanumeric

Uniqueness enforced by `generateUniquePublicId()` in `apps/web/src/lib/profile.ts`:

1. Generate candidate ID.
2. Check `profiles.public_id` for collision (up to 10 attempts).
3. Throw if all attempts collide.

## File map

| File | Role |
|------|------|
| `apps/web/src/app/onboarding/page.tsx` | Onboarding page shell |
| `apps/web/src/app/onboarding/onboarding-form.tsx` | Form + success state showing public ID |
| `apps/web/src/app/api/profile/onboarding/route.ts` | Creates display name + public ID |
| `apps/web/src/lib/profile.ts` | `generateUniquePublicId`, re-exports validators |
| `packages/core/src/public-id.ts` | `generatePublicId`, `isValidPublicId`, `normalizePublicId` |
| `apps/web/src/lib/supabase/middleware.ts` | Redirects incomplete profiles to `/onboarding` |

## API: POST `/api/profile/onboarding`

**Auth:** Required (session cookie)

**Request body:**
```json
{ "displayName": "Alex" }
```

**Validation:**
- `displayName` trimmed, length 2–32

**Response (200):**
```json
{ "publicId": "CA7K9M2X" }
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 401 | Not authenticated |
| 400 | Invalid display name length |
| 500 | DB update failed |

**Side effects:**
- Updates `profiles` row for current user with `display_name` and `public_id`.

## Database trigger

On `auth.users` INSERT → `handle_new_user()` inserts stub `profiles(id)` row. Onboarding fills in the remaining fields.

## Extension hooks

| Future need | See plan |
|-------------|----------|
| Avatar upload | [avatars-and-presence.md](../plans/phase2/avatars-and-presence.md) |
| Custom public ID | New validation + uniqueness check on onboarding |
| Username change for public_id | Migration + settings UI + friend lookup update |