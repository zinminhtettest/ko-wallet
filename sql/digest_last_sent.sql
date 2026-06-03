-- Track when the digest was last sent for each user so the cron can be
-- resilient to GitHub Actions schedule skips/delays.
alter table public.digest_prefs
  add column if not exists last_sent_at timestamptz;
