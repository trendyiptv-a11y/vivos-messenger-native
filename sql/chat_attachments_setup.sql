-- VIVOS Messenger chat attachments setup
-- Run this in Supabase SQL Editor before testing file/photo/video sending.

alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text,
  add column if not exists attachment_size bigint;

-- Current mobile implementation stores public URLs in messages.
-- Bucket must exist and be public so attachment previews can load from attachment_url.

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload chat attachments'
  ) then
    create policy "Authenticated users can upload chat attachments"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'chat-attachments');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can read chat attachments'
  ) then
    create policy "Authenticated users can read chat attachments"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'chat-attachments');
  end if;
end $$;
