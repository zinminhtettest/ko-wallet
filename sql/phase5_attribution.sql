-- =====================================================
-- Phase 5/6 — attribution + extended source enum
-- =====================================================

-- Denormalized snapshot of who created the transaction.
-- We snapshot the name so the row stays meaningful even if the user later
-- leaves the workspace or renames their account.
alter table public.transactions
  add column if not exists created_by_name text;

alter table public.transactions
  add column if not exists telegram_username text;

-- Drop the old CHECK constraint on `source` and recreate it with the new
-- values we use (telegram_text, telegram_voice, telegram_photo).
-- Postgres won't expose the constraint by name reliably across projects, so
-- use a DO block to drop any check constraint on this column.
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

-- Re-add a permissive check that documents the valid values without being
-- strict (keeps future flexibility).
alter table public.transactions
  add constraint transactions_source_check
  check (source is null or source in (
    'manual',
    'krungthai_email',
    'telegram_text',
    'telegram_voice',
    'telegram_photo',
    'recurring'
  ));
