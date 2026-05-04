-- VIVOS Messenger Native - push token storage
-- Rulează acest SQL în Supabase SQL Editor.
-- Scop: salvează tokenurile Expo Push pentru notificări native Android/iOS.

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios', 'web')),
  device_name text,
  app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_push_tokens_user_id_idx
  on public.device_push_tokens(user_id);

create index if not exists device_push_tokens_platform_idx
  on public.device_push_tokens(platform);

alter table public.device_push_tokens enable row level security;

-- Utilizatorul își poate vedea doar propriile tokenuri.
drop policy if exists "device_push_tokens_select_own" on public.device_push_tokens;
create policy "device_push_tokens_select_own"
  on public.device_push_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Utilizatorul își poate înregistra propriul token.
drop policy if exists "device_push_tokens_insert_own" on public.device_push_tokens;
create policy "device_push_tokens_insert_own"
  on public.device_push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Utilizatorul își poate actualiza propriul token.
drop policy if exists "device_push_tokens_update_own" on public.device_push_tokens;
create policy "device_push_tokens_update_own"
  on public.device_push_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Utilizatorul își poate șterge propriul token, util la logout/dezinstalare.
drop policy if exists "device_push_tokens_delete_own" on public.device_push_tokens;
create policy "device_push_tokens_delete_own"
  on public.device_push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Trigger simplu pentru updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_device_push_tokens_updated_at on public.device_push_tokens;
create trigger set_device_push_tokens_updated_at
before update on public.device_push_tokens
for each row
execute function public.set_updated_at();
