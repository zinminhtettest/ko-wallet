-- =========================================================
-- Money Tracker — Supabase Schema (Postgres)
-- Run this in Supabase SQL Editor after creating the project.
-- =========================================================

-- Enable extensions
create extension if not exists "pgcrypto";

-- ---------------- WORKSPACES ----------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  default_currency text not null default 'THB',
  created_at timestamptz not null default now()
);

-- ---------------- WORKSPACE MEMBERS ----------------
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- 'owner' | 'member'
  joined_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

-- ---------------- WORKSPACE INVITES ----------------
create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------- CATEGORIES ----------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  icon text not null default 'wallet',
  color text not null default '#3b82f6',
  kind text not null default 'expense', -- 'expense' | 'income'
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------- TRANSACTIONS ----------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(14,2) not null,
  currency text not null default 'THB', -- THB | MMK | USD
  kind text not null, -- 'expense' | 'income'
  note text,
  merchant text,
  occurred_at timestamptz not null default now(),
  source text not null default 'manual', -- 'manual' | 'krungthai_email'
  source_ref text, -- gmail message id for dedup
  raw_email text,  -- store original email for audit
  created_at timestamptz not null default now()
);

create index if not exists transactions_workspace_idx on public.transactions(workspace_id, occurred_at desc);
create unique index if not exists transactions_source_ref_unique
  on public.transactions(workspace_id, source_ref) where source_ref is not null;

-- ---------------- GMAIL CONNECTIONS ----------------
create table if not exists public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  is_active boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, workspace_id)
);

-- ============================================
-- RLS (Row Level Security) — Shared Workspace
-- All workspace members can read/write all rows in the workspace
-- ============================================
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.categories        enable row level security;
alter table public.transactions      enable row level security;
alter table public.gmail_connections enable row level security;

-- Helper: function to check workspace membership
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- workspaces policies
drop policy if exists "ws_select" on public.workspaces;
create policy "ws_select" on public.workspaces
  for select using (public.is_workspace_member(id));
drop policy if exists "ws_insert" on public.workspaces;
create policy "ws_insert" on public.workspaces
  for insert with check (owner_id = auth.uid());
drop policy if exists "ws_update" on public.workspaces;
create policy "ws_update" on public.workspaces
  for update using (owner_id = auth.uid());
drop policy if exists "ws_delete" on public.workspaces;
create policy "ws_delete" on public.workspaces
  for delete using (owner_id = auth.uid());

-- workspace_members policies
drop policy if exists "wm_select" on public.workspace_members;
create policy "wm_select" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));
drop policy if exists "wm_insert" on public.workspace_members;
create policy "wm_insert" on public.workspace_members
  for insert with check (
    user_id = auth.uid()
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );
drop policy if exists "wm_delete" on public.workspace_members;
create policy "wm_delete" on public.workspace_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
  );

-- workspace_invites policies
drop policy if exists "wi_select" on public.workspace_invites;
create policy "wi_select" on public.workspace_invites
  for select using (public.is_workspace_member(workspace_id));
drop policy if exists "wi_insert" on public.workspace_invites;
create policy "wi_insert" on public.workspace_invites
  for insert with check (public.is_workspace_member(workspace_id));
drop policy if exists "wi_delete" on public.workspace_invites;
create policy "wi_delete" on public.workspace_invites
  for delete using (public.is_workspace_member(workspace_id));

-- categories policies
drop policy if exists "cat_all" on public.categories;
create policy "cat_all" on public.categories
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- transactions policies (shared workspace — all members see/edit)
drop policy if exists "tx_all" on public.transactions;
create policy "tx_all" on public.transactions
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- gmail_connections — only the owner of the connection can see/manage
drop policy if exists "gc_owner" on public.gmail_connections;
create policy "gc_owner" on public.gmail_connections
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================
-- TRIGGERS: Auto-create workspace & defaults on user signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_ws_id uuid;
begin
  -- Create default workspace
  insert into public.workspaces (name, owner_id, default_currency)
  values (coalesce(new.raw_user_meta_data->>'full_name', new.email) || '''s Wallet', new.id, 'THB')
  returning id into new_ws_id;

  -- Add user as owner-member
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_ws_id, new.id, 'owner');

  -- Seed default categories
  insert into public.categories (workspace_id, name, icon, color, kind, is_system) values
    (new_ws_id, 'Food',         'utensils',   '#ef4444', 'expense', true),
    (new_ws_id, 'Transport',    'car',        '#f59e0b', 'expense', true),
    (new_ws_id, 'Shopping',     'shopping-bag','#ec4899', 'expense', true),
    (new_ws_id, 'Bills',        'receipt',    '#8b5cf6', 'expense', true),
    (new_ws_id, 'Health',       'heart',      '#10b981', 'expense', true),
    (new_ws_id, 'Entertainment','film',       '#06b6d4', 'expense', true),
    (new_ws_id, 'Education',    'book-open',  '#6366f1', 'expense', true),
    (new_ws_id, 'Travel',       'plane',      '#0ea5e9', 'expense', true),
    (new_ws_id, 'Bank Fee',     'banknote',   '#64748b', 'expense', true),
    (new_ws_id, 'Other',        'wallet',     '#94a3b8', 'expense', true),
    (new_ws_id, 'Salary',       'briefcase',  '#22c55e', 'income',  true),
    (new_ws_id, 'Business',     'trending-up','#16a34a', 'income',  true),
    (new_ws_id, 'Gift',         'gift',       '#84cc16', 'income',  true),
    (new_ws_id, 'Other Income', 'plus-circle','#65a30d', 'income',  true);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
