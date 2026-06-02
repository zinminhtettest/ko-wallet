-- =====================================================
-- Phase 5.7 — User-level settings (FX rates for net worth)
-- =====================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  base_currency text not null default 'THB',
  rate_thb_to_mmk numeric not null default 130,    -- 1 THB ≈ 130 MMK
  rate_thb_to_usd numeric not null default 0.028,  -- 1 THB ≈ 0.028 USD
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "own_user_settings" on public.user_settings;
create policy "own_user_settings" on public.user_settings for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
grant all on public.user_settings to authenticated, service_role;
