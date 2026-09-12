#!/usr/bin/env bash
# Octopus step: "Health check" (Run a Script, Bash)
# Polls /api/healthz and the frontend root; exits 1 (failing the deployment)
# if the service does not come up in time.
set -uo pipefail

PORT="${PORT:-7860}"
BASE="http://127.0.0.1:${PORT}"

for i in $(seq 1 30); do
  if curl -fsS "${BASE}/api/healthz" 2>/dev/null | grep -q '"status":"ok"'; then
    echo "[health] API healthy after ${i} tries"
    if curl -fsS "${BASE}/" -o /dev/null; then
      echo "[health] frontend reachable"
      exit 0
    fi
  fi
  sleep 2
done

echo "[health] FAILED — service not healthy" >&2
journalctl -u unstable --no-pager -n 50 2>/dev/null || true
exit 1
