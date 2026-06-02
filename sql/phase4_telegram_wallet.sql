-- =====================================================
-- Per-wallet Telegram routing
-- Stores which wallet a Telegram link should route to.
-- =====================================================

alter table public.telegram_links
  add column if not exists active_workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.telegram_link_codes
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
