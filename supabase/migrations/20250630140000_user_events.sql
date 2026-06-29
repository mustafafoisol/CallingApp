-- Unencrypted typed user events (add-friend) delivered via Supabase Realtime.
create table public.user_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('add-friend')),
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index user_events_recipient_created_idx
  on public.user_events (recipient_id, created_at desc);

alter table public.user_events enable row level security;

create policy "user_events_select_recipient"
  on public.user_events for select to authenticated
  using (auth.uid() = recipient_id);

create or replace function public.friend_conversation_id(requester uuid, addressee uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.conversations c
  where c.user_a_id = least(requester, addressee)
    and c.user_b_id = greatest(requester, addressee)
  limit 1;
$$;

create or replace function public.emit_friend_user_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  peer_name text;
  peer_public_id text;
  peer_avatar text;
  conv_id uuid;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    select p.display_name, p.public_id, p.avatar_url
      into peer_name, peer_public_id, peer_avatar
      from public.profiles p
      where p.id = new.requester_id;

    insert into public.user_events (recipient_id, event_type, status, payload)
    values (
      new.addressee_id,
      'add-friend',
      'sent',
      jsonb_build_object(
        'friendship_id', new.id,
        'peer_id', new.requester_id,
        'peer_display_name', peer_name,
        'peer_public_id', peer_public_id,
        'peer_avatar_url', peer_avatar
      )
    );
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.status = 'accepted'
    and old.status is distinct from 'accepted'
  then
    conv_id := public.friend_conversation_id(new.requester_id, new.addressee_id);

    select p.display_name, p.public_id, p.avatar_url
      into peer_name, peer_public_id, peer_avatar
      from public.profiles p
      where p.id = new.addressee_id;

    insert into public.user_events (recipient_id, event_type, status, payload)
    values (
      new.requester_id,
      'add-friend',
      'accepted',
      jsonb_build_object(
        'friendship_id', new.id,
        'peer_id', new.addressee_id,
        'peer_display_name', peer_name,
        'peer_public_id', peer_public_id,
        'peer_avatar_url', peer_avatar,
        'conversation_id', conv_id
      )
    );
    return new;
  end if;

  if tg_op = 'DELETE' and old.status = 'pending' then
    select p.display_name, p.public_id, p.avatar_url
      into peer_name, peer_public_id, peer_avatar
      from public.profiles p
      where p.id = old.addressee_id;

    insert into public.user_events (recipient_id, event_type, status, payload)
    values (
      old.requester_id,
      'add-friend',
      'ignored',
      jsonb_build_object(
        'friendship_id', old.id,
        'peer_id', old.addressee_id,
        'peer_display_name', peer_name,
        'peer_public_id', peer_public_id,
        'peer_avatar_url', peer_avatar
      )
    );
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger on_friendship_emit_event
  after insert or update or delete on public.friendships
  for each row execute function public.emit_friend_user_event();

alter table public.user_events replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'user_events'
  ) then
    alter publication supabase_realtime add table public.user_events;
  end if;
end $$;