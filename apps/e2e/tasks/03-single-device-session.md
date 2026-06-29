# Task 03 — Single-Device Session

## Goal

Enforce one active device per user. New login revokes old device. Old device wipes local vault.

## Subtasks

### 3.1 Device ID

- [ ] `getOrCreateDeviceId()` in `apps/web/src/lib/device-id.ts`
- [ ] Persist in `localStorage` as `callingapp:device_id`
- [ ] Pass to OAuth flow (cookie before redirect)

### 3.2 Auth callback extension

- [ ] After `exchangeCodeForSession`: read `device_id`
- [ ] Service role: bump `session_version`, set `active_device_id`
- [ ] `admin.signOut(userId, 'others')`
- [ ] Set httpOnly cookies: `ca_sv`, `ca_did`
- [ ] Order: exchange → bump → signOut(others) → set cookies

### 3.3 Middleware gate

- [ ] After `getUser()`: fetch `profiles.session_version`, `active_device_id`
- [ ] Compare to `ca_sv`, `ca_did` cookies
- [ ] Mismatch → clear cookies, redirect `/login?reason=session_replaced`

### 3.4 Realtime session listener

- [ ] Subscribe to `profiles` UPDATE for current user
- [ ] If `active_device_id` !== local device_id → `handleSessionReplaced()`
- [ ] Mount in app shell layout

### 3.5 Session replaced handler

- [ ] `purgeLocalData()`: wipe vault, clear `callingapp:*` localStorage (except device_id), revoke object URLs
- [ ] `signOut()` + redirect `/login?reason=session_replaced`
- [ ] Optional modal before redirect

### 3.6 Logout extension

- [ ] Extend `settings-dialog.tsx` logout: call `wipeVault()` + `purgeLocalData()`
- [ ] Optional `POST /api/auth/logout` to clear session cookies

### 3.7 Session boot check

- [ ] `GET /api/auth/session` → `{ valid, sessionVersion, deviceId }` for client hydration

## Files

| File | Action |
|------|--------|
| `apps/web/src/lib/device-id.ts` | Create |
| `apps/web/src/lib/session/purge.ts` | Create |
| `apps/web/src/lib/session/listener.ts` | Create |
| `apps/web/src/app/auth/callback/route.ts` | Modify |
| `apps/web/src/lib/supabase/middleware.ts` | Modify |
| `apps/web/src/components/settings/settings-dialog.tsx` | Modify |
| `apps/web/src/app/api/auth/session/route.ts` | Create |
| `apps/web/src/app/api/auth/logout/route.ts` | Create |

## Exit criteria

- [ ] Login on device B invalidates device A within seconds (Realtime) or next navigation (middleware)
- [ ] Device A cannot call protected APIs after invalidation
- [ ] Logout wipes IndexedDB vault
- [ ] Same device, multiple tabs: not falsely invalidated

## Notes

- JWT may remain valid ~1h — cookie gate is mandatory, not optional
- Do not call global `signOut()` before new session is established