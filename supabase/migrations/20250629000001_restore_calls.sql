-- Restore calls table for voice/video WebRTC signaling (task 01 — feature-call).
-- Idempotent: safe if table was never dropped or partially exists.

create table if not exists public.calls (
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
  created_at timestamptz not null default now(),
  constraint calls_distinct_participants check (caller_id <> callee_id)
);

alter table public.calls
  add column if not exists offer_sdp text,
  add column if not exists answer_sdp text;

create index if not exists calls_conversation_idx
  on public.calls (conversation_id, created_at desc);

create index if not exists calls_callee_status_idx
  on public.calls (callee_id, status);

alter table public.calls replica identity full;

alter table public.calls enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'calls' and policyname = 'calls_select_participant'
  ) then
    create policy "calls_select_participant"
      on public.calls for select to authenticated
      using (auth.uid() in (caller_id, callee_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'calls' and policyname = 'calls_insert_caller'
  ) then
    create policy "calls_insert_caller"
      on public.calls for insert to authenticated
      with check (
        auth.uid() = caller_id
        and caller_id <> callee_id
        and exists (
          select 1 from public.conversations c
          where c.id = conversation_id
            and auth.uid() in (c.user_a_id, c.user_b_id)
            and callee_id in (c.user_a_id, c.user_b_id)
        )
        and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and (
              (f.requester_id = auth.uid() and f.addressee_id = callee_id)
              or (f.addressee_id = auth.uid() and f.requester_id = callee_id)
            )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'calls' and policyname = 'calls_update_participant'
  ) then
    create policy "calls_update_participant"
      on public.calls for update to authenticated
      using (auth.uid() in (caller_id, callee_id))
      with check (auth.uid() in (caller_id, callee_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;
end $$;