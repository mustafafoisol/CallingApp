-- Filtered postgres_changes (conversation_id=eq.*) requires full row in WAL.
alter table public.message_envelopes replica identity full;