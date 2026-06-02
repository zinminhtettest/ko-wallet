-- =====================================================
-- PHASE 4 MIGRATIONS — run in Supabase SQL editor
-- =====================================================

-- ---- 1. RECURRING RULES ----
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null,
  currency text not null,
  kind text not null check (kind in ('expense','income')),
  category_id uuid references public.categories(id) on delete set null,
  merchant text,
  note text,
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  next_run_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.recurring_rules enable row level security;
drop policy if exists "ws_member_recurring" on public.recurring_rules;
create policy "ws_member_recurring" on public.recurring_rules for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
grant all on public.recurring_rules to authenticated, service_role;

-- ---- 2. BUDGETS ----
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  amount numeric(14,2) not null,
  currency text not null,
  period text not null default 'monthly' check (period in ('monthly')),
  created_at timestamptz default now(),
  unique(workspace_id, category_id, period)
);
alter table public.budgets enable row level security;
drop policy if exists "ws_member_budgets" on public.budgets;
create policy "ws_member_budgets" on public.budgets for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
grant all on public.budgets to authenticated, service_role;

-- ---- 3. TELEGRAM LINKS ----
create table if not exists public.telegram_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_id bigint not null unique,
  username text,
  linked_at timestamptz not null default now()
);
alter table public.telegram_links enable row level security;
drop policy if exists "own_telegram_link" on public.telegram_links;
create policy "own_telegram_link" on public.telegram_links for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
grant all on public.telegram_links to authenticated, service_role;

-- Pending telegram link codes (6-digit) — service_role only
create table if not exists public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.telegram_link_codes enable row level security;
-- Only service role inserts/reads these — no policies for authenticated
grant all on public.telegram_link_codes to service_role;

-- ---- 4. Helper RPC: budget usage for active workspace ----
create or replace function public.budget_status(ws_id uuid)
returns table (
  category_id uuid,
  category_name text,
  category_icon text,
  category_color text,
  amount numeric,
  currency text,
  spent numeric,
  pct numeric
)
language sql
security definer
set search_path = public
as $$
  with month_start as (
    select date_trunc('month', now() at time zone 'utc') as ms
  )
  select
    b.category_id,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    b.amount,
    b.currency,
    coalesce(sum(t.amount), 0) as spent,
    case when b.amount > 0
      then round((coalesce(sum(t.amount), 0) / b.amount) * 100, 1)
      else 0 end as pct
  from public.budgets b
  left join public.categories c on c.id = b.category_id
  left join public.transactions t
    on t.workspace_id = b.workspace_id
   and t.category_id = b.category_id
   and t.currency = b.currency
   and t.kind = 'expense'
   and t.occurred_at >= (select ms from month_start)
  where b.workspace_id = ws_id
  group by b.category_id, c.name, c.icon, c.color, b.amount, b.currency;
$$;

grant execute on function public.budget_status(uuid) to authenticated, service_role;
