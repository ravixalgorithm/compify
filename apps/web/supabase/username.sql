-- Compify UI — username availability check.
-- Run once in the Supabase SQL editor. Usernames live in
-- auth.users.raw_user_meta_data->>'username'. This SECURITY DEFINER function
-- lets a signed-in user check availability without exposing the users table.
-- Returns true when the username is free (case-insensitive), excluding the
-- caller's own current username.

create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from auth.users u
    where lower(u.raw_user_meta_data->>'username') = lower(trim(p_username))
      and u.id <> auth.uid()
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to authenticated;
