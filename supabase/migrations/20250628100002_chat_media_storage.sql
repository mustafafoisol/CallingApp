-- chat-media storage bucket for image attachments

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "chat_media_select_participant"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-media'
    and exists (
      select 1
      from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  );

create policy "chat_media_insert_participant"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and exists (
      select 1
      from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and auth.uid() in (c.user_a_id, c.user_b_id)
    )
  );