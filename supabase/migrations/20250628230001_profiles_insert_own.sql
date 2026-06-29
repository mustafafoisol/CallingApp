-- Allow authenticated users to create their own profile if signup trigger missed.
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);