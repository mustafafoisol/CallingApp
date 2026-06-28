# Friends

Add contacts by public ID, send requests, and accept or reject incoming requests.

## User flow

```mermaid
flowchart TB
  subgraph add [Add Friend — /friends/add]
    A[Enter public ID] --> B[GET /api/friends/lookup]
    B --> C{Found?}
    C -->|Yes| D[Show profile + Send request]
    D --> E[POST /api/friends/request]
    E --> F[Status: pending]
  end

  subgraph pending [Pending Requests]
    G[Load pending where addressee = me] --> H{Action}
    H -->|Accept| I[POST /api/friends/respond action=accept]
    H -->|Reject| J[POST /api/friends/respond action=reject]
    I --> K[Status: accepted]
    J --> L[Status: blocked]
    K --> M[DB trigger creates conversation]
  end
```

## Friendship states

| Status | Meaning | Who can set |
|--------|---------|-------------|
| `pending` | Request sent, awaiting response | Insert on request |
| `accepted` | Mutual contact; can chat | Addressee via accept |
| `blocked` | Rejected request | Addressee via reject |

**Note:** Reject currently sets `blocked`, not a separate "declined" state. There is no UI to unblock or manage blocked users yet.

## Constraints

- Cannot add yourself (`lookup` returns 400).
- One friendship row per ordered pair (`unique(requester_id, addressee_id)`).
- Requester must be the authenticated user on insert (RLS + API).
- Only the addressee can accept/reject a pending request.

## File map

| File | Role |
|------|------|
| `apps/web/src/app/(app)/friends/add/page.tsx` | Add friend page |
| `apps/web/src/app/(app)/friends/add/add-friend-form.tsx` | Lookup + send request UI |
| `apps/web/src/app/(app)/friends/add/pending-requests.tsx` | Incoming pending list |
| `apps/web/src/app/api/friends/lookup/route.ts` | Find user by public ID |
| `apps/web/src/app/api/friends/request/route.ts` | Create pending friendship |
| `apps/web/src/app/api/friends/respond/route.ts` | Accept or reject |
| `apps/web/src/lib/friends.ts` | Shared TypeScript interfaces |

## API: GET `/api/friends/lookup?publicId=CA7K9M2X`

**Auth:** Required

**Response (200):**
```json
{
  "profile": {
    "id": "uuid",
    "public_id": "CA7K9M2X",
    "display_name": "Alex",
    "avatar_url": null
  },
  "friendship": { "id": "uuid", "status": "pending" }
}
```

`friendship` is `null` if no existing relationship.

**Errors:** 400 (invalid format, self-lookup), 401, 404 (user not found)

## API: POST `/api/friends/request`

**Request:**
```json
{ "targetUserId": "uuid" }
```

**Response (200):**
```json
{ "friendshipId": "uuid" }
```

**Errors:** 400 (invalid target), 401, 409 (friendship already exists)

## API: POST `/api/friends/respond`

**Request:**
```json
{ "friendshipId": "uuid", "action": "accept" }
```

`action` is `"accept"` or `"reject"`.

**Response (200):**
```json
{ "ok": true, "status": "accepted" }
```

**Errors:** 400, 401, 403 (not addressee), 409 (already handled)

## Conversation auto-creation

When friendship status transitions to `accepted`, trigger `handle_friendship_accepted()`:

1. Canonicalize participant UUIDs (`user_a_id < user_b_id`).
2. `INSERT INTO conversations` with `ON CONFLICT DO NOTHING`.

See [data-model-and-security.md](./data-model-and-security.md).

## RLS summary

| Operation | Rule |
|-----------|------|
| SELECT | Participant in friendship |
| INSERT | `auth.uid() = requester_id` |
| UPDATE | Participant in friendship |

## Extension hooks

| Future need | See plan |
|-------------|----------|
| Block list UI | [blocking-and-moderation.md](../plans/phase2/blocking-and-moderation.md) |
| Outgoing request list | Query `status=pending` where `requester_id = me` |
| Realtime pending notifications | Subscribe to `friendships` INSERT where `addressee_id = me` |