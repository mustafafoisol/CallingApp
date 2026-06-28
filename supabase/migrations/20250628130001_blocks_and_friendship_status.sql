-- Blocks table and friendship status cleanup (reject != block)

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

create policy "blocks_select_blocker"
  on public.blocks for select to authenticated
  using (auth.uid() = blocker_id);

create policy "blocks_insert_blocker"
  on public.blocks for insert to authenticated
  with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

create policy "blocks_delete_blocker"
  on public.blocks for delete to authenticated
  using (auth.uid() = blocker_id);

-- Legacy reject rows used friendships.status = 'blocked'; remove before constraint change
delete from public.friendships where status = 'blocked';

alter table public.friendships
  drop constraint if exists friendships_status_check;

alter table public.friendships
  add constraint friendships_status_check
  check (status in ('pending', 'accepted', 'declined'));

create policy "friendships_delete_participant"
  on public.friendships for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create or replace function public.is_blocked_by(blocker uuid, blocked uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocks
    where blocker_id = blocker and blocked_id = blocked
  );
$$;

grant execute on function public.is_blocked_by(uuid, uuid) to authenticated;