-- Allow senders to read their own envelope rows (e.g. INSERT ... RETURNING).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'message_envelopes'
      and policyname = 'envelopes_select_sender'
  ) then
    create policy "envelopes_select_sender"
      on public.message_envelopes for select to authenticated
      using (auth.uid() = sender_id);
  end if;
end $$;