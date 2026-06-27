-- ============================================================================
-- Compify UI — one-shot Supabase setup.
-- Paste this whole file into the Supabase SQL editor (Dashboard → SQL → New
-- query) and click RUN. Safe to run more than once (idempotent).
--   Project: https://hybpyucdpsudibzbcshj.supabase.co
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. API keys for MCP access. `key_hash` (SHA-256) is used for verification;
--    `key` stores the same key reversibly ENCRYPTED (AES-256-GCM, decrypted
--    server-side) so the owner can re-copy it any time without exposing
--    cleartext at rest. Encryption happens in the app (lib/api-keys.ts) using
--    API_KEY_ENCRYPTION_SECRET.
-- ----------------------------------------------------------------------------
create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  prefix       text not null,
  key          text,           -- encrypted key (enc:v1:…), so it can be re-copied
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
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

-- Per-day buckets powering the time-windowed "Trending" view. The all-time
-- totals above stay the general engagement signal (default home + featured
-- tie-break); trending sums these buckets over a recent window so it reflects
-- what is hot NOW. One small row per component per active day. Buckets only
-- start filling once this migration runs — historical activity has no per-day
-- timestamps to backfill, so trending begins fresh from deploy.
create table if not exists public.component_stats_daily (
  slug   text not null,
  day    date not null default current_date,
  views  bigint not null default 0,
  copies bigint not null default 0,
  primary key (slug, day)
);

alter table public.component_stats_daily enable row level security;

drop policy if exists "component_stats_daily_read" on public.component_stats_daily;
create policy "component_stats_daily_read" on public.component_stats_daily
  for select using (true);

-- Window queries filter by day; index it for the rolling lookback.
create index if not exists component_stats_daily_day_idx on public.component_stats_daily (day);

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

  insert into public.component_stats_daily (slug, day, views) values (p_slug, current_date, 1)
  on conflict (slug, day) do update
    set views = public.component_stats_daily.views + 1;

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

  insert into public.component_stats_daily (slug, day, copies) values (p_slug, current_date, 1)
  on conflict (slug, day) do update
    set copies = public.component_stats_daily.copies + 1;

  return result;
end;
$$;

revoke all on function public.increment_copy(text) from public;
grant execute on function public.increment_copy(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. DB-backed component storage. Components live here (not the filesystem);
--    `source` is the raw .tsx and `compiled_module_url` points at the published
--    ESM module in Storage. WRITES are service-role only (no insert/update/delete
--    policy on purpose), so a leaked anon/user key can never mutate components —
--    the admin API route checks is_admin, then writes with the service-role client.
-- ----------------------------------------------------------------------------
create table if not exists public.components (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,

  -- Metadata (was registry.json + .meta.json)
  display_name          text not null,
  category              text not null default 'cards',
  description           text not null default '',
  description_paragraphs text[] not null default '{}',
  key_features          text[] not null default '{}',
  tags                  text[] not null default '{}',
  dependencies          text[] not null default '{}',
  variants              text[] not null default '{framer}'::text[],
  related               text[] not null default '{}',
  tweak_schema          jsonb not null default '[]'::jsonb,   -- property controls
  props                 jsonb not null default '[]'::jsonb,   -- generated PropDoc[]
  usage                 text,                                  -- generated usage snippet
  copy_count            integer not null default 0,           -- seeded baseline (live counts in component_stats)

  -- Source + compiled artifact (was packages/library/src/components/*.tsx)
  source                text not null,                         -- raw .tsx
  compiled_module_url   text,                                  -- Storage URL, content-hashed, immutable
  compiled_module_hash  text,
  compile_status        text not null default 'pending'
                          check (compile_status in ('pending','compiling','ready','error')),
  compile_error         text,                                  -- esbuild message, surfaced to admin

  -- Assets + Framer
  thumbnail_url         text,                                  -- Storage URL (component-thumbnails)
  framer_module_url     text,
  preview_accent        text not null default '#7C3AED',

  -- Per-surface preview layout the admin edits (gallery/detail/variant).
  -- Shape (all keys optional): { "<surface>": { fill, center, aspectRatio,
  -- minHeight, paddingX, paddingY, width, height, propsOverride } }
  preview_layout        jsonb not null default '{}'::jsonb,

  -- Lifecycle
  featured              boolean not null default false,       -- admin-curated "Featured" view (admin-set only)
  featured_position     integer,                              -- manual order within Featured (lower = nearer top; null = unordered)
  status                text not null default 'draft'
                          check (status in ('draft','published','archived')),
  grid_column           smallint,                              -- admin-pinned home column (0-based; null = unpinned)
  sort_position         integer,                               -- order within grid_column (lower = nearer top)
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  published_at          timestamptz
);

-- Columns added after first deploy land here (keep idempotent for re-runs).
alter table public.components add column if not exists compile_error text;
alter table public.components add column if not exists published_at timestamptz;
alter table public.components add column if not exists sort_position integer;
alter table public.components add column if not exists grid_column smallint;
-- Uploaded gallery/variant thumbnail media (image or video URL).
alter table public.components add column if not exists gallery_media_url text;
alter table public.components add column if not exists variant_media_url text;
-- Admin-curated "Featured" marker (admin-set only). Idempotent for re-runs.
alter table public.components add column if not exists featured boolean not null default false;
-- Manual ordering within the Featured view (independent of the home-grid pins).
alter table public.components add column if not exists featured_position integer;
-- The old "premium" (paid) flag is gone — Featured is the only curation now.
alter table public.components drop column if exists premium;

create index if not exists components_grid_idx on public.components (grid_column, sort_position);
create index if not exists components_featured_idx on public.components (featured) where featured;

create index if not exists components_status_idx   on public.components (status);
create index if not exists components_category_idx on public.components (category);
create index if not exists components_created_idx  on public.components (created_at desc);

-- updated_at maintenance — correct regardless of which path writes.
create or replace function public.components_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists components_set_updated_at on public.components;
create trigger components_set_updated_at
  before update on public.components
  for each row execute function public.components_set_updated_at();

alter table public.components enable row level security;

-- Anyone (anon + signed-in) can read PUBLISHED components.
drop policy if exists "components_public_read" on public.components;
create policy "components_public_read" on public.components
  for select using (status = 'published');

-- Admins can read every row (drafts, archived, compile status) for the panel.
drop policy if exists "components_admin_read_all" on public.components;
create policy "components_admin_read_all" on public.components
  for select using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Component asset buckets. Public read (website/CDN fetches by URL); uploads are
-- server-side with the service-role key, which bypasses storage RLS.
insert into storage.buckets (id, name, public)
values ('component-modules', 'component-modules', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('component-thumbnails', 'component-thumbnails', true)
on conflict (id) do nothing;

-- These buckets are PUBLIC: files are served via the public URL path
-- (/object/public/...), which bypasses RLS. A broad SELECT policy on
-- storage.objects is therefore unnecessary and only lets clients enumerate
-- (list) every file in the bucket — so we drop it. Writes go through the
-- service-role key, which bypasses RLS regardless.
drop policy if exists "component_modules_public_read" on storage.objects;
drop policy if exists "component_thumbnails_public_read" on storage.objects;

-- ----------------------------------------------------------------------------
-- 9. Daily copy / MCP quota. Non-admin users get a fixed number of component
--    deliveries per day (website "Copy" + MCP get_component share one counter);
--    admins are unlimited. Enforced through SECURITY DEFINER functions so a
--    leaked anon key can't bump another user's usage or read it.
-- ----------------------------------------------------------------------------
create table if not exists public.usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default current_date,
  copies  integer not null default 0,
  primary key (user_id, day)
);

alter table public.usage_daily enable row level security;

-- Users may read only their own usage (powers the Profile meter). All writes go
-- through the functions below, never directly.
drop policy if exists "usage_daily_read_own" on public.usage_daily;
create policy "usage_daily_read_own" on public.usage_daily
  for select using (auth.uid() = user_id);

create index if not exists usage_daily_day_idx on public.usage_daily (day);

-- Per-user daily limit, in one place so the website and MCP agree.
create or replace function public.copy_quota_limit()
returns integer language sql immutable as $$ select 5 $$;

-- Is the given user a backend-authorized admin (app_metadata.is_admin / role)?
create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((
    select (u.raw_app_meta_data ->> 'is_admin')::boolean = true
        or (u.raw_app_meta_data ->> 'role') = 'admin'
    from auth.users u
    where u.id = p_user_id
  ), false);
$$;

-- Consume one unit of quota for an explicit user (service-role callers: MCP).
-- Returns { allowed, used, limit, remaining, unlimited }.
create or replace function public.consume_copy_quota_for(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := public.copy_quota_limit();
  v_used  int;
  -- When the day's allowance restores: start of tomorrow (UTC, matching current_date).
  v_reset timestamptz := (current_date + 1)::timestamptz;
begin
  if p_user_id is null then
    return jsonb_build_object('allowed', false, 'used', 0, 'limit', v_limit, 'remaining', 0, 'unlimited', false, 'reset_at', v_reset);
  end if;

  if public.is_admin_user(p_user_id) then
    return jsonb_build_object('allowed', true, 'used', 0, 'limit', null, 'remaining', null, 'unlimited', true, 'reset_at', null);
  end if;

  select copies into v_used from public.usage_daily
    where user_id = p_user_id and day = current_date;
  v_used := coalesce(v_used, 0);

  if v_used >= v_limit then
    return jsonb_build_object('allowed', false, 'used', v_used, 'limit', v_limit, 'remaining', 0, 'unlimited', false, 'reset_at', v_reset);
  end if;

  insert into public.usage_daily (user_id, day, copies) values (p_user_id, current_date, 1)
  on conflict (user_id, day) do update set copies = public.usage_daily.copies + 1
  returning copies into v_used;

  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit,
                            'remaining', greatest(v_limit - v_used, 0), 'unlimited', false, 'reset_at', v_reset);
end;
$$;

-- Website wrapper: consume for the signed-in caller (auth.uid()).
create or replace function public.consume_copy_quota()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.consume_copy_quota_for(auth.uid());
end;
$$;

-- Read-only view of an explicit user's quota (service-role: e.g. future MCP UI).
create or replace function public.get_copy_quota_for(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := public.copy_quota_limit();
  v_used  int;
  v_reset timestamptz := (current_date + 1)::timestamptz;
begin
  if p_user_id is null then
    return jsonb_build_object('used', 0, 'limit', v_limit, 'remaining', v_limit, 'unlimited', false, 'reset_at', v_reset);
  end if;
  if public.is_admin_user(p_user_id) then
    return jsonb_build_object('used', 0, 'limit', null, 'remaining', null, 'unlimited', true, 'reset_at', null);
  end if;
  select copies into v_used from public.usage_daily
    where user_id = p_user_id and day = current_date;
  v_used := coalesce(v_used, 0);
  return jsonb_build_object('used', v_used, 'limit', v_limit,
                            'remaining', greatest(v_limit - v_used, 0), 'unlimited', false, 'reset_at', v_reset);
end;
$$;

-- Read-only quota for the signed-in caller (powers the Profile meter).
create or replace function public.get_copy_quota()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.get_copy_quota_for(auth.uid());
end;
$$;

-- Grants: the auth.uid() wrappers are for signed-in website users; the *_for
-- variants take an arbitrary user id, so they are restricted to service_role
-- (the MCP server) — never anon/authenticated, which could otherwise grief or
-- inspect other users' quotas.
revoke all on function public.consume_copy_quota() from public;
grant execute on function public.consume_copy_quota() to authenticated;
revoke all on function public.get_copy_quota() from public;
grant execute on function public.get_copy_quota() to authenticated;

-- The *_for variants take an arbitrary user id — keep them off anon/authenticated
-- (Supabase grants EXECUTE to those roles by default) so only the service role
-- can meter or inspect a given user.
revoke all on function public.consume_copy_quota_for(uuid) from public, anon, authenticated;
revoke all on function public.get_copy_quota_for(uuid) from public, anon, authenticated;
grant execute on function public.consume_copy_quota_for(uuid) to service_role;
grant execute on function public.get_copy_quota_for(uuid) to service_role;

-- Internal helper — only the SECURITY DEFINER functions above call it (as the
-- owner). Lock it down so clients can't probe arbitrary users' admin status.
revoke all on function public.is_admin_user(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 10. Tell PostgREST to refresh its schema cache immediately (otherwise a new
--    table can take a moment to appear, surfacing "Could not find the table
--    'public.api_keys' in the schema cache").
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
