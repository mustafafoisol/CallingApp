-- Repair drift: E2EE migration was recorded but not applied on remote.

create table if not exists public.user_crypto_keys (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  identity_pubkey bytea not null,
  key_generation int not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists user_crypto_keys_generation_idx
  on public.user_crypto_keys (key_generation);

alter table public.user_crypto_keys enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_crypto_keys'
      and policyname = 'crypto_keys_select_authenticated'
  ) then
    create policy "crypto_keys_select_authenticated"
      on public.user_crypto_keys for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_crypto_keys'
      and policyname = 'crypto_keys_insert_own'
  ) then
    create policy "crypto_keys_insert_own"
      on public.user_crypto_keys for insert to authenticated
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_crypto_keys'
      and policyname = 'crypto_keys_update_own'
  ) then
    create policy "crypto_keys_update_own"
      on public.user_crypto_keys for update to authenticated
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  storage_path text not null,
  ciphertext_size int not null,
  expires_at timestamptz not null default (now() + interval '1 day'),
  created_at timestamptz not null default now()
);

create index if not exists message_attachments_expires_idx
  on public.message_attachments (expires_at);

alter table public.message_attachments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'message_attachments'
      and policyname = 'attachments_select_participant'
  ) then
    create policy "attachments_select_participant"
      on public.message_attachments for select to authenticated
      using (exists (
        select 1 from public.conversations c
        where c.id = conversation_id and auth.uid() in (c.user_a_id, c.user_b_id)
      ));
  end if;
end $$;

create table if not exists public.message_envelopes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('text', 'image')),
  ciphertext bytea not null,
  nonce bytea not null,
  sender_key_generation int not null,
  attachment_id uuid references public.message_attachments (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists message_envelopes_recipient_created_idx
  on public.message_envelopes (recipient_id, created_at);

create index if not exists message_envelopes_expires_idx
  on public.message_envelopes (expires_at);

alter table public.message_envelopes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'message_envelopes'
      and policyname = 'envelopes_insert_sender'
  ) then
    create policy "envelopes_insert_sender"
      on public.message_envelopes for insert to authenticated
      with check (auth.uid() = sender_id and exists (
        select 1 from public.conversations c
        where c.id = conversation_id and auth.uid() in (c.user_a_id, c.user_b_id)
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'message_envelopes'
      and policyname = 'envelopes_select_recipient'
  ) then
    create policy "envelopes_select_recipient"
      on public.message_envelopes for select to authenticated
      using (auth.uid() = recipient_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'message_envelopes'
      and policyname = 'envelopes_delete_recipient'
  ) then
    create policy "envelopes_delete_recipient"
      on public.message_envelopes for delete to authenticated
      using (auth.uid() = recipient_id);
  end if;
end $$;

alter table public.profiles
  add column if not exists session_version bigint not null default 1,
  add column if not exists active_device_id text,
  add column if not exists active_session_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media-private', 'chat-media-private', false, 1048576, array['application/octet-stream'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'message_envelopes'
  ) then
    alter publication supabase_realtime add table public.message_envelopes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

create or replace function public.latest_message_previews(conversation_ids uuid[])
returns table (
  conversation_id uuid,
  body text,
  type text,
  removed_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    null::uuid,
    null::text,
    null::text,
    null::timestamptz
  where false;
$$;

notify pgrst, 'reload schema';