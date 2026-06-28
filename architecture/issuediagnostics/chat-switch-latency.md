# Issue Diagnosis: Slow Chat Switching

**Reported:** 2026-06-28  
**Symptom:** Clicking a contact in the sidebar to switch chats feels slow; transition is not instant.  
**Status:** Fixed on branch `fix/chat-switch-latency` (2026-06-28).

## Short answer

**Yes — every chat click triggers a full server round-trip with multiple database calls**, including re-fetching the entire contacts sidebar even though it rarely changes. There is no `loading.tsx`, no request caching, and the sidebar is not in a persistent layout, so the UI blocks until all queries finish.

## Navigation path

```mermaid
sequenceDiagram
  participant User
  participant Link as ContactRow Link
  participant Next as Next.js Server
  participant Layout as app/layout.tsx
  participant Page as chat/[id]/page.tsx
  participant DB as Supabase

  User->>Link: Click /chat/:id
  Link->>Next: Client navigation (RSC fetch)
  Next->>Layout: getUser()
  Next->>Page: Full Server Component render
  Page->>DB: getUser() again
  Page->>DB: conversation + friend + messages + loadContacts + hides
  Note over Page,DB: loadContacts = 1 + 2N queries
  DB-->>Page: All results
  Page-->>User: Full HTML/RSC payload (sidebar + chat remount)
```

`ContactRow` uses a plain Next.js `<Link href="/chat/{conversationId}">` — no client-side chat router, no shared cache.

## DB calls per chat switch

Assume **N** accepted friends/contacts.

| # | Query | File | Needed on switch? |
|---|-------|------|-------------------|
| 1 | `auth.getUser()` | `(app)/layout.tsx` | Once per app session (layout) |
| 2 | `auth.getUser()` | `chat/[id]/page.tsx` | **Duplicate** of layout |
| 3 | `conversations` by id | `page.tsx` | Yes — verify participant |
| 4 | `profiles` for friend | `page.tsx` | Yes — header name |
| 5 | `messages` last 50 | `page.tsx` | Yes — thread SSR |
| 6 | `loadContacts()` — friendships + profiles | `load-contacts.ts` | **Redundant** — sidebar unchanged |
| 7..6+2N | Per contact: `conversations` + last `messages` preview | `load-contacts.ts` | **Redundant N+1** |
| 7+2N | `message_hides` for user | `message-hides.ts` | Yes (if user has hides) |
| 8+2N | `messages` filter hides in conversation | `message-hides.ts` | Yes (if user has hides) |

**Total: ~8 + 2N round-trips** (sequential batches; `loadContacts` inner loop is parallel per contact but still N network calls).

| Contacts (N) | Approx. DB round-trips |
|--------------|------------------------|
| 5 | ~18 |
| 10 | ~28 |
| 20 | ~48 |

Each round-trip to Supabase adds ~50–200ms+ depending on region and connection. **10 contacts can easily mean 2–5+ seconds** before paint.

## Code evidence

### Chat page re-fetches sidebar on every open

```39:56:apps/web/src/app/(app)/chat/[id]/page.tsx
  const [{ data: friend }, { data: recentMessages }, contacts, hiddenIds] =
    await Promise.all([
      supabase.from("profiles")...,
      supabase.from("messages")...,
      loadContacts(supabase, user.id),  // ← full sidebar reload
      loadHiddenMessageIds(supabase, user.id, id),
    ]);
```

### N+1 in `loadContacts`

```42:80:apps/web/src/lib/contacts/load-contacts.ts
  const contacts = await Promise.all(
    rows.map(async (friendship) => {
      // ...
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id, last_message_at")
        ...
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("body, type, removed_at")
        ...
    }),
  );
```

Documented as known limitation in [contacts-home.md](../features/contacts-home.md#performance-note).

### Sidebar is not persistent

`MessagesShell` + `ContactsSidebar` live inside each **page** (`home/page.tsx`, `chat/[id]/page.tsx`), not in `(app)/layout.tsx`. Switching chats unmounts and remounts the entire shell; `ChatView` also remounts (new Realtime subscription each time).

### No loading UI

No `loading.tsx` under `app/(app)/chat/[id]/` or `app/(app)/`. User sees the previous screen until the server responds — feels like a hang.

### Duplicate auth

`(app)/layout.tsx` and `chat/[id]/page.tsx` both call `getUser()` on every navigation.

## What is NOT the problem

| Checked | Finding |
|---------|---------|
| Client-side send/realtime | Unrelated to switch latency |
| Link prefetch | Next.js prefetches RSC payload, but server still runs all queries |
| ChatView pagination | Only runs after mount; not blocking initial switch |

## Recommended fixes (priority order)

### P0 — Stop re-fetching contacts on chat switch

Move sidebar data loading to `(app)/layout.tsx` (or a shared parent) and pass contacts down. Chat page should only load **conversation-specific** data (messages, friend profile, hides).

**Expected savings:** Remove **1 + 2N** queries per switch.

### P0 — Add `loading.tsx`

Instant skeleton in the main chat panel while server fetches messages. Sidebar can stay visible if lifted to layout.

### P1 — Batch `loadContacts` into 2–3 queries

Replace per-friend loop with:
1. One `friendships` + profiles query (existing)
2. One `conversations` query: `WHERE user_a_id = $me OR user_b_id = $me`
3. One query for latest message per conversation (subquery or `DISTINCT ON`)

See suggestion in [contacts-home.md](../features/contacts-home.md#performance-note).

### P1 — `React.cache()` on `loadContacts` + `getUser`

Dedupe within a single request (layout + page still duplicate today).

### P2 — Client-side thread cache

Keep mounted `ChatView` instances or SWR/React Query for messages; switch tabs without full RSC navigation. Larger refactor; best UX for WhatsApp-style apps.

### P2 — Filter `message_hides` by conversation in SQL

Replace fetch-all-hides + filter with `.eq` on a join — minor win unless many hides.

## Fix shipped (`fix/chat-switch-latency`)

| Commit | Change |
|--------|--------|
| `feat(db): latest_message_previews RPC` | Single SQL function for all contact previews |
| `feat(web): batch loadContacts` | 3 queries total (friendships, conversations, RPC previews) |
| `feat(web): messages route group layout` | Sidebar loaded once in `(messages)/layout.tsx` |
| `feat(web): chat route + loading.tsx` | Chat page only fetches thread data; instant skeleton |
| `feat(web): React cache auth` | `getAuthUser()` deduped per request |

**Chat switch now:** ~4 DB calls (conversation, profile, messages, hides) — not 8+2N.

## Acceptance criteria (after fix)

- [x] Sidebar does not re-query all contacts on every `/chat/:id` navigation
- [x] `loadContacts` uses ≤3 queries regardless of contact count
- [x] Loading skeleton shows immediately while chat page fetches
- [ ] Verify end-to-end latency on real connection (manual)

## Related

- [contacts-home.md](../features/contacts-home.md) — contact loading, N+1 note
- [realtime-chat.md](../features/realtime-chat.md) — ChatView / page SSR
- [ui-shell.md](../features/ui-shell.md) — MessagesShell layout