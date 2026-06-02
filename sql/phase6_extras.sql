-- =====================================================
-- Phase 6 — bills reminder, investments, bank balances, ui language
-- =====================================================

-- Bills reminder: how many days BEFORE next_run_at to push a reminder
alter table public.recurring_rules
  add column if not exists reminder_days_before int not null default 0;
-- Track last reminder sent to avoid spam
alter table public.recurring_rules
  add column if not exists last_reminder_at timestamptz;

-- UI language for in-app UI translation
alter table public.user_settings
  add column if not exists ui_language text not null default 'en'
  check (ui_language in ('en','my','th'));

-- Investment positions per wallet
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  symbol text not null,        -- e.g. AAPL, BTC, ETH, GLD
  asset_type text not null default 'stock'
    check (asset_type in ('stock','crypto','gold','bond','etf','other')),
  quantity numeric(20,8) not null,
  buy_price numeric(20,8) not null,
  buy_currency text not null,
  current_price numeric(20,8),
  current_price_updated_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.investments enable row level security;
drop policy if exists "ws_member_investments" on public.investments;
create policy "ws_member_investments" on public.investments for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
grant all on public.investments to authenticated, service_role;

-- Bank account balances per wallet
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  bank_name text not null,
  account_label text,
  currency text not null,
  balance numeric(14,2) not null default 0,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.bank_accounts enable row level security;
drop policy if exists "ws_member_bank_accounts" on public.bank_accounts;
create policy "ws_member_bank_accounts" on public.bank_accounts for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
grant all on public.bank_accounts to authenticated, service_role;
