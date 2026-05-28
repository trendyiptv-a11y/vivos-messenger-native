-- VIVOS Messenger durable call signaling fallback
-- Rulează acest SQL în Supabase SQL Editor înainte de build/test.
-- Scop: semnalele WebRTC/call care se pierd la cold-start sunt salvate temporar și recuperate când aplicația se deschide.

create table if not exists public.vivos_call_signals (
  id uuid primary key default gen_random_uuid(),
  call_session_id text not null,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  from_user_id uuid not null,
  to_user_id uuid,
  signal_type text not null check (
    signal_type in (
      'call_invite',
      'call_accept',
      'call_reject',
      'call_end',
      'webrtc_offer',
      'webrtc_answer',
      'ice_candidate'
    )
  ),
  call_type text not null check (call_type in ('audio', 'video')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

create index if not exists vivos_call_signals_conversation_created_idx
  on public.vivos_call_signals (conversation_id, created_at desc);

create index if not exists vivos_call_signals_to_user_created_idx
  on public.vivos_call_signals (to_user_id, created_at desc);

create index if not exists vivos_call_signals_expires_idx
  on public.vivos_call_signals (expires_at);

alter table public.vivos_call_signals enable row level security;

-- Userul poate citi semnale doar pentru conversațiile din care face parte.
drop policy if exists "vivos_call_signals_select_members" on public.vivos_call_signals;
create policy "vivos_call_signals_select_members"
  on public.vivos_call_signals
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = vivos_call_signals.conversation_id
        and cm.member_id = auth.uid()
    )
  );

-- Userul poate insera semnale doar ca el însuși și doar în conversațiile din care face parte.
drop policy if exists "vivos_call_signals_insert_members" on public.vivos_call_signals;
create policy "vivos_call_signals_insert_members"
  on public.vivos_call_signals
  for insert
  to authenticated
  with check (
    from_user_id = auth.uid()
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = vivos_call_signals.conversation_id
        and cm.member_id = auth.uid()
    )
  );

-- Opțional: permite utilizatorului să șteargă propriile semnale expirate.
drop policy if exists "vivos_call_signals_delete_own_expired" on public.vivos_call_signals;
create policy "vivos_call_signals_delete_own_expired"
  on public.vivos_call_signals
  for delete
  to authenticated
  using (
    from_user_id = auth.uid()
    and expires_at < now()
  );

-- IMPORTANT pentru Supabase Realtime:
-- După rularea SQL, activează Realtime pentru tabela public.vivos_call_signals din Dashboard:
-- Database → Replication → Source public → bifează vivos_call_signals
-- Dacă tabela este deja în publication, comanda de mai jos poate da eroare; în acest caz ignoră eroarea.
-- alter publication supabase_realtime add table public.vivos_call_signals;
