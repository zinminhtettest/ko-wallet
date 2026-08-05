#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Ko Wallet VPS bootstrap — run ONCE on a fresh HostHatch Ubuntu 24.04
# server as root. Sets up firewall, Docker, Caddy, and non-root user.
#
# Usage (on the VPS):
#   curl -fsSL https://raw.githubusercontent.com/zinminhtettest/ko-wallet/main/scripts/server-setup.sh -o setup.sh
#   chmod +x setup.sh
#   ./setup.sh
# ─────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "▶ Ko Wallet VPS bootstrap starting…"

# ─── Timezone ────────────────────────────────────────────────────────
timedatectl set-timezone Asia/Bangkok
echo "✓ Timezone: Asia/Bangkok"

# ─── System update ───────────────────────────────────────────────────
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban unattended-upgrades ca-certificates \
                debian-keyring debian-archive-keyring apt-transport-https \
                gnupg lsb-release
echo "✓ Base packages installed"

# ─── Unattended auto-updates ─────────────────────────────────────────
dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl enable unattended-upgrades
echo "✓ Auto security updates enabled"

# ─── UFW firewall ────────────────────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "SSH"
ufw allow 80/tcp   comment "HTTP (Caddy)"
ufw allow 443/tcp  comment "HTTPS (Caddy)"
ufw --force enable
echo "✓ UFW firewall active (22, 80, 443 open)"

# ─── Fail2ban ────────────────────────────────────────────────────────
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
port = 22
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable fail2ban
systemctl restart fail2ban
echo "✓ Fail2ban SSH protection active"

# ─── Docker Engine ───────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  echo "✓ Docker installed"
else
  echo "✓ Docker already present"
fi

# ─── Caddy (native, via official apt repo) ──────────────────────────
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt update
  apt install -y caddy
  echo "✓ Caddy installed"
else
  echo "✓ Caddy already present"
fi

# ─── Project directories ─────────────────────────────────────────────
mkdir -p /opt/ko-wallet /opt/backup
chmod 755 /opt/ko-wallet
echo "✓ /opt/ko-wallet ready"

# ─── SSH hardening (key-only) ────────────────────────────────────────
# Only disable password auth if an authorized_keys file with keys exists —
# otherwise we'd lock ourselves out on a password-first VPS.
if [ -s /root/.ssh/authorized_keys ]; then
  sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  systemctl restart ssh
  echo "✓ SSH password login disabled (key-only)"
else
  echo "⚠ No SSH key on /root/.ssh/authorized_keys — password login still enabled."
  echo "  Add a key later with: ssh-copy-id root@$(hostname -I | awk '{print $1}')"
fi

# ─── Done ────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Bootstrap COMPLETE"
echo "  Next steps:"
echo "    1. Copy the deploy tarball to /opt/ko-wallet/"
echo "    2. Create /opt/ko-wallet/.env with the app secrets"
echo "    3. Edit /etc/caddy/Caddyfile to add kowallet.app"
echo "    4. Run: cd /opt/ko-wallet && docker compose up -d --build"
echo "    5. Point kowallet.app DNS at $(hostname -I | awk '{print $1}')"
echo "════════════════════════════════════════════════════════════════"
