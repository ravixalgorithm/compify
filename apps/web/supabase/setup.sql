-- ============================================================================
-- Compify UI — one-shot Supabase setup.
-- Paste this whole file into the Supabase SQL editor (Dashboard → SQL → New
-- query) and click RUN. Safe to run more than once (idempotent).
--   Project: https://hybpyucdpsudibzbcshj.supabase.co
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. API keys for MCP access. Only the SHA-256 hash is stored; the plaintext
--    key is shown to the user exactly once at creation time.
-- ----------------------------------------------------------------------------
create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  prefix       text not null,
  key          text,           -- plaintext key, so it can be copied any time
  key_hash     text not null,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- For databases created before the `key` column existed.
alter table public.api_keys add column if not exists key text;

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own" on public.api_keys
  for select using (auth.uid() = user_id);

drop policy if exists "api_keys_insert_own" on public.api_keys;
create policy "api_keys_insert_own" on public.api_keys
  for insert with check (auth.uid() = user_id);

drop policy if exists "api_keys_update_own" on public.api_keys;
create policy "api_keys_update_own" on public.api_keys
  for update using (auth.uid() = user_id);

drop policy if exists "api_keys_delete_own" on public.api_keys;
create policy "api_keys_delete_own" on public.api_keys
  for delete using (auth.uid() = user_id);

-- Verification function used by the MCP server (bypasses RLS internally,
-- returns the owning user id for a valid, un-revoked key, stamps last_used_at).
create or replace function public.verify_api_key(p_key_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  update public.api_keys
    set last_used_at = now()
    where key_hash = p_key_hash and revoked_at is null
    returning user_id into v_user_id;
  return v_user_id;
end;
$$;

revoke all on function public.verify_api_key(text) from public;
grant execute on function public.verify_api_key(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Username availability check (usernames live in user metadata).
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. Avatar storage — public bucket, each user writes only their own folder.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_user_write" on storage.objects;
create policy "avatars_user_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_update" on storage.objects;
create policy "avatars_user_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_delete" on storage.objects;
create policy "avatars_user_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 4. Feedback submissions (from the Share Feedback modal).
-- ----------------------------------------------------------------------------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  email      text,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. Grant admin access. app_metadata is backend-only (users cannot change it),
--    so it is the source of truth for who may open /admin. Set the email, run,
--    then have that user sign out and back in (or wait for a token refresh) so
--    the new claim lands in their session.
--    To revoke: set '"is_admin": false' (or remove the key).
-- ----------------------------------------------------------------------------
update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
  where email = 'ravixalgorithm@gmail.com';

-- ----------------------------------------------------------------------------
-- 6. Per-component stats. `views` = component page loads; `copies` = copy actions
--    (website Copy + MCP get_component calls). Counts are incremented through
--    SECURITY DEFINER functions so the anon key can bump them without write
--    access to the table.
-- ----------------------------------------------------------------------------
create table if not exists public.component_stats (
  slug       text primary key,
  views      bigint not null default 0,
  copies     bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.component_stats enable row level security;

drop policy if exists "component_stats_read" on public.component_stats;
create policy "component_stats_read" on public.component_stats
  for select using (true);

create or replace function public.increment_view(p_slug text)
returns public.component_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.component_stats;
begin
  insert into public.component_stats (slug, views) values (p_slug, 1)
  on conflict (slug) do update
    set views = public.component_stats.views + 1, updated_at = now()
  returning * into result;
  return result;
end;
$$;

revoke all on function public.increment_view(text) from public;
grant execute on function public.increment_view(text) to anon, authenticated;

create or replace function public.increment_copy(p_slug text)
returns public.component_stats
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.component_stats;
begin
  insert into public.component_stats (slug, copies) values (p_slug, 1)
  on conflict (slug) do update
    set copies = public.component_stats.copies + 1, updated_at = now()
  returning * into result;
  return result;
end;
$$;

revoke all on function public.increment_copy(text) from public;
grant execute on function public.increment_copy(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. Tell PostgREST to refresh its schema cache immediately (otherwise the new
--    table can take a moment to appear, surfacing "Could not find the table
--    'public.api_keys' in the schema cache").
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
