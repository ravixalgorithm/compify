-- ============================================================================
-- Compify UI — DB-backed component storage (Strategy D, Phase 1).
-- Paste this whole file into the Supabase SQL editor (Dashboard → SQL → New
-- query) and click RUN. Safe to run more than once (idempotent).
--   Project: https://hybpyucdpsudibzbcshj.supabase.co
--
-- Model:
--   * Components live here, not on the filesystem. `source` is the raw .tsx;
--     `compiled_module_url` points at the published ESM module in Storage.
--   * Admins = Supabase users with app_metadata.is_admin = true (or role
--     'admin') — same gate as the /admin area. They are the only ones who can
--     see drafts (read policy below).
--   * WRITES are server-only via the service-role key (which bypasses RLS).
--     There is deliberately NO insert/update/delete policy here, so a leaked
--     anon or user key can never mutate components. The admin API route verifies
--     the caller is an is_admin user, then writes with the service-role client.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Components table. Mirrors the old registry.json entry + .tsx source +
--    .meta.json metadata, plus the compile pipeline and preview-layout fields.
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
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  published_at          timestamptz
);

-- Columns added after first deploy land here (keep idempotent for re-runs).
alter table public.components add column if not exists compile_error text;
alter table public.components add column if not exists published_at timestamptz;

create index if not exists components_status_idx   on public.components (status);
create index if not exists components_category_idx on public.components (category);
create index if not exists components_created_idx  on public.components (created_at desc);

-- ----------------------------------------------------------------------------
-- 2. updated_at maintenance — keep it correct regardless of which path writes.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. RLS. Public reads published rows; admins read everything (incl. drafts).
--    No write policy on purpose — writes are service-role only (see header).
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. Storage buckets. Public read (the website/CDN fetches modules + thumbs by
--    URL). No write policy — uploads happen server-side with the service-role
--    key, which bypasses storage RLS.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('component-modules', 'component-modules', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('component-thumbnails', 'component-thumbnails', true)
on conflict (id) do nothing;

drop policy if exists "component_modules_public_read" on storage.objects;
create policy "component_modules_public_read" on storage.objects
  for select using (bucket_id = 'component-modules');

drop policy if exists "component_thumbnails_public_read" on storage.objects;
create policy "component_thumbnails_public_read" on storage.objects
  for select using (bucket_id = 'component-thumbnails');

-- ----------------------------------------------------------------------------
-- 5. Refresh PostgREST schema cache so the new table is queryable immediately.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
