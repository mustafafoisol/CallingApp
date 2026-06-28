-- Soft remove (own messages) + per-user hide (others' messages)

alter table public.messages
  add column removed_at timestamptz;

comment on column public.messages.removed_at is
  'Set when sender removes message for both participants; UI shows Message removed';

alter table public.messages drop constraint messages_body_check;

alter table public.messages add constraint messages_body_check check (
  (removed_at is not null and body = '')
  or (removed_at is null and char_length(body) between 1 and 4000)
);

alter table public.messages replica identity full;

create table public.message_hides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

create index message_hides_user_idx on public.message_hides (user_id);

alter table public.message_hides enable row level security;

create policy "message_hides_select_own"
  on public.message_hides for select to authenticated
  using (user_id = auth.uid());

create policy "message_hides_insert_own"
  on public.message_hides for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id
        and m.sender_id <> auth.uid()
        and m.removed_at is null
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  );

create policy "messages_update_remove_own"
  on public.messages for update to authenticated
  using (
    auth.uid() = sender_id
    and removed_at is null
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  )
  with check (auth.uid() = sender_id);