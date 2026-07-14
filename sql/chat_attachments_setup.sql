-- VIVOS Messenger chat attachments setup
-- Run this in Supabase SQL Editor before testing file/photo/video sending.

alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text,
  add column if not exists attachment_size bigint;

-- Create a Storage bucket named chat-attachments from Supabase Dashboard:
-- Storage -> New bucket -> chat-attachments -> Public bucket: ON
--
-- For a stricter/private bucket setup, replace public URLs with signed URLs in the app.
-- Current mobile implementation stores public URLs in messages. Keep upload limited by auth policies.

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do update set public = true;

create policy if not exists "Authenticated users can upload chat attachments"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'chat-attachments');

create policy if not exists "Authenticated users can read chat attachments"
on storage.objects
for select
to authenticated
using (bucket_id = 'chat-attachments');
