# Plan: Blocking & Moderation

Expose block management and prevent blocked users from interacting.

## Phase

**Phase 2** — Small effort; partial backend exists.

## Current state

- Rejecting a friend request sets `friendships.status = 'blocked'`
- No UI to view blocked users or unblock
- Blocked users may still appear in lookup (shows existing friendship status)
- RLS on messages requires `accepted` friendship — blocked users cannot message (good)
- No way to block an already-accepted friend

## Scope

### In scope
- Settings section: "Blocked users" list
- Unblock action → delete friendship row or new `declined` status (recommend delete)
- Block accepted friend → update status to `blocked`, hide from contacts
- Prevent sending requests to/from blocked pairs
- Update lookup API to return clear `blocked` state

### Out of scope
- Report user / admin moderation
- Message content filtering

## Implementation

### API additions

`POST /api/friends/block`
```json
{ "targetUserId": "uuid" }
```
- If friendship exists: set `blocked`
- If not: insert with requester = me, `blocked` (or use a dedicated `blocks` table)

`POST /api/friends/unblock`
```json
{ "friendshipId": "uuid" }
```
- Delete friendship row

### UI

`apps/web/src/app/(app)/settings/blocked-users.tsx`:
- Query friendships where `status = 'blocked'` and user is participant
- Show other user's name + Unblock button

`add-friend-form.tsx`:
- If `friendship.status === 'blocked'`, show "Blocked" instead of send request

### Home page

Filter out `blocked` friendships from contacts (already only shows `accepted`).

### RLS review

Ensure blocked users cannot INSERT messages — current policy checks `accepted` only. ✓

## Acceptance criteria

- [ ] User can block an accepted friend
- [ ] Blocked users disappear from contacts
- [ ] Blocked user cannot send messages
- [ ] User can view and unblock from settings
- [ ] Re-adding after unblock works via normal friend flow

## Dependencies

None.

## Estimated effort

**4–8 hours**