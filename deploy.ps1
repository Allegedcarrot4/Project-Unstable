param(
  [string]$TargetDir = "C:\Users\arjun\Desktop\Project-Unstable-Node\Unstable-Node-Backend+Frontend",
  [string]$Message = ""
)

if (!$Message) { $Message = "deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }

Write-Host "=== Deploy: Unstable-Node -> $TargetDir ===" -ForegroundColor Cyan

function Run-Build {
  param($Name, $Command)
  Write-Host "[*] Building $Name..." -ForegroundColor Yellow
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Stop"
  try {
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) { throw "$Name build failed (exit $LASTEXITCODE)" }
  } finally { $ErrorActionPreference = $prev }
}

Run-Build "frontend" "pnpm --filter @workspace/app run build"
Run-Build "backend" "pnpm --filter @workspace/api-server run build"

# ── Sync frontend ──
Write-Host "[3/5] Syncing frontend to target..." -ForegroundColor Yellow
$frontendDist = "artifacts\app\dist\public"
if (Test-Path "$TargetDir\frontend\assets") {
  Remove-Item "$TargetDir\frontend\assets\*" -Recurse -Force -ErrorAction SilentlyContinue
}
Copy-Item "$frontendDist\assets\*" "$TargetDir\frontend\assets\" -Recurse -Force
Get-ChildItem "$frontendDist" -File | ForEach-Object {
  Copy-Item $_.FullName "$TargetDir\frontend\" -Force
}
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
}
Write-Host "  Frontend synced" -ForegroundColor Gray

# ── Sync backend ──
Write-Host "[4/5] Syncing backend to target..." -ForegroundColor Yellow
Copy-Item "artifacts\api-server\dist\*" "$TargetDir\backend\dist\" -Recurse -Force
if (Test-Path "artifacts\api-server\.env") {
  Copy-Item "artifacts\api-server\.env" "$TargetDir\backend\.env" -Force
}
Write-Host "  Backend synced" -ForegroundColor Gray

# ── Git push both repos ──
Write-Host "[5/5] Pushing to git..." -ForegroundColor Yellow
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"

# This repo
Write-Host "  This repo:" -ForegroundColor Gray
git add -A 2>$null
$c = git status --porcelain
if ($c) {
  git commit -m $Message
  Write-Host "    Pushing → GitHub (origin)..." -ForegroundColor Gray
  git push -u origin main --force 2>&1 | Out-Null
  Write-Host "    Pushing → HF (space)..." -ForegroundColor Gray
  git push space main --force 2>&1 | Out-Null
} else { Write-Host "    No changes, skipping" -ForegroundColor Gray }

# Target repo
Write-Host "  Target repo ($TargetDir):" -ForegroundColor Gray
Push-Location $TargetDir
git add -A 2>$null
$c2 = git status --porcelain
if ($c2) {
  git commit -m $Message
  Write-Host "    Pushing → GitHub (origin)..." -ForegroundColor Gray
  git push -u origin main --force 2>&1 | Out-Null
  Write-Host "    Pushing backend → HF (hf-spaces)..." -ForegroundColor Gray
  git push hf-spaces main --force 2>&1 | Out-Null
} else { Write-Host "    No changes, skipping" -ForegroundColor Gray }
Pop-Location

$ErrorActionPreference = $prevEAP
Write-Host "=== Done! ===" -ForegroundColor Green
