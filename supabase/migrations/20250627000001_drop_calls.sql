-- Remove legacy calls table (voice/video feature removed; chat-only product)
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'calls'
  ) then
    alter publication supabase_realtime drop table public.calls;
  end if;
end $$;

drop table if exists public.calls;