-- Batch-fetch latest message preview per conversation (contacts sidebar)

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
  select distinct on (m.conversation_id)
    m.conversation_id,
    m.body,
    m.type,
    m.removed_at
  from public.messages m
  where m.conversation_id = any (conversation_ids)
  order by m.conversation_id, m.created_at desc;
$$;