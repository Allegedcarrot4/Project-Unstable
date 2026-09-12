# AGENTS.md

## What this is
Unstable: a password-protected web proxy (Ultraviolet + Scramjet engines, bare-mux, Wisp). It is **not** a static site — it requires a Node server (`@workspace/api-server`) that serves both the built frontend and the proxy. Cannot be deployed to static hosts (Netlify/Vercel/GitHub Pages).

## Package manager & workspace
- Use **pnpm** only. This is a pnpm workspace (`pnpm-workspace.yaml`): packages are `artifacts/*`, `lib/*`, `lib/integrations/*`, `scripts`.
- `.npmrc`: `auto-install-peers=false`, `strict-peer-dependencies=false`.
- Add deps with `--filter`, e.g. `pnpm --filter @workspace/app add <pkg>`.
- Shared dependency versions are declared via `catalog:` in `pnpm-workspace.yaml`. Change versions in the catalog, not in individual `package.json` files.
- `react`/`react-dom` are pinned to **exactly `19.1.0`** in the catalog (Expo requires it). Do not bump. `esbuild` is overridden to `0.28.1` and its non-linux platform packages are removed via overrides.
- **Supply-chain guard:** `minimumReleaseAge: 1440` blocks installing any package published <1 day ago. If `pnpm install` fails on a brand-new package, add it to `minimumReleaseAgeExclude` (per instructions in that file) or wait.

## Common commands
- `pnpm install` — install everything.
- `pnpm dev` — runs app + api-server together via `concurrently`. Dev proxy: Vite (port from `PORT`, default 5173) proxies `/api`, `/service`, `/ham`, `/return` to the API on `:3001`.
- Manual dev: `pnpm --filter @workspace/app dev` (terminal 1) + `pnpm --filter @workspace/api-server build` then `pnpm --filter @workspace/api-server start` (terminal 2).
- `pnpm run build` — **runs typecheck first**, then `pnpm -r --if-present run build`. This is the correct verification sequence. Typecheck = `tsc --build` over the `lib/*` projects, then per-package typechecks.
- `pnpm start` — `node ./artifacts/api-server/dist/index.mjs` (production entrypoint).
- `pnpm typecheck` — full repo typecheck (do this before submitting changes).
- Preview the built app: `pnpm --filter @workspace/app serve`.
- DB schema push: `pnpm --filter @workspace/db push` (`drizzle-kit`; requires `DATABASE_URL` to be set or it throws). Schema lives in `lib/db/src/schema/index.ts`.

## Architecture / layout
- `artifacts/app` — React + Vite frontend (React 19, Tailwind v4, Radix, React Query, Wouter). Entry: `index.html` → `src/main.tsx` → `src/App.tsx`. Vite config reads `PORT` (default 5173) and `BASE_PATH`.
- `artifacts/api-server` — Fastify + bare server + Wisp. Source in `src/`, bundled by `build.mjs` (esbuild, not tsc) into `dist/index.mjs`. Entry `src/index.ts` imports `dotenv/config` then `./app`. Exit 1 if `PORT` unset/invalid.
- `lib/api-zod`, `lib/api-client-react` — **ship raw `.ts` source** (package `exports` point at `./src/index.ts`); TS resolves them via `customConditions: ["workspace"]` in `tsconfig.base.json`. Do not expect a `dist` build for these.
- `lib/api-spec` — OpenAPI spec + `orval` codegen (`pnpm --filter @workspace/api-spec codegen`).
- `lib/db` — Drizzle (Postgres) schema + migrations.
- `Ultraviolet/` and `scramjet/` — vendored dependency repos (part of the workspace toolchain, generally don't edit). `Project-Unstable/` is a gitignored cloned repo; `node_modules` are ignored.

## Build gotchas
- Production build (`NODE_ENV=production`) runs `javascript-obfuscator` with `debugProtection`/`disableConsoleOutput`/`selfDefending`. The built bundle is intentionally unreadable and console output is stripped — do not try to debug the minified output. Debug in dev mode.
- Vite `manualChunks` must keep React/Radix in one `vendor` chunk; splitting React out causes `reading 'forwardRef'` crashes. Preserve this.
- `vite.config.ts` at repo root is only for Stormkit/mise; the real Vite config used by dev/build is `artifacts/app/vite.config.ts`.

## Environment
- There is exactly **one** env file: the repo root `.env` (gitignored; never commit its secrets). Only `.env.example` is tracked. The API server loads the root `.env` via dotenv; Vite loads it via `envDir` for the frontend's `VITE_*` vars. Do not create per-package `.env` files.
- Essential vars (see README): `PORT` (required, e.g. 7860), `PASSWORD` (optional — if set, visitors must enter it on the login screen; if unset, no login screen is shown), `SESSION_SECRET` (recommended), Supabase vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_SERVICE_ROLE_KEY`).
- There is no fallback password. The login screen can only be unlocked with the exact `PASSWORD` value.
- Node 22 / pnpm 10.33.0 are pinned via `mise.toml`.

## Tooling
- No lint script. Verification = `pnpm typecheck` (+ `pnpm run build`). Prettier is available but not wired to a check.
- `.github/workflows/opencode.yml` runs OpenCode when a comment contains `/oc` or `/opencode`.
- The repo has multiple remotes (`origin`, `hf`, `space`, `gitsafe-backup`). Don't push to `hf` (HuggingFace) unless explicitly asked — it was used for ad-hoc Docker fixes.