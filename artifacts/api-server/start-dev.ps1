$envFile = 'C:\Users\arjun\Desktop\PROJECT-UNSTABLENODE\.local\api-server.env.ps1'
if (Test-Path $envFile) { . $envFile }
Set-Location 'C:\Users\arjun\Desktop\PROJECT-UNSTABLENODE'
pnpm --filter @workspace/api-server build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node --enable-source-maps ./artifacts/api-server/dist/index.mjs
