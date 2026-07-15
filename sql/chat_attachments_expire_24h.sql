-- VIVOS Messenger 24h chat attachment expiry
-- Run this in Supabase SQL Editor after chat_attachments_setup.sql.
-- New attachments expire after 24 hours. Expired files are removed from Storage
-- when public.cleanup_expired_chat_attachments() is executed.

alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_expires_at timestamptz,
  add column if not exists attachment_deleted_at timestamptz;

create index if not exists messages_attachment_expiry_idx
  on public.messages (attachment