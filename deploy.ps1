param(
  [string]$TargetDir = "C:\Users\arjun\Desktop\Project-Unstable-Node\Unstable-Node-Backend+Frontend"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Deploy: Unstable-Node -> $TargetDir ===" -ForegroundColor Cyan

# ── 1. Build frontend ──
Write-Host "[1/4] Building frontend..." -ForegroundColor Yellow
try {
  pnpm --filter @workspace/app run build
  if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
} catch { throw }

# ── 2. Build backend ──
Write-Host "[2/4] Building backend..." -ForegroundColor Yellow
try {
  pnpm --filter @workspace/api-server run build
  if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
} catch { throw }

# ── 3. Sync frontend ──
Write-Host "[3/4] Syncing frontend..." -ForegroundColor Yellow
$frontendDist = "artifacts\app\dist\public"

# Clean target frontend assets (keep non-build files)
if (Test-Path "$TargetDir\frontend\assets") {
  Remove-Item "$TargetDir\frontend\assets\*" -Recurse -Force -ErrorAction SilentlyContinue
}

# Copy the built assets
Copy-Item "$frontendDist\assets\*" "$TargetDir\frontend\assets\" -Recurse -Force

# Copy root-level frontend files from dist (index.html, etc)
Get-ChildItem "$frontendDist" -File | ForEach-Object {
  Copy-Item $_.FullName "$TargetDir\frontend\" -Force
}

# Also sync source files if the other folder uses them (e.g. components, vanta)
$srcFiles = @(
  @{from = "artifacts\app\src\App.tsx"; to = "frontend\src\App.tsx"}
  @{from = "artifacts\app\src\components\VantaBackground.tsx"; to = "frontend\src\components\VantaBackground.tsx"}
  @{from = "artifacts\app\src\vanta.d.ts"; to = "frontend\src\vanta.d.ts"}
)
foreach ($f in $srcFiles) {
  $dest = "$TargetDir\$($f.to)"
  $dir = Split-Path $dest -Parent
  if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Copy-Item $f.from $dest -Force
  Write-Host "  Synced $($f.from)" -ForegroundColor Gray
}

# ── 4. Sync backend ──
Write-Host "[4/4] Syncing backend..." -ForegroundColor Yellow
$backendDist = "artifacts\api-server\dist"
Copy-Item "$backendDist\*" "$TargetDir\backend\dist\" -Recurse -Force

# Copy API .env if it exists
if (Test-Path "artifacts\api-server\.env") {
  Copy-Item "artifacts\api-server\.env" "$TargetDir\backend\.env" -Force
}

Write-Host "=== Done! ===" -ForegroundColor Green
