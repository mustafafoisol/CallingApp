-- 1-on-1 audio calls with WebRTC SDP stored in Postgres

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  caller_id uuid not null references public.profiles (id) on delete cascade,
  callee_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'voice' check (kind in ('voice')),
  status text not null default 'ringing'
    check (status in ('ringing', 'accepted', 'ended', 'missed', 'rejected')),
  offer_sdp text,
  answer_sdp text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint calls_no_self check (caller_id <> callee_id)
);

create index calls_conversation_idx on public.calls (conversation_id, created_at desc);
create index calls_callee_status_idx on public.calls (callee_id, status);

alter table public.calls replica identity full;

alter table public.calls enable row level security;

create policy "calls_select_participant"
  on public.calls for select to authenticated
  using (auth.uid() in (caller_id, callee_id));

create policy "calls_insert_caller"
  on public.calls for insert to authenticated
  with check (
    auth.uid() = caller_id
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

create policy "calls_update_participant"
  on public.calls for update to authenticated
  using (auth.uid() in (caller_id, callee_id))
  with check (auth.uid() in (caller_id, callee_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;
end $$;