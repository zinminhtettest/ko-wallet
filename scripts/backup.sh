#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Weekly VPS backup — .env + Caddyfile + docker-compose.yml.
# Uploads to Backblaze B2 (10 GB free tier).
#
# One-time setup:
#   pip install --break-system-packages b2
#   b2 authorize-account <keyID> <appKey>
#   b2 bucket create ko-wallet-vps-backup --defaultServerSideEncryption=AES256
#
# Cron (weekly Sunday 03:00 Asia/Bangkok):
#   0 3 * * 0 /opt/backup/backup.sh >> /var/log/backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

DATE=$(date +%Y%m%d)
OUT=/tmp/kowallet-vps-$DATE.tgz
BUCKET=ko-wallet-vps-backup

# What to back up — only the stuff GitHub doesn't have.
# (DB is on Supabase, which has its own backups. Code is on GitHub.)
tar czf "$OUT" \
  /opt/ko-wallet/.env \
  /etc/caddy/Caddyfile \
  /opt/ko-wallet/docker-compose.yml \
  2>/dev/null

# Upload with server-side encryption
b2 upload-file "$BUCKET" "$OUT" "kowallet-vps-$DATE.tgz"

# Local cleanup — keep 4 weeks locally
find /tmp -name "kowallet-vps-*.tgz" -mtime +28 -delete

echo "[$(date -Iseconds)] backup complete: kowallet-vps-$DATE.tgz"
