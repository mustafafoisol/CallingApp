-- Per-user read cursors and batch unread counts (contacts sidebar)

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_reads_user_idx on public.conversation_reads (user_id);

alter table public.conversation_reads enable row level security;

create policy "reads_select_own"
  on public.conversation_reads for select to authenticated
  using (auth.uid() = user_id);

create policy "reads_insert_own"
  on public.conversation_reads for insert to authenticated
  with check (auth.uid() = user_id);

create policy "reads_update_own"
  on public.conversation_reads for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.conversation_unread_counts(conversation_ids uuid[])
returns table (
  conversation_id uuid,
  unread_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    m.conversation_id,
    count(*)::bigint as unread_count
  from public.messages m
  where m.conversation_id = any (conversation_ids)
    and m.sender_id <> auth.uid()
    and m.created_at > coalesce(
      (
        select cr.last_read_at
        from public.conversation_reads cr
        where cr.conversation_id = m.conversation_id
          and cr.user_id = auth.uid()
      ),
      '1970-01-01'::timestamptz
    )
  group by m.conversation_id;
$$;