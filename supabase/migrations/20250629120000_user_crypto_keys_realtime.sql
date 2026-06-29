-- Notify friends when a peer rotates their identity key (login / re-login).
alter table public.user_crypto_keys replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'user_crypto_keys'
  ) then
    alter publication supabase_realtime add table public.user_crypto_keys;
  end if;
end $$;