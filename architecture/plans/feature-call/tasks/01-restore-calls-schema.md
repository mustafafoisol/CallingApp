# Task 01 — Restore Calls Schema

**Milestone:** M1 · **Depends on:** 00 · **Est.:** 2h · **Status:** ✅ Done

## Goal

Recreate `public.calls` with RLS, SDP columns, and Realtime publication.

## Schema

```sql
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  caller_id uuid not null references public.profiles (id) on delete cascade,
  callee_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('voice', 'video')),
  status text not null default 'ringing'
    check (status in ('ringing', 'accepted', 'ended', 'missed', 'rejected', 'busy')),
  offer_sdp text,
  answer_sdp text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
```

## Checklist

- [x] Migration `supabase/migrations/20250629000001_restore_calls.sql`
- [x] Index on `(callee_id, status)` for incoming lookup
- [x] Index on `(conversation_id, created_at desc)`
- [x] `REPLICA IDENTITY FULL` on `calls` (filtered Realtime)
- [x] RLS: SELECT/UPDATE for caller or callee
- [x] RLS: INSERT only `auth.uid() = caller_id` + friendship accepted + participant
- [x] Add `calls` to `supabase_realtime` publication
- [x] `npx supabase db push` on remote
- [x] Update `architecture/features/data-model-and-security.md`

## RLS sketch

- **INSERT:** caller is auth user, in conversation, friendship `accepted`
- **SELECT:** `auth.uid() in (caller_id, callee_id)`
- **UPDATE:** same participants; callee can accept/reject; either can end

## Verify

```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'calls';

SELECT relreplident FROM pg_class WHERE relname = 'calls';
-- expect 'f' (FULL)
```

- [x] Migration applied on remote (`20250629000001_restore_calls.sql`)
- [ ] Authenticated user can INSERT as caller (manual — task 04)
- [ ] Non-participant INSERT fails (manual — task 04)

## Files

| File | Action |
|------|--------|
| `supabase/migrations/20250629000001_restore_calls.sql` | Created |
| `supabase/migrations/20250628240001_envelopes_replica_identity.sql` | Synced with remote history |
| `architecture/features/data-model-and-security.md` | Updated |