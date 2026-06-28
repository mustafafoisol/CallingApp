-- CallingApp initial schema

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  public_id text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index profiles_public_id_idx on public.profiles (public_id);

-- Friendships
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

create index friendships_addressee_idx on public.friendships (addressee_id);
create index friendships_requester_idx on public.friendships (requester_id);

-- Conversations (canonical user ordering)
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles (id) on delete cascade,
  user_b_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversations_ordered check (user_a_id < user_b_id),
  constraint conversations_unique_pair unique (user_a_id, user_b_id)
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  type text not null default 'text' check (type in ('text')),
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

-- Calls
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  caller_id uuid not null references public.profiles (id) on delete cascade,
  callee_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('voice', 'video')),
  status text not null default 'ringing'
    check (status in ('ringing', 'accepted', 'ended', 'missed', 'rejected')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index calls_conversation_idx on public.calls (conversation_id, created_at desc);

-- Auto-create stub profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create conversation when friendship is accepted
create or replace function public.handle_friendship_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    if new.requester_id < new.addressee_id then
      a := new.requester_id;
      b := new.addressee_id;
    else
      a := new.addressee_id;
      b := new.requester_id;
    end if;

    insert into public.conversations (user_a_id, user_b_id)
    values (a, b)
    on conflict (user_a_id, user_b_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_friendship_accepted
  after insert or update on public.friendships
  for each row execute function public.handle_friendship_accepted();

-- Update conversation last_message_at
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- RLS
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.calls enable row level security;

-- Profiles: read any authenticated; update own
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Friendships
create policy "friendships_select_own"
  on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create policy "friendships_insert_requester"
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester_id and requester_id <> addressee_id);

create policy "friendships_update_participant"
  on public.friendships for update to authenticated
  using (auth.uid() in (requester_id, addressee_id))
  with check (auth.uid() in (requester_id, addressee_id));

-- Conversations: participants only
create policy "conversations_select_participant"
  on public.conversations for select to authenticated
  using (auth.uid() in (user_a_id, user_b_id));

-- Messages: conversation participants, sender must be self
create policy "messages_select_participant"
  on public.messages for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  );

create policy "messages_insert_participant"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id in (
            select case when c.user_a_id = auth.uid() then c.user_b_id else c.user_a_id end
            from public.conversations c where c.id = conversation_id
          ))
          or (f.addressee_id = auth.uid() and f.requester_id in (
            select case when c.user_a_id = auth.uid() then c.user_b_id else c.user_a_id end
            from public.conversations c where c.id = conversation_id
          ))
        )
    )
  );

-- Calls: participants only
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
    )
  );

create policy "calls_update_participant"
  on public.calls for update to authenticated
  using (auth.uid() in (caller_id, callee_id))
  with check (auth.uid() in (caller_id, callee_id));

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.calls;