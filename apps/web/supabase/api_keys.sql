-- Compify UI — API keys for MCP access.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- One row per issued key. Only the SHA-256 hash is stored; the plaintext key
-- is shown to the user exactly once at creation time.

create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  prefix       text not null,          -- first chars of the key, safe to display
  key_hash     text not null,          -- sha256(full key), never returned to client
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;

-- Each user can only see and manage their own keys. The route handlers use the
-- user-scoped (cookie) client, so auth.uid() resolves to the signed-in user.
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

-- Verification function for the MCP server. SECURITY DEFINER lets it bypass RLS
-- internally, so the server can verify a key with only the publishable (anon)
-- key — the table itself is never exposed. Returns the owning user id for a
-- matching, un-revoked key (and stamps last_used_at), or NULL otherwise.
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
