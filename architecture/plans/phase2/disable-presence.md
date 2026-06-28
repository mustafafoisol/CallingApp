# Plan: Disable Active / Online Status

Do **not** ship online indicators, last-seen labels, or presence heartbeats. Active status is **off** for the foreseeable future.

## Phase

**Phase 2** — Small effort (mostly prevention + cleanup; feature not fully built yet).

## Product decision

| Feature | Status |
|---------|--------|
| Green "online" dot on avatars | ❌ Off |
| "Active now" / "Last seen …" on contacts | ❌ Off |
| `last_seen_at` heartbeat / cron updates | ❌ Off |
| `profiles.last_seen_at` column | Keep in schema, **unused** |

Users should not see whether someone is currently active or when they were last online.

## Current state

| Area | Today |
|------|-------|
| `profiles.last_seen_at` | Column exists; **not** written by app |
| `apps/web/src/app/api/cron/keep-alive` | May touch presence — review and disable presence updates |
| `ChatAvatar` `showOnline` prop | Exists; **not** used in production UI |
| Home `ContactRow` `active` prop | Highlights first row with messages — **not** online status (rename to avoid confusion) |
| Phase 2 `avatars-and-presence.md` | Previously planned presence — **superseded by this doc** |

## Scope

### In scope

- Document explicit **no-presence** policy
- Ensure no new code writes `last_seen_at`
- Remove or never enable `showOnline` on avatars
- Rename `ContactRow` `active` → `highlighted` (or `selected`) — UI selection only, not presence
- Remove `last_seen_at` from home/contacts queries if added later
- Update Phase 2 README exit criteria — presence items **cancelled**

### Out of scope

- Dropping `last_seen_at` column (harmless; may use later)
- Real-time presence via Supabase Presence API

## Implementation checklist

### Do not implement

- Client heartbeat hook updating `last_seen_at`
- Cron job bumping `last_seen_at` on interval
- "Online if seen within 5 minutes" logic
- Green dot on `ChatAvatar`

### Code hygiene

| File | Action |
|------|--------|
| `apps/web/src/components/chat/avatar.tsx` | Remove `showOnline` prop **or** leave prop but never pass `true` (prefer remove in same PR as profile pictures) |
| `apps/web/src/components/contacts/contact-row.tsx` | Rename `active` → `highlighted` |
| `apps/web/src/app/(app)/home/page.tsx` | Update prop name; do not add `last_seen_at` to query |
| `apps/web/src/app/api/cron/keep-alive/route.ts` | Confirm it does not update `last_seen_at`; remove if only purpose was presence |

### Queries

Do **not** select `last_seen_at` for contacts or chat unless a future plan explicitly re-enables presence.

## Acceptance criteria

- [ ] No UI shows online, active, or last-seen status anywhere
- [ ] No application code updates `profiles.last_seen_at`
- [ ] `ChatAvatar` has no visible online indicator
- [ ] Contact row highlight is clearly a list-selection style, not presence
- [ ] Phase 2 exit criteria no longer lists presence features

## Dependencies

None. Can land independently and early.

## Estimated effort

**2–4 hours**

## Future re-enable

If product later wants presence, create a new plan (e.g. `presence-v2.md`) — do not partially ship green dots without an explicit decision.