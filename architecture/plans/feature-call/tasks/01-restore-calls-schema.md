# Task 01 — Restore Calls Schema

**Milestone:** M1 · **Depends on:** 00 · **Est.:** 2h

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

- [ ] Migration `supabase/migrations/YYYYMMDD_restore_calls.sql`
- [ ] Index on `(callee_id, status)` for incoming lookup
- [ ] Index on `(conversation_id, created_at desc)`
- [ ] `REPLICA IDENTITY FULL` on `calls` (filtered Realtime)
- [ ] RLS: SELECT/UPDATE for caller or callee
- [ ] RLS: INSERT only `auth.uid() = caller_id` + friendship accepted + participant
- [ ] Add `calls` to `supabase_realtime` publication
- [ ] `npx supabase db push` on remote
- [ ] Update `architecture/features/data-model-and-security.md`

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

- [ ] Authenticated user can INSERT as caller (manual SQL or API test)
- [ ] Non-participant INSERT fails

## Files

| File | Action |
|------|--------|
| `supabase/migrations/*_restore_calls.sql` | Create |
| `architecture/features/data-model-and-security.md` | Update |