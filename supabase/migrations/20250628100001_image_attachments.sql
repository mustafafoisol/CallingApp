-- Image attachments on messages

alter table public.messages
  add column attachment_url text;

alter table public.messages drop constraint messages_type_check;

alter table public.messages add constraint messages_type_check
  check (type in ('text', 'image'));

alter table public.messages drop constraint messages_body_check;

alter table public.messages add constraint messages_body_check check (
  (removed_at is not null and body = '')
  or (
    removed_at is null
    and type = 'image'
    and attachment_url is not null
    and body = ''
  )
  or (
    removed_at is null
    and type = 'text'
    and char_length(body) between 1 and 4000
  )
);

alter table public.messages add constraint messages_image_attachment_check check (
  type <> 'image' or attachment_url is not null
);