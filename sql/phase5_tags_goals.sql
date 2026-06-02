-- =====================================================
-- Phase 5.10 + 7.1 — Saving goals + tax-deductible tagging
-- =====================================================

-- Tax-deductible flag on transactions
alter table public.transactions
  add column if not exists tax_deductible boolean not null default false;

create index if not exists transactions_tax_idx
  on public.transactions(workspace_id)
  where tax_deductible = true;

-- Free-text tags (small, optional)
alter table public.transactions
  add column if not exists tags text[] default null;

-- Savings goals per workspace
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  currency text not null,
  deadline date,
  created_at timestamptz not null default now()
);
alter table public.savings_goals enable row level security;
drop policy if exists "ws_member_goals" on public.savings_goals;
create policy "ws_member_goals" on public.savings_goals for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
grant all on public.savings_goals to authenticated, service_role;
