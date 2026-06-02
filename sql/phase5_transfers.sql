-- =====================================================
-- Phase 5.4 — Transfers between wallets
-- =====================================================

-- Two transaction rows share the same transfer_id (one outgoing expense
-- in the source wallet, one incoming income in the destination wallet).
alter table public.transactions
  add column if not exists transfer_id uuid;

create index if not exists transactions_transfer_id_idx
  on public.transactions(transfer_id)
  where transfer_id is not null;

-- Allow 'transfer' as a source.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
      and conname like '%source%'
  loop
    execute format('alter table public.transactions drop constraint %I', c.conname);
  end loop;
end$$;

alter table public.transactions
  add constraint transactions_source_check
  check (source is null or source in (
    'manual',
    'krungthai_email',
    'telegram_text',
    'telegram_voice',
    'telegram_photo',
    'recurring',
    'transfer'
  ));

-- =====================================================
-- Phase 5.5 — Digest preferences
-- =====================================================
create table if not exists public.digest_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  frequency text not null default 'weekly' check (frequency in ('off','daily','weekly')),
  hour_local int not null default 20 check (hour_local between 0 and 23),
  day_of_week int not null default 0 check (day_of_week between 0 and 6), -- 0=Sun
  tz_offset_minutes int not null default 420, -- +07:00 default (Bangkok)
  updated_at timestamptz not null default now()
);
alter table public.digest_prefs enable row level security;
drop policy if exists "own_digest_pref" on public.digest_prefs;
create policy "own_digest_pref" on public.digest_prefs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
grant all on public.digest_prefs to authenticated, service_role;
