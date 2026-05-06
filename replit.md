# Unstable — Password-Protected Web Proxy

## Overview

"Unstable" is a password-protected web proxy browser app with a dark void.radio.fm-inspired aesthetic (Space Grotesk font). Built as a pnpm monorepo.

- **Password**: `ripmoonlight`
- **Session key**: `unstable_auth`

## Architecture

### Artifacts
- `artifacts/app` — React + Vite frontend (multi-tab proxy browser UI)
- `artifacts/api-server` — Express API server (bare servers + wisp server)

### Proxy Stack
- **Primary engine**: Scramjet — `/ham/` prefix, `ScramjetController`, service worker at `/s_sw.js` (scope `/ham/`)
- **Fallback engine**: Ultraviolet (UV) — `/service/` prefix, service worker at `/sw.js` (scope `/`)
- **Primary transport**: `@mercuryworkshop/libcurl-transport` via wisp at `/api/wisp/`
- **Fallback transport**: `@mercuryworkshop/bare-as-module3` + `@tomphttp/bare-server-node` at `/api/bare/` (ws1-ws5)
- **Bare-mux transport**: `@mercuryworkshop/bare-mux` (SharedWorker at `/baremux/worker.js`)
- **Wisp server**: `@mercuryworkshop/wisp-js/server` at `/api/wisp/`

### Key Files
- `artifacts/app/src/App.tsx` — tab browser UI, password screen, dual proxy setup, StatusBar
- `artifacts/app/public/uv.config.js` — UV config (prefix `/service/`)
- `artifacts/app/public/s_sw.js` — Scramjet service worker
- `artifacts/app/public/eggs/` — scramjet.all.js, scramjet.sync.js, scramjet.wasm.wasm
- `artifacts/app/public/libcurl/index.mjs` — libcurl transport
- `artifacts/app/index.html` — loads uv.bundle.js, uv.config.js
- `artifacts/api-server/src/app.ts` — tomphttp bare servers (x5), wisp, baremod static
- `artifacts/api-server/src/index.ts` — HTTP server + upgrade routing (wisp at `/api/wisp/`, bare upgrade)

### Proxy Init Flow (setupProxy)
1. Register UV service worker (`/sw.js` scope `/`) → `uv` badge goes green
2. Load `/eggs/scramjet.all.js`, create `ScramjetController`, call `init()`, register `/s_sw.js` at `/ham/` → `scr` badge goes green
3. Try libcurl+wisp transport → on fail, fall back to bare-as-module3

### Status Bar (bottom-left)
Shows `uv` and `scr` engine badges (○ pending, ● green ready, ● red error), transport label (`libcurl+wisp` or `bare ws#`), and ws1-ws5 buttons (bare mode only).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Build**: esbuild (ESM bundle for api-server)

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run API server (port 8080)
- `pnpm --filter @workspace/app run dev` — run React app (Vite)

## Important Constraints
- Do NOT run npm/pnpm install inside `/home/runner/workspace/scramjet/` or `/home/runner/workspace/Ultraviolet/`
- Never install `@titaniumnetwork-dev/*` packages
- Scramjet cloned at `/home/runner/workspace/scramjet/` but not integrated (using npm package instead)
- Scramjet/libcurl static files are copied directly to `artifacts/app/public/` — no vite plugin needed
