-- delete_workspace(workspace_id uuid) — owner-only hard delete.
-- Cascades to every workspace-scoped table the app writes to. Run once in the
-- Supabase SQL editor; subsequent deploys do not need this.
--
-- Returns true on success. Raises an error if the caller is not the owner.

create or replace function public.delete_workspace(ws_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'unauthorized';
  end if;

  select owner_id into v_owner
  from public.workspaces
  where id = ws_id;

  if v_owner is null then
    raise exception 'workspace_not_found';
  end if;
  if v_owner <> v_caller then
    raise exception 'only_owner';
  end if;

  -- Children — order matters where there are inter-table FKs.
  delete from public.transactions       where workspace_id = ws_id;
  delete from public.categories         where workspace_id = ws_id;
  delete from public.workspace_invites  where workspace_id = ws_id;
  delete from public.workspace_members  where workspace_id = ws_id;

  -- Optional / feature tables — wrapped in DO blocks so the function still
  -- works on installations that haven't run later phase migrations.
  begin delete from public.recurring_rules    where workspace_id = ws_id; exception when undefined_table then null; end;
  begin delete from public.budgets            where workspace_id = ws_id; exception when undefined_table then null; end;
  begin delete from public.savings_goals      where workspace_id = ws_id; exception when undefined_table then null; end;
  begin delete from public.bank_accounts      where workspace_id = ws_id; exception when undefined_table then null; end;
  begin delete from public.investments        where workspace_id = ws_id; exception when undefined_table then null; end;
  begin delete from public.clients            where workspace_id = ws_id; exception when undefined_table then null; end;
  begin delete from public.invoices           where workspace_id = ws_id; exception when undefined_table then null; end;
  begin delete from public.gmail_connections  where workspace_id = ws_id; exception when undefined_table then null; end;
  begin delete from public.digest_prefs       where workspace_id = ws_id; exception when undefined_table then null; end;
  begin delete from public.notifications      where workspace_id = ws_id; exception when undefined_table then null; end;

  -- Clear any telegram link still pointing at this wallet.
  begin
    update public.telegram_links set active_workspace_id = null
    where active_workspace_id = ws_id;
  exception when undefined_column then null;
  end;

  delete from public.workspaces where id = ws_id;
  return true;
end
$$;

grant execute on function public.delete_workspace(uuid) to authenticated;
