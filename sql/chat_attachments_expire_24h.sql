-- VIVOS Messenger 24h chat attachment expiry
-- Run this in Supabase SQL Editor after chat_attachments_setup.sql.
-- New attachments expire after 24 hours.
-- IMPORTANT: Supabase blocks direct deletion from storage.objects.
-- Actual file deletion must be done through the Supabase Storage API.
-- This SQL only adds metadata columns, an index, and a helper view for external cleanup jobs.

alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_expires_at timestamptz,
  add column if not exists attachment_deleted_at timestamptz;

create index if not exists messages_attachment_expiry_idx
  on public.messages (attachment_expires_at)
  where attachment_path is not null and attachment_deleted_at is null;

create or replace view public.expired_chat_attachments as
select
  id,
  conversation_id,
  attachment_path,
  attachment_expires_at
from public.messages
where attachment_path is not null
  and attachment_deleted_at is null
  and attachment_expires_at is not null
  and attachment_expires_at <= now();

-- Manual check:
-- select * from public.expired_chat_attachments order by attachment_expires_at asc limit 100;

-- Do NOT delete from storage.objects in SQL.
-- Use scripts/cleanup-expired-chat-attachments.mjs or another Storage API based job.
