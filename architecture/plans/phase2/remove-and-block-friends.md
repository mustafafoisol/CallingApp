# Plan: Remove Friend & Block Friend

Let users end friendships or block other users with distinct behavior. Messaging remains gated on an **accepted** friendship only.

## Phase

**Phase 2** — Medium effort; partial backend exists (`friendships.status = 'blocked'` on reject only).

## Product rules

| Action | Contacts list | Lookup by public ID | Send friend request | Send messages |
|--------|---------------|---------------------|---------------------|---------------|
| **Remove friend** | Hidden | ✅ Finder still sees profile | ✅ Can request again | ❌ Until re-accepted |
| **Block friend** | Hidden | ❌ Blocked user gets "not found" | ❌ | ❌ |

### Remove friend

- Ends an **accepted** friendship only.
- The removed user **can still look you up** by your public ID and send a new friend request.
- Existing conversation row and message history **remain** in the database (optional: hide thread from home until re-friended).
- No new messages until friendship is **accepted** again (already enforced by RLS).

### Block friend

- The blocked user **cannot find you at all** via public ID lookup (API returns `404 User not found` — same as unknown ID, no leak).
- The blocked user **cannot** send friend requests or messages.
- Block is **directional**: only the blocker hides from the blocked party. The blocker may still look up the blocked user (e.g. to manage the block list).
- Blocking deletes or supersedes any existing friendship row between the pair.

### Messaging gate (unchanged principle, explicit in UI)

Messages may be sent **only** when `friendships.status = 'accepted'` for the conversation participants. Compose bar and send API must stay disabled / rejected otherwise.

## Current state

| Area | Today |
|------|-------|
| Remove accepted friend | ❌ No UI or API |
| Block accepted friend | ❌ No UI or API |
| Reject pending request | Sets `friendships.status = 'blocked'` (conflates reject with block) |
| Lookup | Always returns profile if public ID exists |
| Message RLS | ✅ Requires `accepted` friendship |
| Home contacts | Shows `accepted` only |

## Scope

### In scope

- `blocks` table for directional hide-from-lookup semantics
- `POST /api/friends/remove` — end accepted friendship
- `POST /api/friends/block` — block user + end friendship
- `POST /api/friends/unblock` — lift block
- `GET /api/friends/blocked` — list users I have blocked
- Lookup + request APIs respect blocks
- Settings / chat header / contact detail: Remove and Block actions with confirmation
- Migrate **reject** flow: delete pending row or set `declined` (not `blocked`) so reject ≠ block
- UI copy when messaging unavailable: "Add as friend to send messages"

### Out of scope

- Report user / admin moderation
- Auto-delete message history on remove (history kept by default)
- Mutual / bidirectional block visibility for blocker

## Data model

### New table: `blocks`

```sql
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_no_self check (blocker_id <> blocked_id),
  constraint blocks_unique_pair unique (blocker_id, blocked_id)
);

create index blocks_blocked_id_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- Blocker can read and manage own blocks
create policy "blocks_select_blocker"
  on public.blocks for select to authenticated
  using (auth.uid() = blocker_id);

create policy "blocks_insert_blocker"
  on public.blocks for insert to authenticated
  with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

create policy "blocks_delete_blocker"
  on public.blocks for delete to authenticated
  using (auth.uid() = blocker_id);
```

Blocked users do **not** get SELECT on `blocks` (they should not learn they are blocked).

### Friendship status cleanup (optional migration)

Add `declined` for rejected pending requests; stop using `blocked` on `friendships`:

```sql
alter table public.friendships
  drop constraint if exists friendships_status_check;

alter table public.friendships
  add constraint friendships_status_check
  check (status in ('pending', 'accepted', 'declined'));
```

Reject handler: `DELETE` pending row **or** `UPDATE status = 'declined'`. Prefer **delete** to allow immediate re-request unless product wants a cooldown.

### Conversation on remove

Keep `conversations` row. Home query joins `accepted` friendships only, so thread disappears from list. Re-accepting recreates or reuses conversation via existing `handle_friendship_accepted` trigger.

## API design

### `POST /api/friends/remove`

**Request:**
```json
{ "friendshipId": "uuid" }
```

**Behavior:**
1. Verify caller is participant and `status = 'accepted'`.
2. `DELETE` friendship row (or soft-delete with `removed` if audit needed — default: hard delete).
3. Do **not** insert into `blocks`.

**Response:** `{ "ok": true }`

**Errors:** 401, 403, 404

---

### `POST /api/friends/block`

**Request:**
```json
{ "targetUserId": "uuid" }
```

**Behavior:**
1. `INSERT INTO blocks (blocker_id, blocked_id)` ON CONFLICT DO NOTHING.
2. Delete any `friendships` row between the pair (any status).

**Response:** `{ "ok": true }`

---

### `POST /api/friends/unblock`

**Request:**
```json
{ "blockId": "uuid" }
```
or `{ "targetUserId": "uuid" }`

**Behavior:** Delete block row where `blocker_id = auth.uid()`.

**Response:** `{ "ok": true }`

---

### `GET /api/friends/blocked`

**Response:**
```json
{
  "blocks": [
    {
      "blockId": "uuid",
      "profile": { "id": "uuid", "public_id": "CA7K9M2X", "display_name": "Alex", "avatar_url": null }
    }
  ]
}
```

---

### Update `GET /api/friends/lookup`

After resolving profile by `public_id`, before returning 200:

```sql
-- If profile owner has blocked the searcher, pretend user does not exist
exists (
  select 1 from public.blocks
  where blocker_id = :profile_id
    and blocked_id = :auth_uid
)
```

If true → `404 User not found` (same body as unknown ID).

Also return `friendship` state when visible (pending / accepted / null). Never expose block status to the blocked party.

---

### Update `POST /api/friends/request`

Before insert:

1. If target has blocked requester → `404` or `403` (prefer `404` for consistency).
2. If requester has blocked target → `400` "Unblock this user first" (blocker-initiated edge case).
3. If `declined` / deleted row → allow new pending request.

## UI

| Location | Control |
|----------|---------|
| Settings → Blocked users | List + Unblock |
| Chat header ⋮ menu | Remove friend, Block |
| Contact / friend profile sheet | Remove friend, Block |
| Add friend form | If prior remove: show Send request; blocked party never reaches this screen for blocker |
| Chat compose | Disabled + hint when friendship not accepted |

**Confirmation modals:**

- Remove: "Remove [name]? They can still find you by your user ID and send a new request."
- Block: "Block [name]? They won't be able to find you or message you."

## Security checklist

- [ ] Blocked user cannot SELECT blocker's profile via lookup API
- [ ] Blocked user cannot INSERT friendship toward blocker
- [ ] Message INSERT policy still requires `accepted` friendship
- [ ] RLS on `blocks` — only blocker reads/writes own rows
- [ ] No error messages that confirm "you are blocked"

## Acceptance criteria

- [ ] User can remove an accepted friend; contact disappears from home
- [ ] Removed user can still lookup blocker by public ID and send a new request
- [ ] Removed users cannot send messages until re-accepted
- [ ] User can block an accepted friend (or any user from lookup)
- [ ] Blocked user receives 404 on lookup of blocker
- [ ] Blocked user cannot send requests or messages to blocker
- [ ] User can view blocked list and unblock from settings
- [ ] Rejecting a pending request does **not** apply block semantics

## Dependencies

None (can ship before profile pictures).

## Estimated effort

**1–2 days**