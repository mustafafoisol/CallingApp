-- Remove legacy calls table (voice/video feature removed; chat-only product)
alter publication supabase_realtime drop table if exists public.calls;

drop table if exists public.calls;