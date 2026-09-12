#!/usr/bin/env bash
# Octopus step: "Configure env, systemd unit, start" (Run a Script, Bash)
# Generates /opt/unstable/.env from Octopus variables, installs the systemd
# unit for the "unstable" service, and (re)starts it.
set -euo pipefail

export PATH="/opt/node/bin:${PATH}"
APP_DIR="${APP_DIR:-/opt/unstable}"
SERVICE_NAME="unstable"
SERVICE_USER="unstable"

chown -R "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}"

escape() { printf '%s' "$1" | sed "s/'/'\\\\''/g"; }

: > "${APP_DIR}/.env"
write_env() {
  local key="$1" value="${2:-}"
  if [ -n "${value}" ]; then
    printf '%s=%s\n' "${key}" "'$(escape "${value}")'" >> "${APP_DIR}/.env"
  fi
}

write_env PORT "${PORT:-7860}"
write_env PASSWORD "${PASSWORD:-}"
write_env SESSION_SECRET "${SESSION_SECRET:-}"
write_env SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY:-}"
write_env DATABASE_URL "${DATABASE_URL:-}"
write_env VITE_SUPABASE_URL "${VITE_SUPABASE_URL:-}"
write_env VITE_SUPABASE_ANON_KEY "${VITE_SUPABASE_ANON_KEY:-}"
write_env VITE_SUPABASE_PROJECT_ID "${VITE_SUPABASE_PROJECT_ID:-}"

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<UNIT
[Unit]
Description=Unstable web proxy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
ExecStart=/opt/node/bin/node --enable-source-maps ./artifacts/api-server/dist/index.mjs
Restart=on-failure
RestartSec=5
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
systemctl --no-pager --lines=20 status "${SERVICE_NAME}" || true

echo "[configure] ${SERVICE_NAME} (re)started"
