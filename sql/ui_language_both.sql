-- Allow 'both' (Myanmar + English mix) as a valid ui_language value.
-- Safe to re-run.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.user_settings'::regclass
      and contype = 'c' and conname like '%ui_language%'
  loop
    execute format('alter table public.user_settings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.user_settings
  add constraint user_settings_ui_language_check
  check (ui_language is null or ui_language in ('en','my','th','both'));
