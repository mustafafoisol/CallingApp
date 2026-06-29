-- Purge legacy plaintext chat data (no import to E2EE)

delete from public.message_hides;
delete from public.messages;

-- Empty public chat-media bucket via Supabase dashboard or storage cron.
-- SQL cannot bulk-delete storage.objects without service role; run separately.

-- Deprecate latest_message_previews (returns no rows after purge)
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