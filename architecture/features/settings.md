# Settings

View and edit profile, copy public ID, and sign out.

## User flow

```mermaid
flowchart LR
  A[/settings] --> B[Load profile SSR]
  B --> C[SettingsForm]
  C --> D[Edit display name → PATCH /api/profile]
  C --> E[Copy public ID to clipboard]
  C --> F[Log out → signOut → /login]
```

## File map

| File | Role |
|------|------|
| `apps/web/src/app/(app)/settings/page.tsx` | SSR: load `display_name`, `public_id` |
| `apps/web/src/app/(app)/settings/settings-form.tsx` | Client form + logout |
| `apps/web/src/app/api/profile/route.ts` | PATCH handler for display name |

## Settings form fields

| Field | Editable | Action |
|-------|----------|--------|
| Public ID | Read-only | Copy button → `navigator.clipboard.writeText` |
| Display name | Yes | Save → `PATCH /api/profile` |

## API: PATCH `/api/profile`

**Auth:** Required

**Request:**
```json
{ "displayName": "Alex" }
```

**Validation:** Trimmed length 2–32 (same as onboarding).

**Response (200):**
```json
{ "ok": true }
```

**Side effects:** Updates `profiles.display_name` for current user only (RLS).

## Logout

Client-side only:
```typescript
await supabase.auth.signOut();
router.push("/login");
router.refresh();
```

Clears session cookies via Supabase client.

## Extension hooks

| Future need | Approach |
|-------------|----------|
| Avatar change | Settings upload + `profiles.avatar_url` update |
| Account deletion | New destructive API route + confirmation modal |
| Theme toggle | Persist preference in localStorage or profile |
| Notification prefs | See [notifications.md](../plans/phase3/notifications.md) |