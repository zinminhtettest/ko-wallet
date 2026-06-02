-- =====================================================
-- Phase 7.2 — Client invoice ledger (mini-CRM)
-- =====================================================

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  contact text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;
drop policy if exists "ws_member_clients" on public.clients;
create policy "ws_member_clients" on public.clients for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
grant all on public.clients to authenticated, service_role;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(14,2) not null,
  currency text not null,
  description text,
  status text not null default 'unpaid' check (status in ('unpaid','paid','overdue','cancelled')),
  issued_at date not null default current_date,
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.invoices enable row level security;
drop policy if exists "ws_member_invoices" on public.invoices;
create policy "ws_member_invoices" on public.invoices for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
grant all on public.invoices to authenticated, service_role;

create index if not exists invoices_client_idx on public.invoices(client_id);
create index if not exists invoices_status_idx on public.invoices(status);
