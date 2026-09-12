#!/usr/bin/env bash
# Manual packaging fallback (the GitHub Actions workflow does the same thing):
# build frontend + api-server, overlay dist onto a git archive of the repo,
# then octo pack + octo push.
# Requires: node 22, pnpm, octo CLI; OCTOPUS_URL, OCTOPUS_API_KEY, OCTOPUS_SPACE set.
set -euo pipefail

VERSION="${1:-$(date +%Y.%m.%d.%H%M)}"
OCTOPUS_URL="${OCTOPUS_URL:?set OCTOPUS_URL}"
OCTOPUS_API_KEY="${OCTOPUS_API_KEY:?set OCTOPUS_API_KEY}"
OCTOPUS_SPACE="${OCTOPUS_SPACE:-Default}"

command -v octo >/dev/null 2>&1 || { echo "octo CLI not found on PATH" >&2; exit 1; }

# Regenerate the lockfile — shipped one has a broken bare-mux integrity hash.
rm -f pnpm-lock.yaml
pnpm install

BASE_PATH=/ PORT=7860 NODE_ENV=production pnpm --filter @workspace/app run build
pnpm --filter @workspace/api-server run build

STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT

git archive HEAD | tar -x -C "${STAGE}"
cp -a artifacts/api-server/dist "${STAGE}/artifacts/api-server/"
cp -a artifacts/app/dist "${STAGE}/artifacts/app/"

mkdir -p packages
octo pack --id Unstable --version "${VERSION}" --basePath "${STAGE}" --outFolder packages --format zip
octo push --package "packages/Unstable.${VERSION}.zip" --server "${OCTOPUS_URL}" --apiKey "${OCTOPUS_API_KEY}" --space "${OCTOPUS_SPACE}"

echo "[pack] pushed Unstable ${VERSION}"
