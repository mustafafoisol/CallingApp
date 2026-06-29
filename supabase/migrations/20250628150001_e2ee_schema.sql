-- E2EE schema: crypto keys, ciphertext relay, private attachments, session columns
create table public.user_crypto_keys (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  identity_pubkey bytea not null,
  key_generation int not null default 1,
  updated_at timestamptz not null default now()
);
create index user_crypto_keys_generation_idx on public.user_crypto_keys (key_generation);
alter table public.user_crypto_keys enable row level security;
create policy "crypto_keys_select_authenticated"
  on public.user_crypto_keys for select to authenticated using (true);
create policy "crypto_keys_insert_own"
  on public.user_crypto_keys for insert to authenticated with check (auth.uid() = user_id);
create policy "crypto_keys_update_own"
  on public.user_crypto_keys for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  storage_path text not null,
  ciphertext_size int not null,
  expires_at timestamptz not null default (now() + interval '1 day'),
  created_at timestamptz not null default now()
);
create index message_attachments_expires_idx on public.message_attachments (expires_at);
alter table public.message_attachments enable row level security;
create policy "attachments_select_participant"
  on public.message_attachments for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.user_a_id, c.user_b_id)
  ));
create table public.message_envelopes (
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
create index message_envelopes_recipient_created_idx
  on public.message_envelopes (recipient_id, created_at);
create index message_envelopes_expires_idx on public.message_envelopes (expires_at);
alter table public.message_envelopes replica identity full;
alter table public.message_envelopes enable row level security;
create policy "envelopes_insert_sender"
  on public.message_envelopes for insert to authenticated
  with check (auth.uid() = sender_id and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.user_a_id, c.user_b_id)
  ));
create policy "envelopes_select_recipient"
  on public.message_envelopes for select to authenticated using (auth.uid() = recipient_id);
create policy "envelopes_delete_recipient"
  on public.message_envelopes for delete to authenticated using (auth.uid() = recipient_id);
alter table public.profiles
  add column session_version bigint not null default 1,
  add column active_device_id text,
  add column active_session_at timestamptz;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media-private', 'chat-media-private', false, 1048576, array['application/octet-stream']);
alter publication supabase_realtime add table public.message_envelopes;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;