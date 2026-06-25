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
  premium               boolean not null default false,
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

create index if not exists components_grid_idx on public.components (grid_column, sort_position);

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
-- 8. Tell PostgREST to refresh its schema cache immediately (otherwise a new
--    table can take a moment to appear, surfacing "Could not find the table
--    'public.api_keys' in the schema cache").
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
