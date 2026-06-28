# Shared Core Package

`@calling-app/core` — framework-agnostic types and pure utilities shared between apps.

## Purpose

Keep business logic that is not React- or Next-specific in one place. The web app imports from this package; future mobile or desktop clients could reuse it.

## Package layout

```
packages/core/
├── src/
│   ├── index.ts           Public exports
│   ├── types.ts           Domain interfaces
│   ├── public-id.ts       ID generation + validation
│   ├── conversation.ts    Participant canonicalization
│   ├── public-id.test.ts
│   └── conversation.test.ts
├── dist/                  Compiled output (tsc)
└── package.json
```

## Exports

### Types (`types.ts`)

| Export | Description |
|--------|-------------|
| `FriendshipStatus` | `"pending" \| "accepted" \| "blocked"` |
| `MessageType` | `"text"` |
| `Profile` | Full profile interface |
| `Friendship` | Friendship row interface |
| `Conversation` | Conversation row interface |
| `Message` | Message row interface |

### Public ID (`public-id.ts`)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `generatePublicId` | `(length?: number) => string` | Random ID from safe charset |
| `isValidPublicId` | `(value: string) => boolean` | Format validation |
| `normalizePublicId` | `(value: string) => string` | Trim + uppercase |

### Conversation (`conversation.ts`)

| Function | Signature | Purpose |
|----------|-----------|---------|
| `canonicalizeParticipants` | `(id1, id2) => { userAId, userBId }` | Ordered pair for DB |
| `isConversationParticipant` | `(pair, userId) => boolean` | Membership check |

## Web app usage

| Web module | Core import |
|------------|-------------|
| `apps/web/src/lib/profile.ts` | `generatePublicId`, `isValidPublicId`, `normalizePublicId` |
| `apps/web/src/app/(app)/home/page.tsx` | `canonicalizeParticipants` |
| `apps/web/src/app/api/friends/lookup/route.ts` | via `@/lib/profile` re-exports |

## Build integration

- `apps/web/next.config.ts`: `transpilePackages: ["@calling-app/core"]`
- Workspace dependency: `"@calling-app/core": "workspace:*"`
- Build order: `pnpm build` runs `packages/core` tsc before `apps/web` next build

## Testing

```bash
pnpm --filter @calling-app/core test
```

Covers:
- Public ID format and normalization
- Participant canonicalization and edge cases (same user throws)

## Extension guidelines

Add to core when:
- Logic is pure (no I/O, no React)
- Multiple apps or packages need the same rule
- Unit tests add value without mocking

Keep in `apps/web` when:
- Tied to Next.js routes, cookies, or React hooks
- Supabase client calls
- UI-specific formatting