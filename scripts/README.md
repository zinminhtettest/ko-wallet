# Ko Wallet — VPS Deploy Scripts

## Files

| File | Purpose |
|---|---|
| `server-setup.sh` | ONE-TIME bootstrap for a fresh Ubuntu 24.04 VPS (firewall, Docker, Caddy, fail2ban) |
| `Caddyfile` | Production reverse-proxy config — copy to `/etc/caddy/Caddyfile` |
| `deploy.sh` | Push the current git HEAD from your Mac to the VPS + rebuild Docker |
| `backup.sh` | Weekly `.env` + Caddyfile backup to Backblaze B2 (runs on VPS via cron) |

## First-time setup on a new VPS

### 1. On the VPS (SSH in as root):

```bash
curl -fsSL https://raw.githubusercontent.com/zinminhtettest/ko-wallet/main/scripts/server-setup.sh -o setup.sh
chmod +x setup.sh
./setup.sh
```

### 2. Add SSH key from your Mac (so you can deploy without password):

```bash
# From your Mac:
ssh-copy-id root@<VPS_IP>
```

### 3. Create `.env` on the VPS at `/opt/ko-wallet/.env`:

Copy all env vars from Vercel dashboard. Key ones:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` = `https://kowallet.app`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Gmail OAuth)
- `KRUNGTHAI_EMAIL_SENDERS`
- `CRON_SECRET`

Then: `chmod 600 /opt/ko-wallet/.env`

### 4. Install Caddyfile:

```bash
cp /opt/ko-wallet/scripts/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
```

### 5. Deploy from your Mac:

```bash
./scripts/deploy.sh
```

### 6. Point DNS at the VPS:

Cloudflare → kowallet.app → DNS → A record `@` → `<VPS_IP>`. Keep proxy OFF (grey cloud) for first HTTPS cert issue. Turn proxy ON after Caddy has the cert (~30 seconds).

Then set Cloudflare SSL/TLS mode = **Full (Strict)**.

## Regular deploys

Every push after that just needs:

```bash
git push
./scripts/deploy.sh
```

## Weekly backup (one-time cron setup on VPS)

```bash
pip install --break-system-packages b2
b2 authorize-account <keyID> <appKey>
b2 bucket create ko-wallet-vps-backup allPrivate
cp /opt/ko-wallet/scripts/backup.sh /opt/backup/backup.sh
chmod +x /opt/backup/backup.sh
(crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/backup/backup.sh >> /var/log/backup.log 2>&1") | crontab -
```
