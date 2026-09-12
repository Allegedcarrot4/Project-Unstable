$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot
pnpm --filter @workspace/api-server build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node --enable-source-maps ./artifacts/api-server/dist/index.mjs
