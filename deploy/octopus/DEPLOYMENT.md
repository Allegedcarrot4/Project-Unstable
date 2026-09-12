# Unstable — Octopus Deploy process

Deploys Unstable (Node web proxy: React frontend + Fastify API / bare server / Wisp) to a **Linux VM** via an Octopus deployment target (Listening Tentacle). The app is not static — it must run as a Node process under systemd.

```
GitHub Actions (build + pack) ──octo push──▶ Octopus Server (project "Unstable")
                                                │  Release
                                                ▼
                                    Linux VM (Tentacle) /opt/unstable
                                    systemd service "unstable"
                                    node ./artifacts/api-server/dist/index.mjs
```

## 1. Prerequisites

- Octopus Server (Cloud or self-hosted) with an account that has an **API key**.
- A **Linux VM** (Ubuntu/Debian recommended) reachable from Octopus.
- Octopus CLI (`octo`) available where packaging runs (installed by the GitHub Action, or locally).
- GitHub repo secrets for the packaging workflow (see §3).

## 2. Deployment target setup

1. Install a **Listening Tentacle** on the VM:
   - `wget https://octopus.com/downloads/tentacle/tentacle-x64-linux.tar.gz`
   - Extract to `/opt/octopus/tentacle`, run `./install.sh`.
   - `tentacle create-instance --instance Tentacle --config /etc/octopus/tentacle.config`
   - Register it: `tentacle register-with --instance Tentacle --server https://your-octopus.example.com --apiKey API-XXXXXXXX --space Default --environment Staging --role linux-app-server` (repeat with `--environment Production` if using one target for both, or create a second target).
   - `tentacle service --instance Tentacle --install --start`.
2. Give the tentacle service write access to `/opt` (tentacle runs as root by default — required so the **Deploy a Package** step can extract to `/opt/unstable`).
3. Outbound network from the VM: `nodejs.org` (provision step), npm registry + GitHub (pnpm install), Octopus server.

## 3. Package creation (CI)

A package named **`Unstable`** contains the full workspace source **plus** the built `artifacts/api-server/dist` and `artifacts/app/dist/public` (both `dist/` folders are gitignored, so builds happen in CI and are overlaid on top of `git archive` output).

### Automatic — GitHub Actions

`.github/workflows/octopus-release.yml` runs on push to `main` or manual dispatch. Add these secrets:

| Secret | Purpose |
|---|---|
| `OCTOPUS_URL` | e.g. `https://your-octopus.example.com` |
| `OCTOPUS_API_KEY` | API key with package push + project edit rights |
| `OCTOPUS_SPACE` | Space name, e.g. `Default` |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Optional; baked into the frontend build |

> The workflow deletes `pnpm-lock.yaml` before installing — the lockfile carries a broken integrity hash for the bare-mux tarball and must be regenerated (same workaround as the Dockerfile).

### Manual fallback

```bash
chmod +x deploy/octopus/scripts/package-and-push.sh
export OCTOPUS_URL=... OCTOPUS_API_KEY=... OCTOPUS_SPACE=Default
./deploy/octopus/scripts/package-and-push.sh 2026.8.1.1200
```

Produces `packages/Unstable.<version>.zip` and pushes it to the Octopus library.

## 4. Project setup in Octopus

- **Project**: `Unstable`, deployment process = steps below.
- **Package**: ID `Unstable`, package format zip (as pushed above).
- **Lifecycle**: `Staging` → `Production` with a manual approval gate (the Manual Intervention step is what enforces it).
- **Deployment target role**: `linux-app-server`.

### Project variables

| Name | Type | Scope | Notes |
|---|---|---|---|
| `PORT` | String | All | default `7860` (script falls back if unset) |
| `PASSWORD` | Sensitive | Staging / Production (per-env) | optional — if set, visitors must enter it on the login screen; if unset, no login screen |
| `SESSION_SECRET` | Sensitive | All | recommended |
| `SUPABASE_SERVICE_ROLE_KEY` | Sensitive | All | optional |
| `DATABASE_URL` | Sensitive | All | optional (DB migrations not part of this process) |
| `VITE_SUPABASE_URL` | String | All | build-time for the frontend; harmless at runtime |
| `VITE_SUPABASE_ANON_KEY` | String | All | same |
| `VITE_SUPABASE_PROJECT_ID` | String | All | same |

Sensitive variables are masked in logs and written to `/opt/unstable/.env` on the target. **Never put secrets in the package or git.**

## 5. The deployment process

Add these steps to the project's process (in this order):

### Step 1 — Manual Intervention Required
| Setting | Value |
|---|---|
| Template | `Manual Intervention Required` (Octopus Deploy) |
| Notes | "Review the release. Verify the proxy is healthy in Staging before allowing Production." |
| Run condition | Only when `#{Octopus.Environment.Name}` equals `Production` |

Pauses the deployment until a human approves. Skips automatically in Staging.

### Step 2 — Run a Script: "Provision Node 22 + pnpm"
| Setting | Value |
|---|---|
| Template | `Run a Script` (Bash) |
| Target | `linux-app-server` |
| Script | Contents of `deploy/octopus/scripts/provision-node.sh` |

Installs Node 22 (`/opt/node`), enables corepack with pnpm (10.33.0, matching the repo pin), and creates the `unstable` system user. Idempotent.

### Step 3 — Deploy a Package
| Setting | Value |
|---|---|
| Template | `Deploy a Package` (Octopus Deploy) |
| Package ID | `Unstable` |
| Deployment targets | `linux-app-server` |
| Destination | **Custom installation directory** → `/opt/unstable` |
| Clean up existing installation directory before deployment | ✅ ON |

Extracts the source + dist bundle to `/opt/unstable`. Old process keeps running old code until Step 5 restarts the service (no downtime window concern on Linux).

### Step 4 — Run a Script: "Install production dependencies"
| Setting | Value |
|---|---|
| Template | `Run a Script` (Bash) |
| Target | `linux-app-server` |
| Script | Contents of `deploy/octopus/scripts/install-deps.sh` |

Runs `rm -f pnpm-lock.yaml && pnpm install --prod --filter @workspace/api-server`, then copies `@mercuryworkshop/bare-as-module3` and `ws` out of the pnpm store (pnpm prod installs miss them — same trick as the Dockerfile runner stage).

### Step 5 — Run a Script: "Configure env, systemd unit, start"
| Setting | Value |
|---|---|
| Template | `Run a Script` (Bash) |
| Target | `linux-app-server` |
| Script | Contents of `deploy/octopus/scripts/configure-and-start.sh` |

Generates `/opt/unstable/.env` from the Octopus variables, writes `/etc/systemd/system/unstable.service`, `daemon-reload`, `enable`, `restart`. The service runs as user `unstable`, `Restart=on-failure`, port from `PORT`.

### Step 6 — Run a Script: "Health check"
| Setting | Value |
|---|---|
| Template | `Run a Script` (Bash) |
| Target | `linux-app-server` |
| Script | Contents of `deploy/octopus/scripts/health-check.sh` |
| Failure behavior | **Fail the deployment** |

Polls `http://127.0.0.1:${PORT}/api/healthz` (expects `{"status":"ok"}`) and verifies the frontend serves `/`; on failure dumps the last 50 journald lines and exits 1, which fails the Octopus deployment.

## 6. Create and deploy a release

```bash
# after the workflow pushed a package
octo create-release --project Unstable --version 0.0.42 \
  --server "$OCTOPUS_URL" --apiKey "$OCTOPUS_API_KEY" --space "$OCTOPUS_SPACE" \
  --deployto Staging

# promote to production (hits the Manual Intervention step)
octo deploy-release --project Unstable --version 0.0.42 \
  --server "$OCTOPUS_URL" --apiKey "$OCTOPUS_API_KEY" --space "$OCTOPUS_SPACE" \
  --deployto Production
```

Or click **Create Release → Deploy** in the Octopus UI.

## 7. Rollback

Releases are retained in the Octopus library (retention policy on the lifecycle). To roll back:

1. `octo create-release --project Unstable --version <previous-package-version> --deployto Production` — or redeploy an existing previous release.
2. The process re-runs: package extracted, `pnpm install --prod`, `.env` regenerated from the same variables, `systemctl restart`, health check.

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Step 6 fails, `journalctl -u unstable -n 50` shows `PORT env not set` / `Invalid PORT` | `PORT` variable missing or empty — set it in project variables |
| `pnpm install` fails with integrity/checksum error | Expected — `install-deps.sh` deletes `pnpm-lock.yaml` first; never restore it |
| App starts but login rejects | `PASSWORD` not set for that environment (or mismatched) |
| `EACCES` writing `/opt/unstable` | Tentacle service not running as root — fix in §2 |
| Health check passes but sites don't proxy | Check the Wisp/bare logs: `journalctl -u unstable -f` |
| Frontend is an old build | `VITE_SUPABASE_*` are baked in at CI build time — a new release must come from a fresh workflow run |

Manual smoke test after deployment: open `https://<host>/`, log in with the `PASSWORD`, load a proxied site, confirm `/api/healthz` returns `{"status":"ok"}`.
