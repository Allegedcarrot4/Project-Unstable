param(
  [string]$TargetDir = "C:\Users\arjun\Desktop\Project-Unstable-Node\Unstable-Node-Backend+Frontend",
  [string]$Message = ""
)

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
  $lastMsg = git log -1 --format=%s 2>$null
  $msg = if ($Message) { $Message } elseif ($lastMsg) { $lastMsg } else { "update" }
  git commit -m $msg
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
  # Generate commit message from diff analysis
  $diff = git diff --cached
  $msgLines = @()
  # Added files
  if ($diff -match '^new file.*\n.*\n\+.*((?:function|class|const|interface|type)\s+\w+)') { $msgLines += "Add $($Matches[1])" }
  # Removed files
  $removed = git diff --cached --diff-filter=D --name-only | ForEach-Object { Split-Path $_ -Leaf }
  if ($removed) { $msgLines += "Remove $($removed -join ', ')" }
  # Renamed files
  $renamed = git diff --cached --diff-filter=R --name-only | ForEach-Object { Split-Path $_ -Leaf }
  if ($renamed) { $msgLines += "Rename $($renamed -join ', ')" }
  # Package changes
  if ($diff -match '"(dependencies|devDependencies)"') { $msgLines += "Update dependencies" }
  # Component/function additions
  $additions = [regex]::Matches($diff, '(?<=^\+)(?!\+)(?:export\s+)?(?:function|class|const|let|var)\s+(\w+)(?:\s*[:=\(])', 'Multiline') | ForEach-Object { $_.Groups[1].Value }
  if ($additions) { $msgLines += "Add $($additions -join ', ')" }
  # Removals of known patterns
  $removals = [regex]::Matches($diff, '(?<=^\-)(?!\-)(?:export\s+)?(?:function|class|const|let|var)\s+(\w+)(?:\s*[:=\(])', 'Multiline') | ForEach-Object { $_.Groups[1].Value }
  if ($removals) { $msgLines += "Remove $($removals -join ', ')" }
  # Property additions in objects
  $props = [regex]::Matches($diff, '(?<=^\+)\s+(\w+):', 'Multiline') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -notmatch '^(id|name|url|key|className|style)$' } | Select-Object -Unique
  if ($props -and $additions.Count -eq 0) { $msgLines += "Add $($props -join ', ') settings" }
  # Fallback
  if ($msgLines.Count -eq 0) {
    $files = git diff --cached --stat --name-only | ForEach-Object { Split-Path $_ -Leaf }
    $msgLines = @("Update $($files -join ', ')")
  }
  $summary = $msgLines -join "; "
  if ($summary.Length -gt 200) { $summary = $summary.Substring(0, 197) + "..." }
  git commit -m $summary
  # Split and push frontend subtree to frontend-only repo
  Write-Host "    Splitting frontend subtree..." -ForegroundColor Gray
  $feOut = git subtree split --prefix=frontend --branch=frontend-deploy 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "    Pushing frontend → GitHub (frontend)..." -ForegroundColor Gray
    git push frontend frontend-deploy:main --force 2>&1 | Out-Host
    git branch -D frontend-deploy 2>$null
    Write-Host "    ✓ Frontend pushed" -ForegroundColor Green
  } else { Write-Host "    ✗ Frontend split failed: $feOut" -ForegroundColor DarkRed }
  # Split and push backend subtree to HF
  Write-Host "    Splitting backend subtree..." -ForegroundColor Gray
  $beOut = git subtree split --prefix=backend --branch=backend-deploy 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "    Pushing backend → HF (hf-spaces)..." -ForegroundColor Gray
    git push hf-spaces backend-deploy:main --force 2>&1 | Out-Host
    git branch -D backend-deploy 2>$null
    Write-Host "    ✓ Backend pushed" -ForegroundColor Green
  } else { Write-Host "    ✗ Backend split failed: $beOut" -ForegroundColor DarkRed }
} else { Write-Host "    No changes, skipping" -ForegroundColor Gray }
Pop-Location

$ErrorActionPreference = $prevEAP
Write-Host "=== Done! ===" -ForegroundColor Green
