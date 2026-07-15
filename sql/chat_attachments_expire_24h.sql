-- VIVOS Messenger 24h chat attachment expiry
-- Run this in Supabase SQL Editor after chat_attachments_setup.sql.
-- New attachments expire after 24 hours. Expired files are removed from Storage
-- when public.cleanup_expired_chat_attachments() is executed.

alter table public.messages
  add column if not exists attachment_path text,
  add column if not exists attachment_expires_at timestamptz,
  add column if not exists attachment_deleted_at timestamptz;

create index if not exists messages_attachment_expiry_idx
  on public.messages (attachment_expires_at)
  where attachment_path is not null and attachment_deleted_at is null;

create or replace function public.cleanup_expired_chat_attachments()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  deleted_count integer := 0;
begin
  with expired as (
    select id, attachment_path
    from public.messages
    where attachment_path is not null
      and attachment_deleted_at is null
      and attachment_expires_at is not null
      and attachment_expires_at <= now()
  ), deleted_objects as (
    delete from storage.objects o
    using expired e
    where o.bucket_id = 'chat-attachments'
      and o.name = e.attachment_path
    returning o.name
  ), updated_messages as (
    update public.messages m
    set
      attachment_url = null,
      attachment_deleted_at = now()
    from expired e
    where m.id = e.id
    returning m.id
  )
  select count(*) into deleted_count from updated_messages;

  return deleted_count;
end;
$$;

-- Optional, if pg_cron is enabled in your Supabase project:
-- select cron.schedule(
--   'vivos-cleanup-expired-chat-attachments-hourly',
--   '17 * * * *',
--   $$select public.cleanup_expired_chat_attachments();$$
-- );

-- Manual test/run:
-- select public.cleanup_expired_chat_attachments();
