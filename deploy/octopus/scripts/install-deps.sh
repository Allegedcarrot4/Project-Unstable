#!/usr/bin/env bash
# Octopus step: "Install production dependencies" (Run a Script, Bash)
# Installs prod deps for the API server in the deployed package, then copies
# bare-as-module3 + ws out of the pnpm store (pnpm prod installs miss them —
# same trick as the Dockerfile runner stage).
set -euo pipefail

export PATH="/opt/node/bin:${PATH}"
APP_DIR="${APP_DIR:-/opt/unstable}"
cd "${APP_DIR}"

# The shipped lockfile has a broken bare-mux tarball integrity hash — regenerate it.
rm -f pnpm-lock.yaml

pnpm install --prod --filter @workspace/api-server

mkdir -p node_modules/@mercuryworkshop
bare_dir="$(find node_modules/.pnpm -path '*/@mercuryworkshop/bare-as-module3' -type d | head -n 1 || true)"
ws_dir="$(find node_modules/.pnpm -path '*/node_modules/ws' -type d | head -n 1 || true)"
if [ -n "${bare_dir}" ]; then
  cp -aL "${bare_dir}" node_modules/@mercuryworkshop/bare-as-module3
fi
if [ -n "${ws_dir}" ]; then
  cp -aL "${ws_dir}" node_modules/ws
fi

echo "[install] node_modules ready"
