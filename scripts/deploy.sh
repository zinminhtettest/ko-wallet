#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Ko Wallet — deploy the current git HEAD to the HostHatch VPS.
# Runs from your Mac; SSH-copies the repo to the server and rebuilds.
#
# Usage:  ./scripts/deploy.sh
#         VPS_HOST=root@1.2.3.4 ./scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

VPS_HOST="${VPS_HOST:-root@167.104.100.115}"
APP_DIR="/opt/ko-wallet"

echo "▶ Deploying to $VPS_HOST:$APP_DIR"

# Guard: warn if there are uncommitted changes (the tarball will still ship
# them, but you'll want to commit before pushing to git afterwards).
if ! git diff --quiet HEAD --; then
  echo "⚠ Uncommitted changes detected — they will still be shipped."
fi

# Build a minimal tarball (respects .dockerignore + .gitignore).
TAR=/tmp/ko-wallet-deploy.tgz
tar --exclude='.git' --exclude='node_modules' --exclude='.next' \
    --exclude='.vercel' --exclude='.env.local' --exclude='.env*.local' \
    -czf "$TAR" .

echo "▶ Uploading $(du -h $TAR | awk '{print $1}')…"
ssh "$VPS_HOST" "mkdir -p $APP_DIR"
scp -q "$TAR" "$VPS_HOST:$APP_DIR/deploy.tgz"

# Remote unpack + rebuild.
ssh "$VPS_HOST" bash -s <<REMOTE
set -euo pipefail
cd $APP_DIR
tar xzf deploy.tgz
rm deploy.tgz

if [ ! -f .env ]; then
  echo "❌ /opt/ko-wallet/.env is missing. Copy your Vercel env vars there first."
  exit 1
fi

echo "▶ Building Docker image (this takes ~1-3 min)…"
docker compose build --pull
docker compose up -d --remove-orphans

echo "▶ Waiting for health check…"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fs http://127.0.0.1:3000/api/health >/dev/null; then
    echo "✓ Ko Wallet is live on 127.0.0.1:3000"
    break
  fi
  sleep 3
done

# Prune old images so the disk doesn't fill up over months of deploys.
docker image prune -f >/dev/null
REMOTE

rm "$TAR"
echo "✓ Deploy complete."
