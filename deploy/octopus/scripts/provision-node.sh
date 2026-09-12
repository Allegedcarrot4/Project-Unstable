#!/usr/bin/env bash
# Octopus step: "Provision Node 22 + pnpm" (Run a Script, Bash)
# Installs Node 22 to /opt/node, enables corepack/pnpm, creates the "unstable" user. Idempotent.
set -euo pipefail

NODE_MAJOR="${NODE_MAJOR:-22}"
NODE_DIR="/opt/node"
SERVICE_USER="unstable"

if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq curl tar xz-utils ca-certificates >/dev/null
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[provision] Installing Node ${NODE_MAJOR}..."
  curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/node-v${NODE_MAJOR}.x-linux-x64.tar.xz" -o /tmp/node.tar.xz
  mkdir -p "${NODE_DIR}"
  tar -xJf /tmp/node.tar.xz --strip-components=1 -C "${NODE_DIR}"
  rm -f /tmp/node.tar.xz
fi

export PATH="${NODE_DIR}/bin:${PATH}"
node --version

corepack enable
corepack prepare pnpm@10.33.0 --activate 2>/dev/null || corepack prepare pnpm@latest-10 --activate
pnpm --version

if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /opt/unstable --shell /usr/sbin/nologin "${SERVICE_USER}"
  echo "[provision] created user '${SERVICE_USER}'"
fi

echo "[provision] done"
